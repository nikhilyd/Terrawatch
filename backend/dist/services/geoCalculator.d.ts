/**
 * Geo Calculator
 * ---------------
 * Calculates hectares, forest loss, and annual deforestation rates.
 * Ported from ml-service/src/utils/geo_calculator.py
 */
/**
 * Calculate the area of a bounding box in hectares.
 */
export declare function bboxAreaHectares(bbox: number[]): number;
/**
 * Calculate forest loss in hectares.
 */
export declare function calculateLossHectares(bbox: number[], forestPctOld: number, forestPctNew: number): number;
/**
 * Calculate annual deforestation rate (hectares/year).
 */
export declare function calculateAnnualRate(lossHa: number, days: number): number;
//# sourceMappingURL=geoCalculator.d.ts.map