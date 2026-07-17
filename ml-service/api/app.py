"""
FastAPI Application
--------------------
Entry point for the EcoWatch ML Service.
Kafka consumer background thread mein chalega.

Pipeline: Sentinel Hub (RGB+NIR) → NDVI + Qwen2-VL → scan-results

Run:
  uvicorn api.app:app --host 0.0.0.0 --port 8001
"""

import os
from dotenv import load_dotenv
load_dotenv()  # .env file load karo — uvicorn se chalane pe env vars set nahi hote otherwise
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router
from src.inference import vl_analyzer
from src.utils.logger  import get_logger
from src.utils.cleanup import start_cleanup_service, get_disk_stats, cleanup_old_images

logger = get_logger("app")


def _start_kafka_consumer():
    """Kafka consumer ko background thread mein chalao."""
    try:
        from streaming.consumer import ScanJobConsumer
        broker   = os.getenv("KAFKA_BROKER", "localhost:9092")
        group_id = os.getenv("KAFKA_GROUP",  "ml-workers")
        consumer = ScanJobConsumer(broker=broker, group_id=group_id)
        consumer.start()
    except Exception as e:
        logger.error(f"Kafka consumer failed: {e}")


# ── Startup / Shutdown ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # STARTUP
    logger.info("Starting EcoWatch ML Service...")
    logger.info("Loading Qwen2-VL-2B-Instruct model...")

    try:
        vl_analyzer.load_model()   # Qwen2-VL load karo (GPU/CPU auto-detect)
        logger.info("Qwen2-VL model loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to load Qwen2-VL model: {e}")
        raise

    # Kafka Consumer — background thread mein start karo
    consumer_thread = threading.Thread(
        target = _start_kafka_consumer,
        daemon = True,
        name   = "kafka-consumer"
    )
    consumer_thread.start()
    logger.info("Kafka consumer thread started!")

    # Image Cleanup Service — raat 3 baje daily
    start_cleanup_service()

    yield  # App is running

    # SHUTDOWN
    logger.info("Shutting down EcoWatch ML Service...")


# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title       = "EcoWatch ML Service",
    description = "Satellite environmental monitoring — NDVI + Qwen2-VL analysis",
    version     = "2.0.0",
    lifespan    = lifespan
)

# ── CORS — Next.js (localhost:3000) se requests allow karo ───────────────────
# NOTE: allow_credentials=True + allow_origins=["*"] is INVALID per CORS spec.
# Either use specific origins WITH credentials, or wildcard WITHOUT credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origins  = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",                       # fallback for other clients
    ],
    allow_methods  = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers  = ["*"],
    allow_credentials = False,     # wildcard origin ke saath credentials nahi chalti
)

app.include_router(router, prefix="/api")

# ── Static Images — ML-processed images frontend pe serve karo ───────────────
import pathlib
_processed_dir = pathlib.Path("data/processed")
_processed_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(_processed_dir)), name="images")


# ── Root ──────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "service": "EcoWatch ML Service",
        "version": "2.0.0",
        "model":   "Qwen/Qwen2-VL-2B-Instruct + NDVI",
        "docs":    "/docs",
        "health":  "/api/health"
    }
