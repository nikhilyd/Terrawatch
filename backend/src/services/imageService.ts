/**
 * Image Service
 * --------------
 * Saves and serves processed satellite images.
 * Replaces the ML service's data/processed/ directory + static file serving.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const PROCESSED_DIR = path.join(__dirname, '..', '..', 'data', 'processed');

// Ensure directory exists
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}

/**
 * Save a processed image (original, heatmap, comparison) to disk.
 * @param buffer  - image buffer (PNG)
 * @param prefix  - filename prefix ("original", "heatmap", "comparison")
 * @param jobId   - job identifier for filename
 * @returns absolute file path
 */
export function saveImage(buffer: Buffer, prefix: string, jobId: string): string {
  const filename = `${prefix}_${jobId}.png`;
  const filePath = path.join(PROCESSED_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Read an image file from disk and return as base64.
 * Used to send images to OpenAI Vision API.
 */
export function imageToBase64(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

/**
 * Get the public URL for a processed image.
 * The Node.js server serves these at /images/:filename
 */
export function getImageUrl(filePath: string, baseUrl?: string): string {
  const filename = path.basename(filePath);
  const base = baseUrl || `http://localhost:${process.env.PORT || 5000}`;
  return `${base}/images/${filename}`;
}

/**
 * Convert a local file path to a public image URL.
 * Handles both absolute paths and already-URL strings.
 */
export function toImageUrl(localPath: string, baseUrl?: string): string {
  if (!localPath) return '';
  if (localPath.startsWith('http')) return localPath;
  const filename = localPath.replace(/\\/g, '/').split('/').pop() || '';
  const base = baseUrl || `http://localhost:${process.env.PORT || 5000}`;
  return `${base}/images/${filename}`;
}

/**
 * Delete an image file from disk.
 */
export function deleteImage(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`[ImageService] Failed to delete ${filePath}:`, err);
  }
}

/**
 * Get disk usage stats for processed images.
 */
export function getDiskStats(): { totalImages: number; totalSizeMb: number; oldestFile: string; newestFile: string } {
  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.png'));

  let totalSize = 0;
  let oldestTime = Infinity;
  let newestTime = 0;
  let oldestFile = '';
  let newestFile = '';

  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const stat = fs.statSync(filePath);
    totalSize += stat.size;
    if (stat.mtimeMs < oldestTime) { oldestTime = stat.mtimeMs; oldestFile = file; }
    if (stat.mtimeMs > newestTime) { newestTime = stat.mtimeMs; newestFile = file; }
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
export function cleanupOldImages(retentionDays: number = 30): { deleted: number; freedMb: number } {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const files = fs.readdirSync(PROCESSED_DIR).filter(f => f.endsWith('.png'));

  let deleted = 0;
  let freedMb = 0;

  for (const file of files) {
    const filePath = path.join(PROCESSED_DIR, file);
    const stat = fs.statSync(filePath);
    if (stat.mtimeMs < cutoff) {
      freedMb += stat.size / (1024 * 1024);
      fs.unlinkSync(filePath);
      deleted++;
    }
  }

  return { deleted, freedMb: Math.round(freedMb * 100) / 100 };
}

export { PROCESSED_DIR };
