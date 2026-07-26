"use strict";
/**
 * Image Service
 * --------------
 * Saves and serves processed satellite images.
 * Replaces the ML service's data/processed/ directory + static file serving.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROCESSED_DIR = void 0;
exports.saveImage = saveImage;
exports.imageToBase64 = imageToBase64;
exports.getImageUrl = getImageUrl;
exports.toImageUrl = toImageUrl;
exports.deleteImage = deleteImage;
exports.getDiskStats = getDiskStats;
exports.cleanupOldImages = cleanupOldImages;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const PROCESSED_DIR = path_1.default.join(__dirname, '..', '..', 'data', 'processed');
exports.PROCESSED_DIR = PROCESSED_DIR;
// Ensure directory exists
if (!fs_1.default.existsSync(PROCESSED_DIR)) {
    fs_1.default.mkdirSync(PROCESSED_DIR, { recursive: true });
}
/**
 * Save a processed image (original, heatmap, comparison) to disk.
 * @param buffer  - image buffer (PNG)
 * @param prefix  - filename prefix ("original", "heatmap", "comparison")
 * @param jobId   - job identifier for filename
 * @returns absolute file path
 */
function saveImage(buffer, prefix, jobId) {
    const filename = `${prefix}_${jobId}.png`;
    const filePath = path_1.default.join(PROCESSED_DIR, filename);
    fs_1.default.writeFileSync(filePath, buffer);
    return filePath;
}
/**
 * Read an image file from disk and return as base64.
 * Used to send images to OpenAI Vision API.
 */
function imageToBase64(filePath) {
    const buffer = fs_1.default.readFileSync(filePath);
    return buffer.toString('base64');
}
/**
 * Get the public URL for a processed image.
 * The Node.js server serves these at /images/:filename
 */
function getImageUrl(filePath, baseUrl) {
    const filename = path_1.default.basename(filePath);
    const base = baseUrl || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}/images/${filename}`;
}
/**
 * Convert a local file path to a public image URL.
 * Handles both absolute paths and already-URL strings.
 */
function toImageUrl(localPath, baseUrl) {
    if (!localPath)
        return '';
    if (localPath.startsWith('http'))
        return localPath;
    const filename = localPath.replace(/\\/g, '/').split('/').pop() || '';
    const base = baseUrl || `http://localhost:${process.env.PORT || 5000}`;
    return `${base}/images/${filename}`;
}
/**
 * Delete an image file from disk.
 */
function deleteImage(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (err) {
        console.error(`[ImageService] Failed to delete ${filePath}:`, err);
    }
}
/**
 * Get disk usage stats for processed images.
 */
function getDiskStats() {
    const files = fs_1.default.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.png'));
    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let oldestFile = '';
    let newestFile = '';
    for (const file of files) {
        const filePath = path_1.default.join(PROCESSED_DIR, file);
        const stat = fs_1.default.statSync(filePath);
        totalSize += stat.size;
        if (stat.mtimeMs < oldestTime) {
            oldestTime = stat.mtimeMs;
            oldestFile = file;
        }
        if (stat.mtimeMs > newestTime) {
            newestTime = stat.mtimeMs;
            newestFile = file;
        }
    }
    return {
        totalImages: files.length,
        totalSizeMb: Math.round(totalSize / (1024 * 1024) * 100) / 100,
        oldestFile,
        newestFile,
    };
}
/**
 * Cleanup old images (older than retentionDays).
 */
function cleanupOldImages(retentionDays = 30) {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const files = fs_1.default.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.png'));
    let deleted = 0;
    let freedMb = 0;
    for (const file of files) {
        const filePath = path_1.default.join(PROCESSED_DIR, file);
        const stat = fs_1.default.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
            freedMb += stat.size / (1024 * 1024);
            fs_1.default.unlinkSync(filePath);
            deleted++;
        }
    }
    return { deleted, freedMb: Math.round(freedMb * 100) / 100 };
}
//# sourceMappingURL=imageService.js.map