/**
 * Geo Calculator
 * ---------------
 * Calculates hectares, forest loss, and annual deforestation rates.
 * Ported from ml-service/src/utils/geo_calculator.py
 */

/**
 * Calculate the area of a bounding box in hectares.
 */
export function bboxAreaHectares(bbox: number[]): number {
  const [lngMin, latMin, lngMax, latMax] = bbox;
  const latMid = (latMin + latMax) / 2;

  const kmPerDegLng = 111.32 * Math.cos((latMid * Math.PI) / 180);
  const kmPerDegLat = 110.57;

  const widthKm  = (lngMax - lngMin) * kmPerDegLng;
  const heightKm = (latMax - latMin) * kmPerDegLat;

  return Math.round(widthKm * heightKm * 100 * 100) / 100; // hectares
}

/**
 * Calculate forest loss in hectares.
 */
export function calculateLossHectares(
  bbox: number[],
  forestPctOld: number,
  forestPctNew: number,
): number {
  const totalHa  = bboxAreaHectares(bbox);
  const lossPct  = Math.max(0, forestPctOld - forestPctNew);
  return Math.round(totalHa * (lossPct / 100) * 100) / 100;
}

/**
 * Calculate annual deforestation rate (hectares/year).
 */
export function calculateAnnualRate(lossHa: number, days: number): number {
  if (days <= 0) return 0;
  return Math.round((lossHa / days) * 365 * 100) / 100;
}
