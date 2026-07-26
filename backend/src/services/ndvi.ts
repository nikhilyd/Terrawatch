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
  forestPct:      number;
  vegetationPct:  number;
  bareSoilPct:    number;
  waterPct:       number;
  ndviMean:       number;
  ndviMin:        number;
  ndviMax:        number;
  cloudPct:       number;
}

/**
 * Calculate NDVI from raw spectral bands.
 *
 * @param nir    - B08 Near-Infrared raw values (Float32Array, 0-1 range)
 * @param redRaw - B04 Red raw values (Float32Array, 0-1 range)
 * @param scl    - Scene Classification Layer (Uint8Array) for cloud masking
 * @returns Land cover percentages + NDVI statistics
 */
export function calculateNdvi(
  nir:    Float32Array,
  redRaw: Float32Array,
  scl?:   Uint8Array,
): NdviResult {
  const len = nir.length;

  // Cloud masking: SCL values 0 (No data), 3 (Cloud shadows), 8, 9, 10 (Clouds)
  const CLOUD_SCL = new Set([0, 3, 8, 9, 10]);
  const validMask = new Uint8Array(len);
  let cloudCount = 0;

  if (scl) {
    for (let i = 0; i < len; i++) {
      if (CLOUD_SCL.has(scl[i])) {
        cloudCount++;
        validMask[i] = 0; // cloud pixel, skip
      } else {
        validMask[i] = 1; // valid pixel
      }
    }
  } else {
    validMask.fill(1);
  }

  const cloudPct = len > 0 ? (cloudCount / len) * 100 : 0;

  // Calculate NDVI for valid pixels only
  let ndviSum = 0;
  let ndviMin = Infinity;
  let ndviMax = -Infinity;
  let validCount = 0;

  let forestCount     = 0;
  let vegetationCount = 0;
  let bareSoilCount   = 0;
  let waterCount      = 0;

  for (let i = 0; i < len; i++) {
    if (!validMask[i]) continue;

    const n = nir[i];
    const r = redRaw[i];
    const denom = n + r;

    if (denom === 0) continue; // skip zero-division pixels

    const ndvi = (n - r) / denom;

    ndviSum += ndvi;
    validCount++;
    if (ndvi < ndviMin) ndviMin = ndvi;
    if (ndvi > ndviMax) ndviMax = ndvi;

    // Classify
    if (ndvi < 0)            waterCount++;
    else if (ndvi < 0.2)     bareSoilCount++;
    else if (ndvi < 0.6)     vegetationCount++;
    else                     forestCount++;
  }

  if (validCount === 0) {
    return {
      forestPct: 0, vegetationPct: 0, bareSoilPct: 0, waterPct: 0,
      ndviMean: 0, ndviMin: 0, ndviMax: 0, cloudPct: round(cloudPct),
    };
  }

  return {
    forestPct:     round((forestCount / validCount) * 100),
    vegetationPct: round((vegetationCount / validCount) * 100),
    bareSoilPct:   round((bareSoilCount / validCount) * 100),
    waterPct:      round((waterCount / validCount) * 100),
    ndviMean:      round3(ndviSum / validCount),
    ndviMin:       round3(ndviMin),
    ndviMax:       round3(ndviMax),
    cloudPct:      round(cloudPct),
  };
}

/**
 * Calculate NDVI heatmap buffer (PNG) for visualization.
 * Uses sharp for image generation.
 */
export async function generateNdviHeatmap(
  rgbBuf: Buffer,
  nir: Float32Array,
  width: number,
  height: number,
): Promise<Buffer> {
  const sharp = require('sharp');

  // Calculate NDVI array
  const ndviArr = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const n = nir[i] || 0;
    // Use RGB red channel as approximation for display heatmap
    ndviArr[i] = 0; // will fill from actual red channel
  }

  // Get raw pixel data from RGB buffer
  const { data: pixels, info } = await sharp(rgbBuf)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixelCount = info.width * info.height;
  const redChannel = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    redChannel[i] = pixels[i * 3] / 255.0;
  }

  // NDVI from raw red channel
  for (let i = 0; i < pixelCount; i++) {
    const n = nir[i] || 0;
    const r = redChannel[i];
    const denom = n + r;
    ndviArr[i] = denom !== 0 ? (n - r) / denom : 0;
  }

  // Map NDVI to RdYlGn colormap (Red → Yellow → Green)
  const heatmapPixels = Buffer.alloc(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const v = Math.max(-0.2, Math.min(0.8, ndviArr[i]));
    const t = (v + 0.2) / 1.0; // normalize to 0-1

    let r: number, g: number, b: number;
    if (t < 0.5) {
      // Red → Yellow
      const s = t * 2;
      r = 220; g = Math.round(60 + 140 * s); b = 60;
    } else {
      // Yellow → Green
      const s = (t - 0.5) * 2;
      r = Math.round(220 - 160 * s); g = Math.round(200 + 55 * s); b = 60;
    }

    heatmapPixels[i * 3]     = r;
    heatmapPixels[i * 3 + 1] = g;
    heatmapPixels[i * 3 + 2] = b;
  }

  // Create side-by-side: original | NDVI heatmap
  const heatmapImg = await sharp(heatmapPixels, {
    raw: { width: info.width, height: info.height, channels: 3 },
  }).png().toBuffer();

  const halfW = Math.floor(info.width / 2);
  const resizedOriginal = await sharp(rgbBuf).resize(halfW, info.height).png().toBuffer();
  const resizedHeatmap  = await sharp(heatmapImg).resize(halfW, info.height).png().toBuffer();

  const combined = await sharp({
    create: {
      width: halfW * 2,
      height: info.height + 40,
      channels: 3,
      background: { r: 30, g: 30, b: 30 },
    },
  })
    .composite([
      { input: resizedOriginal, left: 0, top: 0 },
      { input: resizedHeatmap,  left: halfW, top: 0 },
    ])
    .png()
    .toBuffer();

  return combined;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
