"""
API Routes
----------
GET  /api/health   → Service + model status
POST /api/analyze  → Manual zone analysis (Sentinel Hub + NDVI + Qwen2-VL)
POST /api/compare  → Deep comparison: 2 images to Qwen (NDVI threat confirm hone ke baad)
"""

import uuid
import os
import numpy as np
from PIL import Image as PILImage
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from api.schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse
from src.data.sentinel_hub  import fetch_image
from src.data.data_loader   import validate_image
from src.inference          import vl_analyzer
from src.inference.analyzer import analyze, compare_analyze
from src.utils.logger       import get_logger
from src.utils.cleanup      import get_disk_stats, cleanup_old_images

logger = get_logger("routes")
router = APIRouter()


# ── GET /health ───────────────────────────────────────────────────────────────
@router.get("/health", response_model=HealthResponse)
def health():
    """Service health check."""
    return {
        "status":       "ok",
        "model_loaded": vl_analyzer._analyzer._model is not None,
        "model_name":   "Qwen/Qwen2-VL-2B-Instruct + NDVI",
        "version":      "2.0.0"
    }


# ── POST /analyze ─────────────────────────────────────────────────────────────
@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_zone(req: AnalyzeRequest):
    """Manual zone analysis — Sentinel Hub fetch + NDVI + Qwen."""
    if vl_analyzer._analyzer._model is None:
        raise HTTPException(503, "Qwen2-VL model not loaded yet")

    job_id = req.job_id or str(uuid.uuid4())[:8]
    logger.info(f"[{job_id}] Manual analyze | zone={req.zone_id}")

    try:
        image_data = fetch_image(
            bbox_coords = req.bbox,
            date_from   = req.date_from,
            date_to     = req.date_to,
            resolution  = req.resolution,
        )
    except Exception as e:
        raise HTTPException(400, f"Sentinel Hub fetch failed: {e}")

    if not validate_image(image_data["rgb"]):
        raise HTTPException(400, "Invalid or empty satellite image")

    result = analyze(rgb=image_data["rgb"], nir=image_data["nir"],
                     job_id=job_id, red_raw=image_data.get("red_raw"),
                     scl=image_data.get("scl"))

    return AnalyzeResponse(
        job_id=job_id, zone_id=req.zone_id,
        forest_percentage=result["forest_percentage"],
        vegetation_percentage=result["vegetation_percentage"],
        bare_soil_percentage=result["bare_soil_percentage"],
        water_percentage=result["water_percentage"],
        ndvi_mean=result["ndvi_mean"], ndvi_min=result["ndvi_min"], ndvi_max=result["ndvi_max"],
        threats=result["threats"], severity=result["severity"],
        description=result["description"], affected_areas=result["affected_areas"],
        forest_visible=result["forest_visible"], vl_confidence=result["vl_confidence"],
        deforestation_detected=result["deforestation_detected"],
        heatmap_path=result["heatmap_path"],
    )


# ── POST /compare ─────────────────────────────────────────────────────────────
class CompareRequest(BaseModel):
    image_path_old:  str    # Purani scan ki disk path (original_<job_id>.png)
    image_path_new:  str    # Nayi scan ki disk path
    forest_loss:     float  # NDVI se calculated loss %
    job_id:          str    # Alert job ID (logging ke liye)


class CompareResponse(BaseModel):
    job_id:                  str
    forest_loss:             float
    change_detected:         bool
    change_type:             str
    severity:                str
    changed_areas:           List[str]
    change_description:      str
    probable_cause:          str
    comparison_image_path:   str


@router.post("/compare", response_model=CompareResponse)
def compare_zones(req: CompareRequest):
    """
    Deep comparison — Node.js consumer tab call karta hai jab
    NDVI forest loss > threshold detect ho.

    Dono images Qwen mein jaate hain:
    IMAGE 1 (older) + IMAGE 2 (newer) → kya change hua, kahan, kyun?
    """
    if vl_analyzer._analyzer._model is None:
        raise HTTPException(503, "Qwen2-VL model not loaded yet")

    logger.info(
        f"[{req.job_id}] Compare request | loss={req.forest_loss}% | "
        f"old={req.image_path_old} | new={req.image_path_new}"
    )

    # Images disk se load karo
    try:
        rgb_old = np.array(PILImage.open(req.image_path_old).convert("RGB"))
        rgb_new = np.array(PILImage.open(req.image_path_new).convert("RGB"))
    except Exception as e:
        raise HTTPException(400, f"Image load failed: {e}")

    # Qwen comparison
    result = compare_analyze(
        rgb_old     = rgb_old,
        rgb_new     = rgb_new,
        forest_loss = req.forest_loss,
        job_id      = req.job_id,
        bbox        = req.bbox,
    )

    return CompareResponse(**result)


# ── GET /disk-usage ──────────────────────────────────────────────
@router.get("/disk-usage")
def disk_usage():
    """
    Satellite image disk usage stats.
    Processed images, raw data, total size, free disk space.
    """
    stats = get_disk_stats()
    return {
        "success": True,
        "data":    stats,
        "note":    f"Images older than {os.getenv('IMAGE_RETENTION_DAYS', '30')} days are auto-deleted at 03:00 daily",
    }


# ── POST /cleanup/run ─────────────────────────────────────────────
class CleanupRequest(BaseModel):
    retention_days: Optional[int] = 30   # Default 30 din


@router.post("/cleanup/run")
def run_cleanup(req: CleanupRequest = CleanupRequest()):
    """
    Manual image cleanup trigger.
    Purani satellite images turant delete karo.
    retention_days: Kitne din purani files delete honi chahiye (default 30)
    """
    logger.info(f"Manual cleanup triggered | retention_days={req.retention_days}")
    before = get_disk_stats()
    result = cleanup_old_images(retention_days=req.retention_days or 30)
    after  = get_disk_stats()

    return {
        "success":      True,
        "deleted":      result["deleted_count"],
        "freed_mb":     result["freed_mb"],
        "errors":       result["errors"],
        "before_mb":    before.get("total_images_mb", 0),
        "after_mb":     after.get("total_images_mb", 0),
        "disk_free_gb": after.get("disk", {}).get("free_gb", "N/A"),
    }


# ── POST /historical/analyze ─────────────────────────────────────────────────
class HistoricalScanRequest(BaseModel):
    zone_id:        str
    bbox:           List[float]         # [lng_min, lat_min, lng_max, lat_max]
    dates:          List[str]           # ["2022-06-01", "2022-12-01", ...]
    resolution:     Optional[int]  = 20
    max_cloud_pct:  Optional[int]  = 50  # Skip image if cloud > this %


class HistoricalScanResult(BaseModel):
    date:             str
    status:           str          # "done" | "skipped"
    skip_reason:      str
    ndvi_mean:        float
    forest_pct:       float
    vegetation_pct:   float
    water_pct:        float
    bare_soil_pct:    float
    cloud_pct:        float        # % pixels excluded by SCL cloud masking
    threats:          List[str]
    severity:         str
    description:      str
    image_path:       str
    heatmap_path:     str
    delta_from_first: float      # % change from first scan
    loss_hectares:    float


class HistoricalAnalyzeResponse(BaseModel):
    zone_id:        str
    scan_count:     int
    scans:          List[HistoricalScanResult]
    summary: dict   # total_loss_pct, total_loss_ha, rate_per_year, biggest_drop
    ai_verdict:     str


@router.post("/historical/analyze", response_model=HistoricalAnalyzeResponse)
def historical_analyze(req: HistoricalScanRequest):
    """
    Multiple historical dates pe Sentinel-2 images fetch karo aur compare karo.
    - Har date pe: fetch → validate → NDVI+Qwen analyze
    - Cloudy/blank → skipped mark karo (gracefully)
    - Output: timeline + hectares lost + overall AI verdict
    """
    if vl_analyzer._analyzer._model is None:
        raise HTTPException(503, "Qwen2-VL model not loaded yet")

    if len(req.dates) < 2 or len(req.dates) > 10:
        raise HTTPException(400, "dates must have 2–10 entries")

    from src.utils.geo_calculator import calculate_loss_hectares, calculate_annual_rate

    logger.info(f"[Historical] zone={req.zone_id} | dates={req.dates}")

    results: list = []
    first_forest_pct: float | None = None

    for date_str in req.dates:
        scan_entry: dict = {
            "date":             date_str,
            "status":           "skipped",
            "skip_reason":      "",
            "ndvi_mean":        0.0,
            "forest_pct":       0.0,
            "vegetation_pct":   0.0,
            "water_pct":        0.0,
            "bare_soil_pct":    0.0,
            "threats":          ["none"],
            "severity":         "none",
            "description":      "",
            "image_path":       "",
            "heatmap_path":     "",
            "cloud_pct":     0.0,
            "delta_from_first": 0.0,
            "loss_hectares":    0.0,
        }

        try:
            # Date window: ±30 days (wider = more cloud-free shots available)
            from datetime import datetime, timedelta
            target = datetime.strptime(date_str, "%Y-%m-%d")
            date_from = (target - timedelta(days=30)).strftime("%Y-%m-%d")
            date_to   = target.strftime("%Y-%m-%d")

            image_data = fetch_image(
                bbox_coords = req.bbox,
                date_from   = date_from,
                date_to     = date_to,
                resolution  = req.resolution or 20,
            )

            # Validate — reject blank/mostly-cloud images
            if not validate_image(image_data["rgb"]):
                scan_entry["skip_reason"] = "Blank or invalid image (cloud cover too high)"
                logger.warning(f"[Historical] Skipped {date_str} — blank image")
                results.append(scan_entry)
                continue

            job_id = f"hist-{req.zone_id[:8]}-{date_str}"
            result = analyze(
                rgb     = image_data["rgb"],
                nir     = image_data["nir"],
                job_id  = job_id,
                red_raw = image_data.get("red_raw"),
                scl     = image_data.get("scl"),
            )

            forest_pct = result["forest_percentage"]
            if first_forest_pct is None:
                first_forest_pct = forest_pct

            delta      = round((first_forest_pct or forest_pct) - forest_pct, 2)
            loss_ha    = calculate_loss_hectares(req.bbox, first_forest_pct or forest_pct, forest_pct)

            cloud_pct = result.get("cloud_pct", 0.0)

            # ── Auto-skip if extreme cloud cover (>80% pixels masked) ─────────
            # Extreme cloud scenes se NDVI unreliable hoti hai — skip karo
            MAX_CLOUD_PCT = 80.0
            if cloud_pct > MAX_CLOUD_PCT:
                scan_entry["skip_reason"] = (
                    f"Extreme cloud cover — {cloud_pct:.0f}% pixels masked by SCL. "
                    f"Try a different date or wider time window."
                )
                logger.warning(
                    f"[Historical] {date_str} → AUTO-SKIPPED: {cloud_pct:.0f}% cloud cover "
                    f"exceeds {MAX_CLOUD_PCT:.0f}% threshold"
                )
                results.append(scan_entry)
                continue

            scan_entry.update({
                "status":           "done",
                "ndvi_mean":        result["ndvi_mean"],
                "forest_pct":       forest_pct,
                "vegetation_pct":   result["vegetation_percentage"],
                "water_pct":        result["water_percentage"],
                "bare_soil_pct":    result["bare_soil_percentage"],
                "threats":          result["threats"],
                "severity":         result["severity"],
                "description":      result.get("description", ""),
                "image_path":       result.get("original_image_path", ""),
                "heatmap_path":     result.get("heatmap_path", ""),
                "cloud_pct":        cloud_pct,
                "delta_from_first": delta,
                "loss_hectares":    loss_ha,
            })
            logger.info(
                f"[Historical] {date_str} → forest={forest_pct}% | "
                f"cloud_masked={cloud_pct:.1f}% | delta={delta}%"
            )

        except Exception as e:
            scan_entry["skip_reason"] = f"Fetch/analysis error: {str(e)[:80]}"
            logger.error(f"[Historical] Error for {date_str}: {e}")

        results.append(scan_entry)

    # ── Summary calculation ───────────────────────────────────────────────────
    done_scans = [r for r in results if r["status"] == "done"]
    total_loss_pct = 0.0
    total_loss_ha  = 0.0
    rate_per_year  = 0.0
    biggest_drop   = 0.0
    biggest_date   = ""

    if len(done_scans) >= 2:
        first_pct = done_scans[0]["forest_pct"]
        last_pct  = done_scans[-1]["forest_pct"]
        total_loss_pct = round(first_pct - last_pct, 2)
        total_loss_ha  = calculate_loss_hectares(req.bbox, first_pct, last_pct)

        # Days between first and last done scan
        from datetime import datetime
        try:
            d1 = datetime.strptime(done_scans[0]["date"],  "%Y-%m-%d")
            d2 = datetime.strptime(done_scans[-1]["date"], "%Y-%m-%d")
            days = (d2 - d1).days
            rate_per_year = calculate_annual_rate(total_loss_ha, days)
        except Exception:
            rate_per_year = 0.0

        # Biggest single-period drop
        for i in range(1, len(done_scans)):
            drop = done_scans[i - 1]["forest_pct"] - done_scans[i]["forest_pct"]
            if drop > biggest_drop:
                biggest_drop = drop
                biggest_date = done_scans[i]["date"]

    # ── Overall AI verdict — feed all done scans to Qwen2-VL ─────────────────
    ai_verdict = "Analysis complete."
    if len(done_scans) >= 2:
        try:
            verdict_prompt = (
                f"Historical satellite analysis of {len(done_scans)} scans over "
                f"{done_scans[0]['date']} to {done_scans[-1]['date']}. "
                f"Total forest loss: {total_loss_pct}% ({total_loss_ha} hectares). "
                f"Threats detected: {set(t for s in done_scans for t in s['threats'])}. "
                f"Provide a 2-sentence professional verdict on the deforestation pattern and urgency."
            )
            ai_verdict = vl_analyzer.generate_verdict(verdict_prompt)
        except Exception as e:
            logger.warning(f"[Historical] AI verdict generation failed: {e}")
            if total_loss_pct > 20:
                ai_verdict = f"Critical deforestation detected: {total_loss_pct}% forest loss over the analysis period. Immediate investigation recommended."
            elif total_loss_pct > 5:
                ai_verdict = f"Moderate forest loss of {total_loss_pct}% detected. Monitoring should continue."
            else:
                ai_verdict = f"Minimal forest change ({total_loss_pct}%) detected. Area appears stable."

    return HistoricalAnalyzeResponse(
        zone_id    = req.zone_id,
        scan_count = len(done_scans),
        scans      = [HistoricalScanResult(**r) for r in results],
        summary    = {
            "total_loss_pct": total_loss_pct,
            "total_loss_ha":  total_loss_ha,
            "rate_per_year":  rate_per_year,
            "biggest_drop_pct":  round(biggest_drop, 2),
            "biggest_drop_date": biggest_date,
            "scans_done":     len(done_scans),
            "scans_skipped":  len(results) - len(done_scans),
        },
        ai_verdict = ai_verdict,
    )
