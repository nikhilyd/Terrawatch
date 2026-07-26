"use strict";
/**
 * Report Controller
 * -----------------
 * Feature 1: PDF Report Generator
 * Government-ready PDF with forest trends, NDVI stats, AI analysis, alerts history.
 *
 * GET /api/reports/zone/:id          → Download PDF for a zone
 * GET /api/reports/zone/:id/trend    → JSON trend data (for charts)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailZoneReport = exports.downloadZoneReport = exports.getForestTrend = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const Scan_1 = __importDefault(require("../models/Scan"));
const Zone_1 = __importDefault(require("../models/Zone"));
const Alert_1 = __importDefault(require("../models/Alert"));
const env_1 = __importDefault(require("../config/env"));
// ── Feature 3: Forest Trend API ──────────────────────────────────────────────
// GET /api/reports/zone/:id/trend?months=12
const getForestTrend = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        const months = parseInt(req.query.months) || 12;
        // Last N months ke completed scans
        const since = new Date();
        since.setMonth(since.getMonth() - months);
        const scans = await Scan_1.default.find({
            zoneId: req.params.id,
            status: 'completed',
            createdAt: { $gte: since },
        }).sort({ createdAt: 1 });
        // Monthly data points banao
        const trendData = scans.map(s => ({
            date: s.scanDate?.toISOString().split('T')[0] || s.createdAt.toISOString().split('T')[0],
            forestPct: s.results?.forestPercentage ?? 0,
            vegetationPct: s.results?.vegetationPercentage ?? 0,
            bareSoilPct: s.results?.bareSoilPercentage ?? 0,
            waterPct: s.results?.waterPercentage ?? 0,
            ndviMean: s.results?.ndviMean ?? 0,
            threats: s.results?.threats ?? [],
            severity: s.results?.severity ?? 'none',
            deforestation: s.results?.deforestationDetected ?? false,
        }));
        // Summary stats
        const forestValues = trendData.map(d => d.forestPct).filter(v => v > 0);
        const summary = {
            currentForestPct: forestValues[forestValues.length - 1] ?? 0,
            peakForestPct: Math.max(...forestValues, 0),
            lowestForestPct: Math.min(...forestValues, 100),
            totalLoss: forestValues.length > 1
                ? parseFloat((forestValues[0] - forestValues[forestValues.length - 1]).toFixed(2))
                : 0,
            totalScans: scans.length,
            alertCount: await Alert_1.default.countDocuments({ zoneId: req.params.id }),
        };
        res.json({
            success: true,
            zone: { id: zone._id, name: zone.name, area_km2: zone.area_km2 },
            summary,
            trend: trendData,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err });
    }
};
exports.getForestTrend = getForestTrend;
// ── Feature 1: PDF Report Generator ─────────────────────────────────────────
// GET /api/reports/zone/:id
const downloadZoneReport = async (req, res) => {
    try {
        const zone = await Zone_1.default.findById(req.params.id).populate('createdBy', 'name email');
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        // Last 6 months data
        const since = new Date();
        since.setMonth(since.getMonth() - 6);
        const [scans, alerts] = await Promise.all([
            Scan_1.default.find({ zoneId: req.params.id, status: 'completed', createdAt: { $gte: since } })
                .sort({ createdAt: -1 }).limit(20),
            Alert_1.default.find({ zoneId: req.params.id, createdAt: { $gte: since } })
                .sort({ createdAt: -1 }).limit(10),
        ]);
        const latestScan = scans[0];
        const oldestScan = scans[scans.length - 1];
        const forestLoss = (oldestScan && latestScan)
            ? parseFloat((oldestScan.results?.forestPercentage - latestScan.results?.forestPercentage).toFixed(2))
            : 0;
        // ── Build PDF ──────────────────────────────────────────────────────────
        const doc = new pdfkit_1.default({ margin: 50, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="EcoWatch_Report_${zone.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`);
        doc.pipe(res);
        const DARK_GREEN = '#1a4a2e';
        const MED_GREEN = '#2d7a4f';
        const LIGHT_GREEN = '#e8f5e9';
        const RED = '#c62828';
        const ORANGE = '#e65100';
        const GRAY = '#546e7a';
        // ── Header ──────────────────────────────────────────────────────────────
        doc.rect(0, 0, doc.page.width, 110).fill(DARK_GREEN);
        doc.fillColor('white').fontSize(26).font('Helvetica-Bold')
            .text('ECOWATCH', 50, 25);
        doc.fontSize(11).font('Helvetica')
            .text('Deforestation Monitoring & Environmental Intelligence System', 50, 58);
        doc.fontSize(9).fillColor('#a5d6a7')
            .text(`Report Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}   |   Confidential`, 50, 80);
        doc.fontSize(9).fillColor('#a5d6a7')
            .text('Powered by Sentinel-2 Satellite Data + GPT-4o Vision AI Analysis', 50, 95);
        doc.fillColor('black').moveDown(3);
        // ── Zone Info Box ────────────────────────────────────────────────────────
        const boxTop = 130;
        doc.rect(40, boxTop, doc.page.width - 80, 90).fill(LIGHT_GREEN).stroke(MED_GREEN);
        doc.fillColor(DARK_GREEN).fontSize(15).font('Helvetica-Bold')
            .text(`Zone: ${zone.name}`, 55, boxTop + 12);
        doc.fontSize(9).font('Helvetica').fillColor(GRAY)
            .text(`Area: ${zone.area_km2 > 0 ? zone.area_km2.toFixed(2) + ' km²' : 'Not specified'}`, 55, boxTop + 35)
            .text(`Coordinates: ${zone.coordinates?.lat?.toFixed(4)}, ${zone.coordinates?.lng?.toFixed(4)}`, 55, boxTop + 50)
            .text(`BBox: [${zone.bbox?.lng_min}, ${zone.bbox?.lat_min}, ${zone.bbox?.lng_max}, ${zone.bbox?.lat_max}]`, 55, boxTop + 65)
            .text(`Alert Threshold: ${zone.alertThreshold}% forest loss`, 300, boxTop + 35)
            .text(`Total Scans (6mo): ${scans.length}`, 300, boxTop + 50)
            .text(`Alerts Triggered: ${alerts.length}`, 300, boxTop + 65);
        doc.moveDown(7);
        // ── Current Status Banner ────────────────────────────────────────────────
        doc.y = boxTop + 105;
        const statusColor = forestLoss > 15 ? RED : forestLoss > 5 ? ORANGE : MED_GREEN;
        const statusText = forestLoss > 15 ? 'CRITICAL DEFORESTATION' : forestLoss > 5 ? 'MODERATE LOSS' : 'STABLE';
        doc.rect(40, doc.y, doc.page.width - 80, 55).fill(statusColor);
        doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
            .text('CURRENT STATUS', 55, doc.y - 45);
        doc.fontSize(20)
            .text(statusText, 55, doc.y - 28);
        doc.fontSize(10).font('Helvetica')
            .text(`Forest Coverage: ${latestScan?.results?.forestPercentage?.toFixed(1) ?? 'N/A'}%   |   6-Month Loss: ${forestLoss}%   |   Threats: ${(latestScan?.results?.threats ?? []).join(', ') || 'None'}`, 55, doc.y - 10);
        doc.moveDown(5);
        // ── NDVI Stats Table ─────────────────────────────────────────────────────
        doc.y += 15;
        doc.fillColor(DARK_GREEN).fontSize(13).font('Helvetica-Bold').text('LATEST NDVI ANALYSIS', 50);
        doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(MED_GREEN);
        doc.moveDown(0.8);
        if (latestScan) {
            const r = latestScan.results;
            const cols = [
                { label: 'Forest Coverage', value: `${r?.forestPercentage?.toFixed(1)}%`, color: DARK_GREEN },
                { label: 'Vegetation', value: `${r?.vegetationPercentage?.toFixed(1)}%`, color: MED_GREEN },
                { label: 'Bare Soil', value: `${r?.bareSoilPercentage?.toFixed(1)}%`, color: ORANGE },
                { label: 'Water Bodies', value: `${r?.waterPercentage?.toFixed(1)}%`, color: '#1565c0' },
                { label: 'NDVI Mean', value: `${r?.ndviMean?.toFixed(3)}`, color: MED_GREEN },
                { label: 'AI Confidence', value: `${r?.vlConfidence ?? 'N/A'}`, color: GRAY },
            ];
            const colW = (doc.page.width - 100) / 3;
            cols.forEach((col, i) => {
                const x = 50 + (i % 3) * colW;
                const y = doc.y + Math.floor(i / 3) * 38;
                doc.rect(x, y, colW - 10, 32).fill('#f9fbe7').stroke('#c8e6c9');
                doc.fontSize(8).font('Helvetica').fillColor(GRAY).text(col.label, x + 8, y + 5, { width: colW - 20 });
                doc.fontSize(14).font('Helvetica-Bold').fillColor(col.color).text(col.value, x + 8, y + 14, { width: colW - 20 });
            });
            doc.y += 90;
        }
        doc.moveDown(1);
        // ── AI Analysis Description ──────────────────────────────────────────────
        if (latestScan?.results?.description) {
            doc.fillColor(DARK_GREEN).fontSize(13).font('Helvetica-Bold').text('AI THREAT ANALYSIS (GPT-4o Vision)', 50);
            doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(MED_GREEN);
            doc.moveDown(0.5);
            doc.rect(50, doc.y, doc.page.width - 100, 70).fill('#fff8e1').stroke('#ffe082');
            doc.fontSize(9).font('Helvetica').fillColor('#4a4a4a')
                .text(latestScan.results.description || 'No AI description available.', 62, doc.y + 8, {
                width: doc.page.width - 124, lineGap: 3
            });
            doc.y += 80;
            doc.moveDown(0.5);
        }
        // ── Scan History Table ───────────────────────────────────────────────────
        doc.addPage();
        doc.rect(0, 0, doc.page.width, 50).fill(DARK_GREEN);
        doc.fillColor('white').fontSize(13).font('Helvetica-Bold').text('SCAN HISTORY (Last 6 Months)', 50, 18);
        doc.y = 70;
        // Table header
        const tCols = ['Date', 'Forest %', 'Vegetation %', 'Threats', 'Severity'];
        const tWidths = [90, 75, 90, 180, 75];
        let tx = 40;
        doc.rect(40, doc.y, doc.page.width - 80, 20).fill(MED_GREEN);
        tCols.forEach((col, i) => {
            doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(col, tx + 4, doc.y - 15, { width: tWidths[i] });
            tx += tWidths[i];
        });
        doc.y += 8;
        scans.slice(0, 15).forEach((s, idx) => {
            if (doc.y > 720) {
                doc.addPage();
                doc.y = 50;
            }
            const rowColor = idx % 2 === 0 ? '#f5f5f5' : 'white';
            doc.rect(40, doc.y, doc.page.width - 80, 18).fill(rowColor);
            tx = 40;
            const rowData = [
                s.scanDate?.toLocaleDateString('en-IN') ?? 'N/A',
                `${s.results?.forestPercentage?.toFixed(1) ?? 'N/A'}%`,
                `${s.results?.vegetationPercentage?.toFixed(1) ?? 'N/A'}%`,
                (s.results?.threats ?? []).join(', ') || 'None',
                s.results?.severity ?? 'N/A',
            ];
            rowData.forEach((val, i) => {
                const textColor = (i === 4 && val === 'high') ? RED : (i === 4 && val === 'medium') ? ORANGE : '#333';
                doc.fillColor(textColor).fontSize(7.5).font('Helvetica').text(val, tx + 4, doc.y - 13, { width: tWidths[i] - 6 });
                tx += tWidths[i];
            });
            doc.y += 5;
        });
        doc.moveDown(2);
        // ── Alerts Section ───────────────────────────────────────────────────────
        if (alerts.length > 0) {
            doc.fillColor(DARK_GREEN).fontSize(13).font('Helvetica-Bold').text('ALERT HISTORY', 50);
            doc.moveTo(50, doc.y + 3).lineTo(doc.page.width - 50, doc.y + 3).stroke(RED);
            doc.moveDown(0.8);
            alerts.slice(0, 8).forEach((alert) => {
                if (doc.y > 720) {
                    doc.addPage();
                    doc.y = 50;
                }
                const sevColor = alert.severity === 'CRITICAL' ? RED : alert.severity === 'HIGH' ? ORANGE : MED_GREEN;
                doc.rect(50, doc.y, doc.page.width - 100, 50).fill('#fff8f8').stroke(sevColor);
                doc.fontSize(8).font('Helvetica-Bold').fillColor(sevColor)
                    .text(`[${alert.severity}] Forest Loss: ${alert.forestLoss}%`, 62, doc.y - 42);
                doc.fontSize(7.5).font('Helvetica').fillColor('#555')
                    .text(alert.message, 62, doc.y - 29, { width: doc.page.width - 130, lineGap: 2 });
                if (alert.changeDescription) {
                    doc.fillColor('#333').text(`AI: ${alert.changeDescription}`, 62, doc.y - 16, { width: doc.page.width - 130 });
                }
                doc.fillColor(GRAY).text(new Date(alert.createdAt).toLocaleDateString('en-IN'), doc.page.width - 130, doc.y - 42);
                doc.y += 15;
            });
        }
        // ── Footer ───────────────────────────────────────────────────────────────
        doc.rect(0, doc.page.height - 50, doc.page.width, 50).fill(DARK_GREEN);
        doc.fillColor('#a5d6a7').fontSize(8)
            .text('EcoWatch — AI-Powered Deforestation Monitoring System', 50, doc.page.height - 35)
            .text('This report is generated using Sentinel-2 satellite imagery and GPT-4o Vision AI analysis. Data is for environmental monitoring purposes.', 50, doc.page.height - 22, { width: doc.page.width - 100 });
        doc.end();
    }
    catch (err) {
        if (!res.headersSent)
            res.status(500).json({ success: false, error: String(err) });
    }
};
exports.downloadZoneReport = downloadZoneReport;
// ── Feature 2: Rich Email Report ─────────────────────────────────────────────
// POST /api/reports/zone/:id/email  — Zone report email bhejo
const emailZoneReport = async (req, res) => {
    try {
        const { toEmail } = req.body;
        if (!toEmail) {
            res.status(400).json({ success: false, message: 'toEmail required' });
            return;
        }
        const zone = await Zone_1.default.findById(req.params.id);
        if (!zone) {
            res.status(404).json({ success: false, message: 'Zone not found' });
            return;
        }
        const since = new Date();
        since.setMonth(since.getMonth() - 3);
        const [latestScan, alertCount, alerts] = await Promise.all([
            Scan_1.default.findOne({ zoneId: req.params.id, status: 'completed' }).sort({ createdAt: -1 }),
            Alert_1.default.countDocuments({ zoneId: req.params.id }),
            Alert_1.default.find({ zoneId: req.params.id }).sort({ createdAt: -1 }).limit(5),
        ]);
        const recentAlerts = alerts.map(a => `<tr>
        <td style="padding:6px;border-bottom:1px solid #eee;color:${a.severity === 'CRITICAL' ? '#c62828' : a.severity === 'HIGH' ? '#e65100' : '#2d7a4f'};font-weight:bold">${a.severity}</td>
        <td style="padding:6px;border-bottom:1px solid #eee">${a.forestLoss}% loss</td>
        <td style="padding:6px;border-bottom:1px solid #eee;font-size:11px">${a.message.slice(0, 80)}...</td>
        <td style="padding:6px;border-bottom:1px solid #eee;color:#888;font-size:11px">${new Date(a.createdAt).toLocaleDateString('en-IN')}</td>
      </tr>`).join('');
        const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f0f4f0">
  <div style="max-width:650px;margin:20px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.15)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a4a2e,#2d7a4f);padding:35px 40px;text-align:center">
      <h1 style="color:white;margin:0;font-size:28px;letter-spacing:2px">🌍 ECOWATCH</h1>
      <p style="color:#a5d6a7;margin:8px 0 0;font-size:13px">Deforestation Monitoring & Environmental Intelligence Report</p>
    </div>

    <!-- Zone Banner -->
    <div style="background:#e8f5e9;padding:20px 40px;border-bottom:3px solid #2d7a4f">
      <h2 style="color:#1a4a2e;margin:0;font-size:18px">Zone: ${zone.name}</h2>
      <p style="color:#555;margin:6px 0 0;font-size:12px">
        Report Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
        &nbsp;|&nbsp; Area: ${zone.area_km2 > 0 ? zone.area_km2.toFixed(1) + ' km²' : 'N/A'}
        &nbsp;|&nbsp; Total Alerts: ${alertCount}
      </p>
    </div>

    <div style="background:white;padding:30px 40px">

      <!-- Stats Grid -->
      <h3 style="color:#1a4a2e;border-bottom:2px solid #e8f5e9;padding-bottom:8px">Current Forest Status</h3>
      <table width="100%" cellspacing="10">
        <tr>
          <td style="background:#e8f5e9;border-radius:8px;padding:16px;text-align:center;width:25%">
            <div style="font-size:26px;font-weight:bold;color:#1a4a2e">${latestScan?.results?.forestPercentage?.toFixed(1) ?? 'N/A'}%</div>
            <div style="font-size:11px;color:#555;margin-top:4px">Forest Coverage</div>
          </td>
          <td style="background:#fff3e0;border-radius:8px;padding:16px;text-align:center;width:25%">
            <div style="font-size:26px;font-weight:bold;color:#e65100">${latestScan?.results?.bareSoilPercentage?.toFixed(1) ?? 'N/A'}%</div>
            <div style="font-size:11px;color:#555;margin-top:4px">Bare Soil</div>
          </td>
          <td style="background:#e3f2fd;border-radius:8px;padding:16px;text-align:center;width:25%">
            <div style="font-size:26px;font-weight:bold;color:#1565c0">${latestScan?.results?.waterPercentage?.toFixed(1) ?? 'N/A'}%</div>
            <div style="font-size:11px;color:#555;margin-top:4px">Water Bodies</div>
          </td>
          <td style="background:#f3e5f5;border-radius:8px;padding:16px;text-align:center;width:25%">
            <div style="font-size:26px;font-weight:bold;color:#6a1b9a">${latestScan?.results?.ndviMean?.toFixed(3) ?? 'N/A'}</div>
            <div style="font-size:11px;color:#555;margin-top:4px">NDVI Mean</div>
          </td>
        </tr>
      </table>

      <!-- Threats -->
      ${latestScan?.results?.threats && latestScan.results.threats.length > 0 && latestScan.results.threats[0] !== 'none' ? `
      <div style="margin-top:20px;background:#ffebee;border-left:4px solid #c62828;padding:15px 20px;border-radius:4px">
        <strong style="color:#c62828">⚠️ Active Threats Detected:</strong>
        <span style="color:#555;margin-left:8px">${latestScan.results.threats.join(' | ')}</span>
        <div style="margin-top:6px;font-size:12px;color:#555">${latestScan.results.description || ''}</div>
      </div>` : `
      <div style="margin-top:20px;background:#e8f5e9;border-left:4px solid #2d7a4f;padding:15px 20px;border-radius:4px">
        <strong style="color:#2d7a4f">✅ No Active Threats Detected</strong>
        <div style="margin-top:6px;font-size:12px;color:#555">${latestScan?.results?.description || 'Zone appears healthy.'}</div>
      </div>`}

      <!-- Recent Alerts Table -->
      ${recentAlerts ? `
      <h3 style="color:#1a4a2e;border-bottom:2px solid #e8f5e9;padding-bottom:8px;margin-top:25px">Recent Alerts</h3>
      <table width="100%" style="border-collapse:collapse;font-size:12px">
        <tr style="background:#e8f5e9">
          <th style="padding:8px;text-align:left">Severity</th>
          <th style="padding:8px;text-align:left">Loss</th>
          <th style="padding:8px;text-align:left">Details</th>
          <th style="padding:8px;text-align:left">Date</th>
        </tr>
        ${recentAlerts}
      </table>` : ''}

    </div>

    <!-- Footer -->
    <div style="background:#1a4a2e;padding:20px 40px;text-align:center">
      <p style="color:#a5d6a7;margin:0;font-size:11px">
        This report is generated automatically by EcoWatch using Sentinel-2 satellite imagery<br>
         and GPT-4o Vision AI analysis. For environmental monitoring purposes only.
      </p>
      <p style="color:#4caf50;margin:8px 0 0;font-size:10px">
        © EcoWatch Deforestation Monitoring System
      </p>
    </div>
  </div>
</body>
</html>`;
        if (!env_1.default.SMTP_USER || !env_1.default.SMTP_PASS) {
            res.status(503).json({ success: false, message: 'SMTP not configured. Set SMTP_USER and SMTP_PASS in .env' });
            return;
        }
        const transporter = nodemailer_1.default.createTransport({
            host: env_1.default.SMTP_HOST,
            port: env_1.default.SMTP_PORT,
            auth: { user: env_1.default.SMTP_USER, pass: env_1.default.SMTP_PASS },
        });
        await transporter.sendMail({
            from: `"EcoWatch Reports" <${env_1.default.SMTP_USER}>`,
            to: toEmail,
            subject: `[EcoWatch] Zone Report: ${zone.name} — ${new Date().toLocaleDateString('en-IN')}`,
            html: htmlBody,
        });
        res.json({ success: true, message: `Report emailed to ${toEmail}` });
    }
    catch (err) {
        res.status(500).json({ success: false, error: String(err) });
    }
};
exports.emailZoneReport = emailZoneReport;
//# sourceMappingURL=report.controller.js.map