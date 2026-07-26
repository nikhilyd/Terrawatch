/**
 * Image Service
 * --------------
 * Saves and serves processed satellite images.
 * Replaces the ML service's data/processed/ directory + static file serving.
 */
declare const PROCESSED_DIR: string;
/**
 * Save a processed image (original, heatmap, comparison) to disk.
 * @param buffer  - image buffer (PNG)
 * @param prefix  - filename prefix ("original", "heatmap", "comparison")
 * @param jobId   - job identifier for filename
 * @returns absolute file path
 */
export declare function saveImage(buffer: Buffer, prefix: string, jobId: string): string;
/**
 * Read an image file from disk and return as base64.
 * Used to send images to OpenAI Vision API.
 */
export declare function imageToBase64(filePath: string): string;
/**
 * Get the public URL for a processed image.
 * The Node.js server serves these at /images/:filename
 */
export declare function getImageUrl(filePath: string, baseUrl?: string): string;
/**
 * Convert a local file path to a public image URL.
 * Handles both absolute paths and already-URL strings.
 */
export declare function toImageUrl(localPath: string, baseUrl?: string): string;
/**
 * Delete an image file from disk.
 */
export declare function deleteImage(filePath: string): void;
/**
 * Get disk usage stats for processed images.
 */
export declare function getDiskStats(): {
    totalImages: number;
    totalSizeMb: number;
    oldestFile: string;
    newestFile: string;
};
/**
 * Cleanup old images (older than retentionDays).
 */
export declare function cleanupOldImages(retentionDays?: number): {
    deleted: number;
    freedMb: number;
};
export { PROCESSED_DIR };
//# sourceMappingURL=imageService.d.ts.map