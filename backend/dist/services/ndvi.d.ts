/**
 * NDVI Calculation (Pure JS)
 * ---------------------------
 * Ported from Python ml-service/src/data/ndvi.py (54 lines).
 * Calculates Normalized Difference Vegetation Index from
 * raw Sentinel-2 bands (B08=NIR, B04=Red) with SCL cloud masking.
 *
 * NDVI = (NIR - Red) / (NIR + Red)
 *   > 0.6  → Forest
 *   0.2-0.6 → Vegetation
 *   0-0.2  → Bare Soil
 *   < 0    → Water
 */
export interface NdviResult {
    forestPct: number;
    vegetationPct: number;
    bareSoilPct: number;
    waterPct: number;
    ndviMean: number;
    ndviMin: number;
    ndviMax: number;
    cloudPct: number;
}
/**
 * Calculate NDVI from raw spectral bands.
 *
 * @param nir    - B08 Near-Infrared raw values (Float32Array, 0-1 range)
 * @param redRaw - B04 Red raw values (Float32Array, 0-1 range)
 * @param scl    - Scene Classification Layer (Uint8Array) for cloud masking
 * @returns Land cover percentages + NDVI statistics
 */
export declare function calculateNdvi(nir: Float32Array, redRaw: Float32Array, scl?: Uint8Array): NdviResult;
/**
 * Calculate NDVI heatmap buffer (PNG) for visualization.
 * Uses sharp for image generation.
 */
export declare function generateNdviHeatmap(rgbBuf: Buffer, nir: Float32Array, width: number, height: number): Promise<Buffer>;
//# sourceMappingURL=ndvi.d.ts.map