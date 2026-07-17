"""
EcoWatch Analyzer
-----------------
Main analysis pipeline:
  Track 1: NDVI  → Exact forest/vegetation percentages (instant, physics-based)
  Track 2: Qwen2-VL → Environmental threat detection (AI, 5-8 sec)

Compare pipeline (on-demand):
  NDVI forest loss detected → compare_analyze() called
  → Both images to Qwen → Rich change description + side-by-side image
"""

import uuid
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image as PILImage
from pathlib import Path

from src.utils.logger      import get_logger
from src.config.paths      import DATA_PRO_DIR
from src.data              import ndvi as ndvi_calc
from src.inference         import vl_analyzer

logger = get_logger("analyzer")


def analyze(
    rgb:     np.ndarray,          # (H, W, 3) uint8  — display (gamma-corrected)
    nir:     np.ndarray,          # (H, W)    float32 — raw B08
    job_id:  str = None,
    red_raw: np.ndarray = None,   # (H, W) float32 — raw B04 for accurate NDVI
    scl:     np.ndarray = None,   # (H, W) uint8   — SCL band for cloud masking
) -> dict:
    """
    Full analysis pipeline: NDVI (with SCL cloud masking) + Qwen2-VL.

    Args:
        rgb     : RGB satellite image (H, W, 3) uint8 — display/Qwen ke liye
        nir     : NIR band (H, W) float32 0-1 — raw B08
        job_id  : Unique job identifier
        red_raw : Raw B04 band (H, W) float32 0-1 — accurate NDVI ke liye
        scl     : Scene Classification Layer (H, W) uint8 — cloud masking

    Returns:
        dict with ndvi metrics + cloud_pct + vl analysis + combined result
    """
    job_id = job_id or str(uuid.uuid4())[:8]
    H, W   = rgb.shape[:2]

    logger.info(f"[{job_id}] Starting analysis | image={W}x{H}")
    logger.info(
        f"[{job_id}] Pixel stats | "
        f"rgb_min={rgb.min()} rgb_max={rgb.max()} rgb_mean={rgb.mean():.1f} | "
        f"nir_mean={nir.mean():.3f}"
        + (f" | red_raw_mean={red_raw.mean():.3f}" if red_raw is not None else " | red_raw=None(fallback)")
        + (f" | scl=present" if scl is not None else " | scl=None(no cloud masking)")
    )

    # -- Track 1: NDVI + SCL Cloud Masking (instant, ~0.1 sec) ---------------
    logger.info(f"[{job_id}] Running NDVI + SCL cloud masking...")
    ndvi_result = ndvi_calc.calculate(rgb, nir, red_raw=red_raw, scl=scl)

    # -- Track 2: Qwen2-VL (5-8 sec GPU / 60-90 sec CPU) ---------------------
    logger.info(f"[{job_id}] Running Qwen2-VL analysis...")
    vl_result = vl_analyzer.analyze_image(rgb)

    logger.info(
        f"[{job_id}] VL result | "
        f"threats={vl_result['threats']} | "
        f"severity={vl_result['severity']} | "
        f"confidence={vl_result['confidence']}"
    )

    # -- Save original image ---------------------------------------------------
    orig_path = DATA_PRO_DIR / f"original_{job_id}.png"
    PILImage.fromarray(rgb).save(str(orig_path))
    logger.info(f"[{job_id}] Original saved: {orig_path}")

    # -- Save NDVI heatmap ----------------------------------------------------
    heatmap_path = _save_ndvi_heatmap(rgb, nir, vl_result, job_id)

    # -- Combine results: Smart fusion of NDVI + Qwen2-VL ----------------------
    # Logic:
    # 1. Qwen ne "deforestation" detect kiya → Always flag
    # 2. NDVI critically low (<10% forest) → Always flag (bare/cleared land)
    # 3. NDVI medium-low (10-30%) + Qwen ne koi bhi threat detect kiya → Flag
    # 4. Qwen says none + NDVI > 30% → Clear area
    ndvi_forest    = ndvi_result["forest_pct"]
    ndvi_water     = ndvi_result["water_pct"]
    qwen_threats   = vl_result["threats"]
    qwen_deforest  = "deforestation" in qwen_threats or "agricultural_expansion" in qwen_threats
    forest_visible = vl_result.get("forest_visible", True)

    # ── Smart deforestation logic ──────────────────────────────────────────────
    # Rule 1: Qwen ne explicitly deforestation detect kiya → Always flag
    if qwen_deforest:
        deforestation_detected = True

    # Rule 2: Low NDVI + Qwen ne koi threat detect kiya → Flag
    elif ndvi_forest < 30.0 and len([t for t in qwen_threats if t not in ("none", "")]) > 0:
        deforestation_detected = True

    # Rule 3: NDVI low BUT zone is mostly water (river/lake/wetland) → NOT deforestation
    elif ndvi_forest < 10.0 and ndvi_water > 50.0:
        # Yeh water body hai, forest kabhi tha hi nahi
        deforestation_detected = False

    # Rule 4: NDVI low AND Qwen bhi bolta hai forest visible nahi → Flag
    elif ndvi_forest < 10.0 and not forest_visible:
        deforestation_detected = True

    # Rule 5: NDVI critically low + no water explanation + no Qwen threats → Uncertain, flag conservatively
    elif ndvi_forest < 5.0 and ndvi_water < 30.0:
        deforestation_detected = True

    else:
        deforestation_detected = False


    result = {
        # Job info
        "job_id": job_id,

        # NDVI metrics (exact, physics-based)
        "forest_percentage":      ndvi_result["forest_pct"],
        "vegetation_percentage":  ndvi_result["vegetation_pct"],
        "bare_soil_percentage":   ndvi_result["bare_soil_pct"],
        "water_percentage":       ndvi_result["water_pct"],
        "ndvi_mean":              ndvi_result["ndvi_mean"],
        "ndvi_min":               ndvi_result["ndvi_min"],
        "ndvi_max":               ndvi_result["ndvi_max"],

        # Qwen2-VL analysis
        "threats":               vl_result["threats"],
        "severity":              vl_result["severity"],
        "description":           vl_result["description"],
        "affected_areas":        vl_result["affected_areas"],
        "forest_visible":        vl_result["forest_visible"],
        "vl_confidence":         vl_result["confidence"],

        # Combined
        "deforestation_detected": deforestation_detected,
        "heatmap_path":           heatmap_path,
        "original_image_path":    str(orig_path),
    }

    logger.info(
        f"[{job_id}] Done | "
        f"forest={ndvi_result['forest_pct']}% (NDVI) | "
        f"threats={vl_result['threats']} | "
        f"severity={vl_result['severity']} | "
        f"deforestation={deforestation_detected}"
    )

    return result


def compare_analyze(
    rgb_old:      np.ndarray,
    rgb_new:      np.ndarray,
    forest_loss:  float,
    job_id:       str = None,
    bbox:         list = None,
) -> dict:
    """
    Deep comparison — NDVI forest loss confirm hone KE BAAD call karo.

    Qwen dono images ek saath dekhta hai aur batata hai:
      - Kya change hua?   (change_type)
      - Kahan hua?        (changed_areas)
      - Kyun hua?         (probable_cause)
      - Kitna severe?     (severity)
      - Full description  (change_description)

    Args:
        rgb_old     : Purani scan RGB (H, W, 3) uint8
        rgb_new     : Nayi scan RGB (H, W, 3) uint8
        forest_loss : NDVI-calculated loss % (e.g. 14.3)
        job_id      : Job ID for logging / file naming
        bbox        : [lng_min, lat_min, lng_max, lat_max]

    Returns:
        dict with full comparison result + comparison_image_path + hotspot
    """
    job_id = job_id or str(uuid.uuid4())[:8]
    logger.info(
        f"[{job_id}] Starting comparison | forest_loss={forest_loss}%"
    )

    # Qwen: dono images ek saath
    logger.info(f"[{job_id}] Running Qwen2-VL comparison (2 images)...")
    compare_result = vl_analyzer.compare_images(rgb_old, rgb_new)

    logger.info(
        f"[{job_id}] Comparison done | "
        f"type={compare_result.get('change_type')} | "
        f"severity={compare_result.get('severity')} | "
        f"areas={compare_result.get('changed_areas')}"
    )

    # Side-by-side image save karo
    comparison_path = _save_comparison_image(
        rgb_old, rgb_new, compare_result, forest_loss, job_id
    )

    # --- Micro-Targeting: Find Hotspot (Lat/Lng) ---
    hotspot_lat = None
    hotspot_lng = None
    if bbox and len(bbox) == 4:
        try:
            # Convert to grayscale
            old_gray = np.mean(rgb_old, axis=2)
            new_gray = np.mean(rgb_new, axis=2)
            
            # Deforestation typically increases brightness (canopy -> bare soil)
            diff = new_gray - old_gray
            
            # Threshold to find most significant changes
            threshold = np.percentile(diff, 95) # Top 5% brightest changes
            mask = diff > threshold
            
            # Find centroid of the mask
            y_indices, x_indices = np.where(mask)
            if len(y_indices) > 0:
                cy = np.mean(y_indices)
                cx = np.mean(x_indices)
                
                H, W = rgb_old.shape[:2]
                
                # Interpolate coordinate
                lng_min, lat_min, lng_max, lat_max = bbox
                
                # X corresponds to Longitude, Y to Latitude
                # Note: Y=0 is top (lat_max), Y=H is bottom (lat_min)
                hotspot_lng = lng_min + (cx / W) * (lng_max - lng_min)
                hotspot_lat = lat_max - (cy / H) * (lat_max - lat_min)
                
                logger.info(f"[{job_id}] Hotspot found at: Lat {hotspot_lat:.5f}, Lng {hotspot_lng:.5f}")
        except Exception as e:
            logger.error(f"[{job_id}] Failed to calculate hotspot: {e}")

    return {
        "job_id":                job_id,
        "forest_loss":           forest_loss,
        "change_detected":       compare_result.get("change_detected", True),
        "change_type":           compare_result.get("change_type", "unknown"),
        "severity":              compare_result.get("severity", "medium"),
        "changed_areas":         compare_result.get("changed_areas", []),
        "change_description":    compare_result.get("change_description", ""),
        "probable_cause":        compare_result.get("probable_cause", "unknown"),
        "comparison_image_path": comparison_path,
        "hotspot_lat":           hotspot_lat,
        "hotspot_lng":           hotspot_lng,
    }


def _save_ndvi_heatmap(rgb, nir, vl_result, job_id) -> str:
    """NDVI heatmap + VL analysis text save karo."""
    red   = rgb[:, :, 0].astype(np.float32) / 255.0
    nir_f = nir.astype(np.float32)
    ndvi  = (nir_f - red) / (nir_f + red + 1e-8)

    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    fig.suptitle('EcoWatch - Environmental Analysis', fontsize=13, fontweight='bold')

    axes[0].imshow(rgb)
    axes[0].set_title('Satellite Image (RGB)')
    axes[0].axis('off')

    im = axes[1].imshow(ndvi, cmap='RdYlGn', vmin=-0.2, vmax=0.8)
    axes[1].set_title('NDVI Heatmap (Green=Forest | Red=Bare/Urban)')
    axes[1].axis('off')
    plt.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)

    threats_str = ", ".join(vl_result["threats"]) or "none"
    annotation  = (
        f"Threats: {threats_str} | "
        f"Severity: {vl_result['severity']} | "
        f"Confidence: {vl_result['confidence']}"
    )
    fig.text(0.5, 0.02, annotation, ha='center', fontsize=9,
             bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

    plt.tight_layout(rect=[0, 0.06, 1, 1])
    out_path = DATA_PRO_DIR / f"heatmap_{job_id}.png"
    plt.savefig(str(out_path), dpi=80, bbox_inches='tight')
    plt.close(fig)
    return str(out_path)


def _save_comparison_image(rgb_old, rgb_new, compare_result, forest_loss, job_id) -> str:
    """Side-by-side comparison image save karo."""
    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.suptitle(
        f'EcoWatch - Change Detection | Forest Loss: {forest_loss:.1f}%',
        fontsize=13, fontweight='bold', color='darkred'
    )

    axes[0].imshow(rgb_old)
    axes[0].set_title('Scan 1 (Older)', fontsize=11)
    axes[0].axis('off')

    axes[1].imshow(rgb_new)
    axes[1].set_title('Scan 2 (Recent)', fontsize=11)
    axes[1].axis('off')

    desc  = compare_result.get("change_description", "")[:120]
    cause = compare_result.get("probable_cause", "unknown")
    areas = ", ".join(compare_result.get("changed_areas", [])) or "unspecified"
    annotation = f"Change: {desc}\nCause: {cause} | Areas: {areas}"

    fig.text(0.5, 0.01, annotation, ha='center', fontsize=8,
             bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8))

    plt.tight_layout(rect=[0, 0.1, 1, 1])
    out_path = DATA_PRO_DIR / f"comparison_{job_id}.png"
    plt.savefig(str(out_path), dpi=80, bbox_inches='tight')
    plt.close(fig)
    logger.info(f"[{job_id}] Comparison image saved: {out_path}")
    return str(out_path)
