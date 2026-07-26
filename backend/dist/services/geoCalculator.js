"use strict";
/**
 * Geo Calculator
 * ---------------
 * Calculates hectares, forest loss, and annual deforestation rates.
 * Ported from ml-service/src/utils/geo_calculator.py
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bboxAreaHectares = bboxAreaHectares;
exports.calculateLossHectares = calculateLossHectares;
exports.calculateAnnualRate = calculateAnnualRate;
/**
 * Calculate the area of a bounding box in hectares.
 */
function bboxAreaHectares(bbox) {
    const [lngMin, latMin, lngMax, latMax] = bbox;
    const latMid = (latMin + latMax) / 2;
    const kmPerDegLng = 111.32 * Math.cos((latMid * Math.PI) / 180);
    const kmPerDegLat = 110.57;
    const widthKm = (lngMax - lngMin) * kmPerDegLng;
    const heightKm = (latMax - latMin) * kmPerDegLat;
    return Math.round(widthKm * heightKm * 100 * 100) / 100; // hectares
}
/**
 * Calculate forest loss in hectares.
 */
function calculateLossHectares(bbox, forestPctOld, forestPctNew) {
    const totalHa = bboxAreaHectares(bbox);
    const lossPct = Math.max(0, forestPctOld - forestPctNew);
    return Math.round(totalHa * (lossPct / 100) * 100) / 100;
}
/**
 * Calculate annual deforestation rate (hectares/year).
 */
function calculateAnnualRate(lossHa, days) {
    if (days <= 0)
        return 0;
    return Math.round((lossHa / days) * 365 * 100) / 100;
}
//# sourceMappingURL=geoCalculator.js.map