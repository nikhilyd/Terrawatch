/**
 * Sentinel Hub Process API
 * -------------------------
 * Fetches real Sentinel-2 L2A satellite imagery:
 *   - RGB (B04, B03, B02) — display + OpenAI Vision
 *   - NIR (B08) — NDVI calculation
 *   - RED raw (B04) — accurate NDVI (not display-corrected)
 *   - SCL (Scene Classification Layer) — cloud masking
 *
 * Uses Sentinel Hub Process API v1 with OAuth2 token.
 */
interface SentinelHubImage {
    rgb: Buffer;
    nir: Float32Array;
    redRaw: Float32Array;
    scl: Uint8Array;
    width: number;
    height: number;
    metadata: {
        bbox: number[];
        dateFrom: string;
        dateTo: string;
    };
}
/**
 * Fetch satellite image from Sentinel Hub.
 * Returns RGB (Buffer), NIR, RED raw, SCL as typed arrays.
 */
export declare function fetchImage(params: {
    bbox: number[];
    dateFrom: string;
    dateTo: string;
    resolution?: number;
}): Promise<SentinelHubImage>;
/**
 * Health check — verify Sentinel Hub credentials work.
 */
export declare function healthCheck(): Promise<boolean>;
export {};
//# sourceMappingURL=sentinelHub.d.ts.map