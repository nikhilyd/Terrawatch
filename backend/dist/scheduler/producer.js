"use strict";
/**
 * Scheduler / Producer
 * ---------------------
 * 1. Auto-scan cron       — Raat 2 baje saare zones scan karo
 * 2. Stuck scan handler   — 30 min se zyada "pending" → "failed" mark karo + email
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = exports.publishScanJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const uuid_1 = require("uuid");
const Zone_1 = __importDefault(require("../models/Zone"));
const Scan_1 = __importDefault(require("../models/Scan"));
const User_1 = __importDefault(require("../models/User"));
const kafka_1 = require("../config/kafka");
const env_1 = __importDefault(require("../config/env"));
// ── Date helpers ──────────────────────────────────────────────────────────────
const formatDate = (d) => d.toISOString().split('T')[0];
const getLastWeekDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatDate(d);
};
// ── Single zone ka scan publish karo ─────────────────────────────────────────
const publishScanJob = async (zoneId) => {
    try {
        const zone = await Zone_1.default.findById(zoneId);
        if (!zone || !zone.bbox)
            return null;
        const jobId = (0, uuid_1.v4)();
        const from = getLastWeekDate();
        const to = formatDate(new Date());
        const job = {
            job_id: jobId,
            zone_id: zone._id.toString(),
            zone_name: zone.name,
            bbox: [zone.bbox.lng_min, zone.bbox.lat_min,
                zone.bbox.lng_max, zone.bbox.lat_max],
            date_from: from,
            date_to: to,
            resolution: zone.sentinelConfig?.resolution ?? 20,
        };
        await Scan_1.default.create({
            zoneId: zone._id,
            jobId,
            imagePath: `sentinel://${zone.name}/${from}->${to}`,
            status: 'pending',
        });
        await kafka_1.producer.send({
            topic: env_1.default.KAFKA_TOPIC_PRODUCE,
            messages: [{ key: jobId, value: JSON.stringify(job) }],
        });
        console.log(`[${jobId}] Auto-scan queued | zone=${zone.name}`);
        return jobId;
    }
    catch (err) {
        console.error(`publishScanJob error:`, err);
        return null;
    }
};
exports.publishScanJob = publishScanJob;
// ── Feature: Stuck Scan Handler ───────────────────────────────────────────────
// Scans jo 30 min se zyada "pending" hain → "failed" mark karo + creator ko email
const handleStuckScans = async () => {
    try {
        const TIMEOUT_MINUTES = 30;
        const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);
        // 30 min se zyada pending scans dhundho
        const stuckScans = await Scan_1.default.find({
            status: 'pending',
            createdAt: { $lt: cutoff },
        }).populate('zoneId', 'name createdBy');
        if (stuckScans.length === 0)
            return;
        console.log(`[StuckScanHandler] Found ${stuckScans.length} stuck scans — marking as failed`);
        for (const scan of stuckScans) {
            // Mark as failed
            await Scan_1.default.findByIdAndUpdate(scan._id, {
                status: 'failed',
                failedAt: new Date(),
                failReason: `Timeout: Scan did not complete after ${TIMEOUT_MINUTES} minutes`,
            });
            // Zone creator ko email bhejo
            try {
                const zone = scan.zoneId;
                const creator = zone?.createdBy
                    ? await User_1.default.findById(zone.createdBy).select('email name alertEmail')
                    : null;
                const toEmail = creator?.alertEmail || creator?.email;
                if (toEmail && env_1.default.SMTP_USER && env_1.default.SMTP_PASS) {
                    const transporter = nodemailer_1.default.createTransport({
                        host: env_1.default.SMTP_HOST,
                        port: env_1.default.SMTP_PORT,
                        auth: { user: env_1.default.SMTP_USER, pass: env_1.default.SMTP_PASS },
                    });
                    await transporter.sendMail({
                        from: `"EcoWatch System" <${env_1.default.SMTP_USER}>`,
                        to: toEmail,
                        subject: `[EcoWatch] Scan Failed — Zone: ${zone?.name ?? 'Unknown'}`,
                        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#c62828;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0">EcoWatch — Scan Failed</h2>
  </div>
  <div style="background:#fff8f8;padding:25px;border:1px solid #ffcdd2">
    <p>Hello ${creator?.name ?? 'User'},</p>
    <p>A scheduled scan for <strong>${zone?.name ?? 'your zone'}</strong> has failed to complete.</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Zone</td>
          <td style="padding:8px">${zone?.name ?? 'Unknown'}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Job ID</td>
          <td style="padding:8px;font-family:monospace">${scan.jobId}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Started</td>
          <td style="padding:8px">${new Date(scan.createdAt).toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Reason</td>
          <td style="padding:8px;color:#c62828">Scan timed out after ${TIMEOUT_MINUTES} minutes</td></tr>
    </table>
    <p><strong>What to do:</strong></p>
    <ul>
      <li>Check if the Node.js service is running</li>
      <li>Verify Sentinel Hub credentials are valid</li>
      <li>Trigger a manual scan from the dashboard</li>
    </ul>
    <p style="color:#888;font-size:12px">This is an automated message from EcoWatch Monitoring System.</p>
  </div>
</div>`,
                    });
                    console.log(`[StuckScanHandler] Failure email sent for zone: ${zone?.name} to ${toEmail}`);
                }
            }
            catch (emailErr) {
                console.error('[StuckScanHandler] Email failed:', emailErr);
            }
        }
        console.log(`[StuckScanHandler] Marked ${stuckScans.length} scans as failed`);
    }
    catch (err) {
        console.error('[StuckScanHandler] Error:', err);
    }
};
// ── Start All Schedulers ──────────────────────────────────────────────────────
const startScheduler = () => {
    // 1. Auto-scan — Raat 2 baje (daily)
    const scanSchedule = process.env.CRON_SCHEDULE || '0 2 * * *';
    node_cron_1.default.schedule(scanSchedule, async () => {
        console.log(`\n[Scheduler] Auto-scan started: ${new Date().toISOString()}`);
        const zones = await Zone_1.default.find({ isActive: true });
        console.log(`[Scheduler] Found ${zones.length} active zones`);
        await Promise.all(zones.map(zone => (0, exports.publishScanJob)(zone._id.toString())));
        console.log(`[Scheduler] ${zones.length} scan jobs queued\n`);
    });
    // 2. Stuck scan handler — Har 15 min check karo
    node_cron_1.default.schedule('*/15 * * * *', async () => {
        await handleStuckScans();
    });
    // 3. Run once at startup to catch any overnight stuck scans
    setTimeout(handleStuckScans, 10000);
    console.log(`[Scheduler] Auto-scan: ${scanSchedule}`);
    console.log(`[Scheduler] Stuck scan check: every 15 minutes`);
};
exports.startScheduler = startScheduler;
//# sourceMappingURL=producer.js.map