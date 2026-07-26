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
export interface ScanJob {
    job_id: string;
    zone_id: string;
    zone_name: string;
    bbox: number[];
    date_from: string;
    date_to: string;
    resolution: number;
    campaign_id?: string;
    campaign_scan_idx?: number;
}
/**
 * Process a scan job directly.
 */
export declare const processScanJob: (job: ScanJob) => Promise<void>;
//# sourceMappingURL=scanProcessor.d.ts.map