/**
 * Vision Analysis Service (OpenAI GPT-4o Vision)
 * ------------------------------------------------
 * Replaces the local Qwen2-VL model with OpenAI's GPT-4o Vision API.
 * Handles:
 *   1. Single image threat analysis (satellite)
 *   2. Dual image comparison (change detection)
 *   3. Field officer ground photo analysis
 *   4. Historical verdict generation (text-only)
 *
 * All responses are structured JSON — same shape as the old Qwen outputs.
 */
export interface ThreatAnalysis {
    threats: string[];
    severity: string;
    description: string;
    affectedAreas: string[];
    forestVisible: boolean;
    confidence: string;
}
export interface ComparisonResult {
    changeDetected: boolean;
    changeType: string;
    severity: string;
    changedAreas: string[];
    changeDescription: string;
    probableCause: string;
}
export interface FieldAnalysis {
    threats: string[];
    severity: string;
    description: string;
    confidence: string;
}
/**
 * Analyze a single satellite image for environmental threats.
 * @param imageBase64 - base64-encoded PNG/JPEG of the satellite image
 * @returns structured threat analysis
 */
export declare function analyzeImage(imageBase64: string): Promise<ThreatAnalysis>;
/**
 * Compare two satellite images (old vs new) for change detection.
 * @param imageOldBase64 - base64 of the older scan
 * @param imageNewBase64 - base64 of the newer scan
 * @returns structured comparison result
 */
export declare function compareImages(imageOldBase64: string, imageNewBase64: string): Promise<ComparisonResult>;
/**
 * Analyze a field officer's ground-level photo.
 * @param imageBase64 - base64-encoded photo
 * @param zoneName    - zone name for context
 * @param gps         - GPS coordinates {lat, lng}
 * @param notes       - officer notes
 * @returns structured field analysis
 */
export declare function analyzeFieldPhoto(imageBase64: string, zoneName: string, gps?: {
    lat: number;
    lng: number;
}, notes?: string): Promise<FieldAnalysis>;
/**
 * Generate a text-only verdict from historical scan data.
 * No image needed — just structured data summary.
 */
export declare function generateVerdict(prompt: string): Promise<string>;
/**
 * Health check — verify OpenAI API key works.
 */
export declare function healthCheck(): Promise<boolean>;
//# sourceMappingURL=visionAnalysis.d.ts.map