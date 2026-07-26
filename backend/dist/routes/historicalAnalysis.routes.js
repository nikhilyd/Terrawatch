"use strict";
/**
 * Historical Analysis Routes (replaces ML service historical endpoints)
 * -----------------------------------------------------------------------
 * POST /api/historical/analyze → Multi-date historical analysis
 *   - Fetches Sentinel-2 images for 2-10 dates
 *   - Runs NDVI + GPT-4o on each
 *   - Generates timeline + AI verdict
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const sentinelHub_1 = require("../services/sentinelHub");
const ndvi_1 = require("../services/ndvi");
const visionAnalysis_1 = require("../services/visionAnalysis");
const imageService_1 = require("../services/imageService");
const geoCalculator_1 = require("../services/geoCalculator");
const router = (0, express_1.Router)();
router.post('/analyze', async (req, res) => {
    try {
        const { zone_id, bbox, dates, resolution = 20, max_cloud_pct = 50 } = req.body;
        if (!zone_id || !bbox || !dates || !Array.isArray(dates) || dates.length < 2 || dates.length > 10) {
            res.status(400).json({ success: false, message: 'zone_id, bbox, and 2-10 dates required' });
            return;
        }
        const MAX_CLOUD_PCT = 30.0;
        const results = [];
        let firstForestPct = null;
        for (const dateStr of dates) {
            const scanEntry = {
                date: dateStr,
                status: 'skipped',
                skip_reason: '',
                ndvi_mean: 0, forest_pct: 0, vegetation_pct: 0,
                water_pct: 0, bare_soil_pct: 0, cloud_pct: 0,
                threats: ['none'], severity: 'none', description: '',
                image_path: '', heatmap_path: '',
                delta_from_first: 0, loss_hectares: 0,
            };
            try {
                const target = new Date(dateStr);
                const dateFrom = new Date(target.getTime() - 30 * 86400000).toISOString().split('T')[0];
                const dateTo = dateStr;
                let imageData = await (0, sentinelHub_1.fetchImage)({ bbox, dateFrom, dateTo, resolution });
                // Validate
                const nirMean = Array.from(imageData.nir).reduce((a, b) => a + b, 0) / imageData.nir.length;
                if (nirMean < 0.01) {
                    scanEntry.skip_reason = 'Blank or invalid image';
                    results.push(scanEntry);
                    continue;
                }
                // Cloud pre-check
                const CLOUD_SCL = new Set([0, 3, 8, 9, 10]);
                let cloudPct = 0;
                if (imageData.scl) {
                    let cloudCount = 0;
                    for (let i = 0; i < imageData.scl.length; i++) {
                        if (CLOUD_SCL.has(imageData.scl[i]))
                            cloudCount++;
                    }
                    cloudPct = (cloudCount / imageData.scl.length) * 100;
                }
                // Auto-retry with forward window if cloudy
                if (cloudPct > MAX_CLOUD_PCT) {
                    const retryFrom = dateStr;
                    const retryTo = new Date(target.getTime() + 40 * 86400000).toISOString().split('T')[0];
                    try {
                        imageData = await (0, sentinelHub_1.fetchImage)({ bbox, dateFrom: retryFrom, dateTo: retryTo, resolution });
                        // Recalculate cloud pct
                        if (imageData.scl) {
                            let cloudCount = 0;
                            for (let i = 0; i < imageData.scl.length; i++) {
                                if (CLOUD_SCL.has(imageData.scl[i]))
                                    cloudCount++;
                            }
                            cloudPct = (cloudCount / imageData.scl.length) * 100;
                        }
                    }
                    catch {
                        scanEntry.skip_reason = `High cloud cover (${cloudPct.toFixed(0)}%) in both windows`;
                        results.push(scanEntry);
                        continue;
                    }
                }
                if (cloudPct > MAX_CLOUD_PCT) {
                    scanEntry.skip_reason = `High cloud cover — ${cloudPct.toFixed(0)}% pixels masked`;
                    results.push(scanEntry);
                    continue;
                }
                // NDVI
                const ndviResult = (0, ndvi_1.calculateNdvi)(imageData.nir, imageData.redRaw, imageData.scl);
                const jobId = `hist-${zone_id.slice(0, 8)}-${dateStr}-${(0, uuid_1.v4)().slice(0, 4)}`;
                // Save images
                const origPath = (0, imageService_1.saveImage)(imageData.rgb, 'original', jobId);
                let heatmapPath = '';
                try {
                    const heatmapBuf = await (0, ndvi_1.generateNdviHeatmap)(imageData.rgb, imageData.nir, imageData.width, imageData.height);
                    heatmapPath = (0, imageService_1.saveImage)(heatmapBuf, 'heatmap', jobId);
                }
                catch { }
                // Vision analysis
                const imageBase64 = (0, imageService_1.imageToBase64)(origPath);
                const vlResult = await (0, visionAnalysis_1.analyzeImage)(imageBase64);
                const forestPct = ndviResult.forestPct;
                if (firstForestPct === null)
                    firstForestPct = forestPct;
                const delta = Math.round(((firstForestPct || forestPct) - forestPct) * 100) / 100;
                const lossHa = (0, geoCalculator_1.calculateLossHectares)(bbox, firstForestPct || forestPct, forestPct);
                scanEntry.status = 'done';
                scanEntry.ndvi_mean = ndviResult.ndviMean;
                scanEntry.forest_pct = forestPct;
                scanEntry.vegetation_pct = ndviResult.vegetationPct;
                scanEntry.water_pct = ndviResult.waterPct;
                scanEntry.bare_soil_pct = ndviResult.bareSoilPct;
                scanEntry.cloud_pct = cloudPct;
                scanEntry.threats = vlResult.threats;
                scanEntry.severity = vlResult.severity;
                scanEntry.description = vlResult.description;
                scanEntry.image_path = origPath;
                scanEntry.heatmap_path = heatmapPath;
                scanEntry.delta_from_first = delta;
                scanEntry.loss_hectares = lossHa;
            }
            catch (err) {
                scanEntry.skip_reason = `Error: ${err?.message?.slice(0, 80) || 'unknown'}`;
            }
            results.push(scanEntry);
        }
        // Summary
        const doneScans = results.filter(r => r.status === 'done');
        let totalLossPct = 0, totalLossHa = 0, ratePerYear = 0, biggestDrop = 0, biggestDate = '';
        if (doneScans.length >= 2) {
            totalLossPct = Math.round((doneScans[0].forest_pct - doneScans[doneScans.length - 1].forest_pct) * 100) / 100;
            totalLossHa = (0, geoCalculator_1.calculateLossHectares)(bbox, doneScans[0].forest_pct, doneScans[doneScans.length - 1].forest_pct);
            const d1 = new Date(doneScans[0].date);
            const d2 = new Date(doneScans[doneScans.length - 1].date);
            const days = (d2.getTime() - d1.getTime()) / 86400000;
            ratePerYear = (0, geoCalculator_1.calculateAnnualRate)(totalLossHa, days);
            for (let i = 1; i < doneScans.length; i++) {
                const drop = doneScans[i - 1].forest_pct - doneScans[i].forest_pct;
                if (drop > biggestDrop) {
                    biggestDrop = drop;
                    biggestDate = doneScans[i].date;
                }
            }
        }
        // AI verdict
        let aiVerdict = 'Analysis complete.';
        if (doneScans.length >= 2) {
            const allThreats = [...new Set(doneScans.flatMap((s) => s.threats))];
            const verdictPrompt = `Historical satellite analysis of ${doneScans.length} scans over ` +
                `${doneScans[0].date} to ${doneScans[doneScans.length - 1].date}. ` +
                `Total forest loss: ${totalLossPct}% (${totalLossHa} hectares). ` +
                `Threats detected: ${allThreats.join(', ')}. ` +
                `Provide a 2-sentence professional verdict on the deforestation pattern and urgency.`;
            try {
                aiVerdict = await (0, visionAnalysis_1.generateVerdict)(verdictPrompt);
            }
            catch {
                if (totalLossPct > 20)
                    aiVerdict = `Critical deforestation: ${totalLossPct}% loss. Immediate investigation needed.`;
                else if (totalLossPct > 5)
                    aiVerdict = `Moderate forest loss: ${totalLossPct}%. Monitoring should continue.`;
                else
                    aiVerdict = `Minimal change (${totalLossPct}%). Area appears stable.`;
            }
        }
        res.json({
            zone_id,
            scan_count: doneScans.length,
            scans: results,
            summary: {
                total_loss_pct: totalLossPct,
                total_loss_ha: totalLossHa,
                rate_per_year: ratePerYear,
                biggest_drop_pct: Math.round(biggestDrop * 100) / 100,
                biggest_drop_date: biggestDate,
                scans_done: doneScans.length,
                scans_skipped: results.length - doneScans.length,
            },
            ai_verdict: aiVerdict,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message });
    }
});
exports.default = router;
//# sourceMappingURL=historicalAnalysis.routes.js.map