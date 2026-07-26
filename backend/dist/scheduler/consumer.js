"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScanResult = void 0;
const Scan_1 = __importDefault(require("../models/Scan"));
const Zone_1 = __importDefault(require("../models/Zone"));
const Alert_1 = __importDefault(require("../models/Alert"));
const env_1 = __importDefault(require("../config/env"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const socket_1 = require("../utils/socket");
const campaign_scheduler_1 = require("./campaign.scheduler");
const visionAnalysis_1 = require("../services/visionAnalysis");
const imageService_1 = require("../services/imageService");
const imageService_2 = require("../services/imageService");
const sharp_1 = __importDefault(require("sharp"));
// ── Comparison Trigger (OpenAI GPT-4o Vision — replaces Qwen2-VL) ────────
const triggerComparisonAnalysis = async (imagePathOld, imagePathNew, forestLoss, jobId, bbox) => {
    try {
        console.log(`[${jobId}] Triggering GPT-4o comparison | loss=${forestLoss}%`);
        const imgOldBase64 = (0, imageService_1.imageToBase64)(imagePathOld);
        const imgNewBase64 = (0, imageService_1.imageToBase64)(imagePathNew);
        const result = await (0, visionAnalysis_1.compareImages)(imgOldBase64, imgNewBase64);
        // Generate side-by-side comparison image
        let comparisonImagePath = '';
        try {
            const oldBuf = await (0, sharp_1.default)(imagePathOld).resize(512, 512).toBuffer();
            const newBuf = await (0, sharp_1.default)(imagePathNew).resize(512, 512).toBuffer();
            const halfW = 512;
            const combined = await (0, sharp_1.default)({
                create: {
                    width: halfW * 2, height: 512, channels: 3,
                    background: { r: 30, g: 30, b: 30 },
                },
            })
                .composite([
                { input: oldBuf, left: 0, top: 0 },
                { input: newBuf, left: halfW, top: 0 },
            ])
                .png()
                .toBuffer();
            comparisonImagePath = (0, imageService_2.saveImage)(combined, 'comparison', jobId);
        }
        catch (imgErr) {
            console.error(`[${jobId}] Comparison image generation failed:`, imgErr);
        }
        // Hotspot calculation (from pixel diff, same as old ML service)
        let hotspotLat = null;
        let hotspotLng = null;
        if (bbox && bbox.length === 4) {
            try {
                const oldBuf = await (0, sharp_1.default)(imagePathOld).resize(256, 256).raw().toBuffer();
                const newBuf = await (0, sharp_1.default)(imagePathNew).resize(256, 256).raw().toBuffer();
                const H = 256, W = 256;
                const diff = new Float32Array(H * W);
                for (let i = 0; i < H * W; i++) {
                    const oldGray = (oldBuf[i * 3] + oldBuf[i * 3 + 1] + oldBuf[i * 3 + 2]) / 3;
                    const newGray = (newBuf[i * 3] + newBuf[i * 3 + 1] + newBuf[i * 3 + 2]) / 3;
                    diff[i] = newGray - oldGray;
                }
                // Top 5% brightest changes
                const sorted = Array.from(diff).sort((a, b) => b - a);
                const threshold = sorted[Math.floor(H * W * 0.05)] || 0;
                let sumX = 0, sumY = 0, count = 0;
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        if (diff[y * W + x] > threshold) {
                            sumX += x;
                            sumY += y;
                            count++;
                        }
                    }
                }
                if (count > 0) {
                    const cx = sumX / count;
                    const cy = sumY / count;
                    const [lngMin, latMin, lngMax, latMax] = bbox;
                    hotspotLng = lngMin + (cx / W) * (lngMax - lngMin);
                    hotspotLat = latMax - (cy / H) * (latMax - latMin);
                    console.log(`[${jobId}] Hotspot: lat=${hotspotLat.toFixed(5)}, lng=${hotspotLng.toFixed(5)}`);
                }
            }
            catch (e) {
                console.error(`[${jobId}] Hotspot calculation failed:`, e);
            }
        }
        console.log(`[${jobId}] Comparison done | type=${result.changeType}`);
        return {
            job_id: jobId,
            forest_loss: forestLoss,
            change_detected: result.changeDetected,
            change_type: result.changeType,
            severity: result.severity,
            changed_areas: result.changedAreas,
            change_description: result.changeDescription,
            probable_cause: result.probableCause,
            comparison_image_path: comparisonImagePath,
            hotspot_lat: hotspotLat,
            hotspot_lng: hotspotLng,
        };
    }
    catch (err) {
        console.error(`[${jobId}] Comparison API failed:`, err?.message);
        return null;
    }
};
// ── Severity from forest loss % ──────────────────────────────
const getSeverity = (loss) => {
    if (loss < 5)
        return 'LOW';
    if (loss < 15)
        return 'MEDIUM';
    if (loss < 30)
        return 'HIGH';
    return 'CRITICAL';
};
// ── Email helper ─────────────────────────────────────────────
const sendAlertEmail = async (toEmail, zoneName, loss, severity, threats, description) => {
    if (!env_1.default.SMTP_USER || !env_1.default.SMTP_PASS)
        return;
    const transporter = nodemailer_1.default.createTransport({
        host: env_1.default.SMTP_HOST,
        port: env_1.default.SMTP_PORT,
        auth: { user: env_1.default.SMTP_USER, pass: env_1.default.SMTP_PASS },
    });
    const threatsStr = threats.filter(t => t !== 'none').join(', ') || 'None detected';
    await transporter.sendMail({
        from: `"EcoWatch Alert" <${env_1.default.SMTP_USER}>`,
        to: toEmail,
        subject: `[${severity}] Environmental Alert — ${zoneName}`,
        html: `
      <h2>EcoWatch Environmental Alert</h2>
      <p><strong>Zone:</strong> ${zoneName}</p>
      <p><strong>Forest Loss:</strong> ${loss.toFixed(1)}%</p>
      <p><strong>Severity:</strong> ${severity}</p>
      <p><strong>Threats Detected:</strong> ${threatsStr}</p>
      <p><strong>AI Analysis:</strong> ${description}</p>
      <hr/>
      <p>Please take immediate action!</p>
    `,
    });
    console.log(`Alert email sent for zone: ${zoneName}`);
};
// ── Main Result Processor ────────────────────────────────────
const processScanResult = async (result) => {
    if (!result || result.status === 'failed') {
        if (result && result.job_id) {
            console.warn(`[${result.job_id}] Received failed scan result, updating DB to failed`);
            // We could update DB to failed here if needed.
        }
        return;
    }
    try {
        const { job_id, zone_id, forest_percentage, vegetation_percentage, bare_soil_percentage, water_percentage, ndvi_mean, ndvi_min, ndvi_max, threats, severity, description, affected_areas, forest_visible, vl_confidence, deforestation_detected, heatmap_path, original_image_path, // comparison ke liye
        // Campaign fields
        campaign_id, campaign_scan_idx, } = result;
        console.log(`[${job_id}] Result | zone=${zone_id} | ` +
            `forest=${forest_percentage}% | threats=${JSON.stringify(threats)} | ` +
            `severity=${severity}`);
        // 1. Scan update
        const scan = await Scan_1.default.findOneAndUpdate({ jobId: job_id }, {
            status: 'completed',
            scanDate: new Date(),
            results: {
                forestPercentage: forest_percentage,
                vegetationPercentage: vegetation_percentage,
                bareSoilPercentage: bare_soil_percentage,
                waterPercentage: water_percentage,
                ndviMean: ndvi_mean,
                ndviMin: ndvi_min,
                ndviMax: ndvi_max,
                threats: threats || ['none'],
                severity: severity || 'none',
                description: description || '',
                affectedAreas: affected_areas || [],
                forestVisible: forest_visible || false,
                vlConfidence: vl_confidence || 'low',
                deforestationDetected: deforestation_detected,
                heatmapPath: heatmap_path || '',
                originalImagePath: original_image_path || '',
            },
        }, { new: true });
        if (!scan) {
            console.warn(`[${job_id}] Scan record not found in DB`);
            return;
        }
        // Broadcast updated scan
        const populatedScan = await Scan_1.default.findById(scan._id).populate('zoneId', 'name bbox');
        if (populatedScan) {
            (0, socket_1.broadcastScanUpdate)(populatedScan);
        }
        // Campaign scan result wiring
        if (campaign_id && campaign_scan_idx !== undefined && campaign_scan_idx >= 0) {
            try {
                await (0, campaign_scheduler_1.processCampaignScanResult)(campaign_id, Number(campaign_scan_idx), scan._id.toString());
                console.log(`[${job_id}] Campaign ${campaign_id} scan-${campaign_scan_idx} updated`);
            }
            catch (campaignErr) {
                console.error(`[${job_id}] Campaign update failed:`, campaignErr);
            }
        }
        // 2. Zone lastScanned update
        const zone = await Zone_1.default.findByIdAndUpdate(zone_id, { lastScanned: new Date() }, { new: true });
        // 3. Previous scan
        const prevScan = await Scan_1.default.findOne({
            zoneId: zone_id,
            status: 'completed',
            _id: { $ne: scan._id },
        }).sort({ createdAt: -1 });
        // 4. Alert logic
        if (zone) {
            let shouldAlert = false;
            let loss = 0;
            let bareSoilInc = 0;
            let waterLoss = 0;
            let alertSeverity = 'LOW';
            let threatMsg = '';
            // Temporal comparison
            if (prevScan) {
                const prevForestPct = prevScan.results.forestPercentage;
                const prevBarePct = prevScan.results.bareSoilPercentage;
                const prevWaterPct = prevScan.results.waterPercentage;
                loss = parseFloat((prevForestPct - forest_percentage).toFixed(2));
                bareSoilInc = parseFloat((bare_soil_percentage - prevBarePct).toFixed(2));
                waterLoss = parseFloat((prevWaterPct - water_percentage).toFixed(2));
                const maxChange = Math.max(loss, bareSoilInc, waterLoss);
                if (maxChange > zone.alertThreshold) {
                    shouldAlert = true;
                    alertSeverity = getSeverity(maxChange);
                    const messages = [];
                    if (loss > zone.alertThreshold)
                        messages.push(`${loss}% forest loss`);
                    if (bareSoilInc > zone.alertThreshold)
                        messages.push(`${bareSoilInc}% bare soil increase (potential mining)`);
                    if (waterLoss > zone.alertThreshold)
                        messages.push(`${waterLoss}% water loss (drought/damming)`);
                    threatMsg = messages.join(', ');
                }
            }
            // AI high/critical = alert even without prev scan
            if (severity === 'high' || severity === 'critical') {
                shouldAlert = true;
                alertSeverity = severity.toUpperCase();
                threatMsg = threatMsg || `AI Detected Threats: ${threats.join(', ')}`;
            }
            if (shouldAlert) {
                const alertMsg = prevScan
                    ? `Zone "${zone.name}" — ${threatMsg}.`
                    : `Zone "${zone.name}" — Environmental threat detected. Threats: ${threats.join(', ')}`;
                const alert = await Alert_1.default.create({
                    zoneId: zone_id,
                    scanId: scan._id,
                    prevScanId: prevScan?._id,
                    forestLoss: Math.max(0, loss),
                    bareSoilIncrease: Math.max(0, bareSoilInc),
                    waterLoss: Math.max(0, waterLoss),
                    severity: alertSeverity,
                    message: alertMsg,
                });
                console.log(`ALERT | zone=${zone.name} | severity=${alertSeverity} | ${threatMsg}`);
                // Broadcast alert
                (0, socket_1.broadcastAlert)(alert);
                // Deep Comparison (GPT-4o Vision)
                const newImagePath = scan.results?.originalImagePath || '';
                const prevImagePath = prevScan?.results?.originalImagePath || '';
                if (prevScan && prevImagePath && newImagePath && (loss > 0 || bareSoilInc > 0 || waterLoss > 0)) {
                    try {
                        const bboxArr = zone.bbox ? [zone.bbox.lng_min, zone.bbox.lat_min, zone.bbox.lng_max, zone.bbox.lat_max] : null;
                        const compareResult = await triggerComparisonAnalysis(prevImagePath, newImagePath, loss, alert._id.toString(), bboxArr);
                        if (compareResult) {
                            const updateData = {
                                changeType: compareResult.change_type,
                                probableCause: compareResult.probable_cause,
                                changedAreas: compareResult.changed_areas,
                                changeDescription: compareResult.change_description,
                                comparisonImagePath: compareResult.comparison_image_path,
                            };
                            if (compareResult.hotspot_lat && compareResult.hotspot_lng) {
                                updateData.hotspot = {
                                    lat: compareResult.hotspot_lat,
                                    lng: compareResult.hotspot_lng,
                                };
                            }
                            await Alert_1.default.findByIdAndUpdate(alert._id, updateData);
                            console.log(`[${alert._id}] Alert enriched with GPT-4o comparison & hotspot`);
                        }
                    }
                    catch (compareErr) {
                        console.error('Comparison enrichment failed:', compareErr);
                    }
                }
                // Email
                try {
                    await sendAlertEmail(zone.createdBy?.toString() || '', zone.name, loss, alertSeverity, threats, description);
                    await Alert_1.default.findByIdAndUpdate(alert._id, { emailSent: true });
                }
                catch (emailErr) {
                    console.error('Email failed:', emailErr);
                }
            }
        }
    }
    catch (err) {
        console.error('Error processing result message:', err);
    }
};
exports.processScanResult = processScanResult;
//# sourceMappingURL=consumer.js.map