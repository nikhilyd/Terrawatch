/**
 * Scan Processor
 * ---------------
 * Consumes `scan-jobs` from Kafka, runs the full analysis pipeline:
 *   1. Sentinel Hub fetch (real satellite imagery)
 *   2. NDVI calculation (physics-based, instant)
 *   3. GPT-4o Vision analysis (threats, severity)
 *   4. Heatmap generation
 *   5. Produces results to `scan-results`
 *
 * Replaces the ML service's Kafka consumer + analyzer pipeline.
 */

import env from '../config/env';
import { fetchImage } from '../services/sentinelHub';
import { calculateNdvi, generateNdviHeatmap } from '../services/ndvi';
import { analyzeImage } from '../services/visionAnalysis';
import { saveImage, imageToBase64, getImageUrl } from '../services/imageService';
import { processScanResult } from './consumer';

export interface ScanJob {
  job_id:     string;
  zone_id:    string;
  zone_name:  string;
  bbox:       number[];
  date_from:  string;
  date_to:    string;
  resolution: number;
  // Campaign fields (passed through from producer)
  campaign_id?:       string;
  campaign_scan_idx?: number;
}

/**
 * Process a scan job directly.
 */
export const processScanJob = async (job: ScanJob): Promise<void> => {
      console.log(
        `[${job.job_id}] Processing scan | zone=${job.zone_name} | ` +
        `${job.date_from} -> ${job.date_to} | bbox=${JSON.stringify(job.bbox)}`
      );

      try {
        // 1. Fetch satellite image from Sentinel Hub
        console.log(`[${job.job_id}] Fetching from Sentinel Hub...`);
        const imageData = await fetchImage({
          bbox:       job.bbox,
          dateFrom:   job.date_from,
          dateTo:     job.date_to,
          resolution: job.resolution,
        });

        console.log(
          `[${job.job_id}] Image fetched | ${imageData.width}x${imageData.height} | ` +
          `nir_mean=${(Array.from(imageData.nir).reduce((a, b) => a + b, 0) / imageData.nir.length).toFixed(3)}`
        );

        // 2. NDVI calculation (instant, physics-based)
        console.log(`[${job.job_id}] Calculating NDVI...`);
        const ndviResult = calculateNdvi(imageData.nir, imageData.redRaw, imageData.scl);

        console.log(
          `[${job.job_id}] NDVI | forest=${ndviResult.forestPct}% | ` +
          `veg=${ndviResult.vegetationPct}% | bare=${ndviResult.bareSoilPct}% | ` +
          `water=${ndviResult.waterPct}% | cloud=${ndviResult.cloudPct}%`
        );

        // 3. Save original image
        const origPath = saveImage(imageData.rgb, 'original', job.job_id);

        // 4. Generate NDVI heatmap
        let heatmapPath = '';
        try {
          const heatmapBuf = await generateNdviHeatmap(
            imageData.rgb, imageData.nir, imageData.width, imageData.height
          );
          heatmapPath = saveImage(heatmapBuf, 'heatmap', job.job_id);
        } catch (hmErr) {
          console.error(`[${job.job_id}] Heatmap generation failed:`, hmErr);
        }

        // 5. GPT-4o Vision analysis (satellite image threat detection)
        console.log(`[${job.job_id}] Running GPT-4o Vision analysis...`);
        const imageBase64 = imageToBase64(origPath);
        const vlResult = await analyzeImage(imageBase64);

        console.log(
          `[${job.job_id}] Vision | threats=${JSON.stringify(vlResult.threats)} | ` +
          `severity=${vlResult.severity} | confidence=${vlResult.confidence}`
        );

        // 6. Smart deforestation fusion logic (same as old analyzer.py)
        const ndviForest    = ndviResult.forestPct;
        const ndviWater     = ndviResult.waterPct;
        const qwenThreats   = vlResult.threats;
        const qwenDeforest  = qwenThreats.includes('deforestation') || qwenThreats.includes('agricultural_expansion');
        const forestVisible = vlResult.forestVisible;

        let deforestationDetected = false;

        if (qwenDeforest) {
          deforestationDetected = true;
        } else if (ndviForest < 30.0 && qwenThreats.some(t => t !== 'none' && t !== '')) {
          deforestationDetected = true;
        } else if (ndviForest < 10.0 && ndviWater > 50.0) {
          deforestationDetected = false;
        } else if (ndviForest < 10.0 && !forestVisible) {
          deforestationDetected = true;
        } else if (ndviForest < 5.0 && ndviWater < 30.0) {
          deforestationDetected = true;
        }

        // 7. Produce result to scan-results topic
        const scanResult = {
          job_id:     job.job_id,
          zone_id:    job.zone_id,

          // NDVI metrics
          forest_percentage:      ndviResult.forestPct,
          vegetation_percentage:  ndviResult.vegetationPct,
          bare_soil_percentage:   ndviResult.bareSoilPct,
          water_percentage:       ndviResult.waterPct,
          ndvi_mean:              ndviResult.ndviMean,
          ndvi_min:               ndviResult.ndviMin,
          ndvi_max:               ndviResult.ndviMax,

          // Vision analysis
          threats:               vlResult.threats,
          severity:              vlResult.severity,
          description:           vlResult.description,
          affected_areas:        vlResult.affectedAreas,
          forest_visible:        vlResult.forestVisible,
          vl_confidence:         vlResult.confidence,

          // Combined
          deforestation_detected: deforestationDetected,
          heatmap_path:           heatmapPath,
          original_image_path:    origPath,

          // Cloud info
          cloud_pct:              ndviResult.cloudPct,

          // Pass through campaign fields
          ...(job.campaign_id ? { campaign_id: job.campaign_id } : {}),
          ...(job.campaign_scan_idx !== undefined ? { campaign_scan_idx: job.campaign_scan_idx } : {}),
        };

        await processScanResult(scanResult);

        console.log(
          `[${job.job_id}] Scan complete | forest=${ndviResult.forestPct}% | ` +
          `deforestation=${deforestationDetected} | severity=${vlResult.severity}`
        );

      } catch (err: any) {
        console.error(`[${job.job_id}] Scan processing failed:`, err?.message || err);

        // Process error result
        await processScanResult({
              job_id:  job.job_id,
              zone_id: job.zone_id,
              error:   err?.message || 'Unknown error',
              status:  'failed',
              // Empty results so consumer doesn't crash
              forest_percentage: 0, vegetation_percentage: 0,
              bare_soil_percentage: 0, water_percentage: 0,
              ndvi_mean: 0, ndvi_min: 0, ndvi_max: 0,
              threats: ['none'], severity: 'none', description: '',
              affected_areas: [], forest_visible: false, vl_confidence: 'low',
              deforestation_detected: false, heatmap_path: '', original_image_path: '',
              ...(job.campaign_id ? { campaign_id: job.campaign_id } : {}),
              ...(job.campaign_scan_idx !== undefined ? { campaign_scan_idx: job.campaign_scan_idx } : {}),
        });
      }
};
