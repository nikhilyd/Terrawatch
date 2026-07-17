"""
Kafka Consumer — Updated Pipeline
----------------------------------
scan-jobs consume karo → Sentinel Hub se RGB+NIR fetch karo
→ NDVI + Qwen2-VL analyze karo → scan-results publish karo.
"""

import json
import signal
import sys
from confluent_kafka import Consumer, KafkaError

from src.data.sentinel_hub   import fetch_image
from src.data.data_loader    import validate_image
from src.inference.analyzer  import analyze
from src.inference           import vl_analyzer
from streaming.producer      import ScanResultProducer
from src.utils.logger        import get_logger

logger = get_logger("kafka_consumer")


class ScanJobConsumer:
    def __init__(self, broker: str, group_id: str = "ml-workers"):
        self._consumer = Consumer({
            "bootstrap.servers":    broker,
            "group.id":             group_id,
            "auto.offset.reset":    "earliest",
            "enable.auto.commit":   False,
            "max.poll.interval.ms": 600000,   # 10 min (Qwen CPU pe slow ho sakta hai)
        })
        self._producer = ScanResultProducer(broker)
        self._topic    = "scan-jobs"
        self._running  = True

        # Signal handlers sirf main thread mein
        import threading
        if threading.current_thread() is threading.main_thread():
            signal.signal(signal.SIGINT,  self._shutdown)
            signal.signal(signal.SIGTERM, self._shutdown)

        logger.info(f"Consumer ready | broker={broker} | group={group_id}")

    def start(self):
        # Qwen2-VL model load karo (ek baar)
        logger.info("Loading Qwen2-VL model...")
        vl_analyzer.load_model()
        logger.info("Qwen2-VL model loaded!")

        self._consumer.subscribe([self._topic])
        logger.info(f"Subscribed to: {self._topic} | Waiting for jobs...")

        while self._running:
            msg = self._consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                logger.error(f"Kafka error: {msg.error()}")
                continue
            self._process_message(msg)

    def _process_message(self, msg):
        try:
            job      = json.loads(msg.value().decode("utf-8"))
            job_id   = job.get("job_id", "unknown")
            zone_id  = job.get("zone_id", "unknown")
            bbox     = job.get("bbox")
            date_from= job.get("date_from")
            date_to  = job.get("date_to")
            res      = job.get("resolution", 10)

            logger.info(f"[{job_id}] Job received | zone={zone_id}")

            # ── 1. Sentinel Hub: RGB + NIR fetch karo ───────────────────────
            logger.info(f"[{job_id}] Fetching from Sentinel Hub | {date_from} -> {date_to}")
            image_data = fetch_image(
                bbox_coords = bbox,
                date_from   = date_from,
                date_to     = date_to,
                resolution  = res,
            )
            # image_data = {"rgb": np.ndarray, "nir": np.ndarray}

            if not validate_image(image_data["rgb"]):
                logger.warning(f"[{job_id}] Invalid image — skipping")
                self._consumer.commit(msg)
                return

            # ── 2. NDVI + Qwen2-VL analyze karo ─────────────────────────────
            result = analyze(
                rgb     = image_data["rgb"],
                nir     = image_data["nir"],
                job_id  = job_id,
                red_raw = image_data.get("red_raw"),
                scl     = image_data.get("scl"),
            )

            # ── 3. Result publish karo ──────────────────────────────────
            result["zone_id"] = zone_id
            # original_image_path already in result from analyzer.py

            # Campaign fields — forward karo taaki Node consumer campaign update kar sake
            result["job_id"]            = job_id
            result["campaign_id"]       = job.get("campaign_id", "")
            result["campaign_scan_idx"] = job.get("campaign_scan_idx", -1)

            self._producer.publish(result)

            # ── 4. Commit ─────────────────────────────────────────────────────
            self._consumer.commit(msg)
            logger.info(
                f"[{job_id}] Done | "
                f"forest={result['forest_percentage']}% | "
                f"threats={result['threats']} | "
                f"severity={result['severity']}"
            )

        except Exception as e:
            logger.error(f"Error processing job: {e}", exc_info=True)
            # Commit nahi → Kafka retry karega

    def _shutdown(self, signum, frame):
        logger.info("Shutdown signal received...")
        self._running = False
        self._consumer.close()
        sys.exit(0)


# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    load_dotenv()

    broker   = os.getenv("KAFKA_BROKER", "localhost:9092")
    group_id = os.getenv("KAFKA_GROUP",  "ml-workers")

    consumer = ScanJobConsumer(broker=broker, group_id=group_id)
    consumer.start()
