/**
 * Legal & Intelligence Controller
 * --------------------------------
 * Feature 1: Carbon Loss Calculator  — GET /api/legal/zone/:id/carbon
 * Feature 2: FIR-Ready Legal Report  — GET /api/legal/zone/:id/fir
 * Feature 3: Zone Risk Score         — GET /api/legal/zone/:id/risk
 *             All Zones Risk         — GET /api/legal/risk-scores
 *
 * Data Source Priority:
 *   1. HistoricalAnalysis model (primary — rich NDVI + SCL data)
 *   2. Scan model (fallback — campaign monitoring scans)
 */

import { Response }      from 'express';
import PDFDocument        from 'pdfkit';
import Scan               from '../models/Scan';
import Zone               from '../models/Zone';
import Alert              from '../models/Alert';
import HistoricalAnalysis, { IHistoricalScan } from '../models/HistoricalAnalysis';
import { AuthRequest }    from '../middleware/auth.middleware';

// ── Constants ────────────────────────────────────────────────────────────────
const TREES_PER_KM2      = 40_000;
const CO2_PER_TREE_TONNE = 0.022;
const CARBON_CREDIT_USD  = 15;
const USD_TO_INR         = 83.5;
const CAMPA_RATE_INR     = 1_000;

// ── Helper: Carbon loss calculation ─────────────────────────────────────────
const calcCarbonLoss = (deforestedKm2: number) => {
  const treesLost    = deforestedKm2 * TREES_PER_KM2;
  const co2Tonnes    = parseFloat((treesLost * CO2_PER_TREE_TONNE).toFixed(2));
  const valueUSD     = parseFloat((co2Tonnes * CARBON_CREDIT_USD).toFixed(2));
  const valueINR     = parseFloat((co2Tonnes * CAMPA_RATE_INR).toFixed(2));
  const valueLakhINR = parseFloat((valueINR / 100_000).toFixed(2));
  return { treesLost: Math.round(treesLost), co2Tonnes, valueUSD, valueINR, valueLakhINR };
};

// ── Helper: Risk Score ───────────────────────────────────────────────────────
const calcRiskScore = (
  ndviLossPct:    number,
  alertCount:     number,
  latestSeverity: string,
): { score: number; level: string; color: string } => {
  const ndviScore  = Math.min(40, ndviLossPct * 2.5);
  const alertScore = Math.min(30, alertCount * 5);
  const sevMap: Record<string, number> = { none: 0, low: 8, medium: 15, high: 23, critical: 30 };
  const sevScore   = sevMap[latestSeverity?.toLowerCase()] ?? 0;
  const score      = Math.round(ndviScore + alertScore + sevScore);

  let level = 'LOW'; let color = '#2d7a4f';
  if (score >= 75) { level = 'CRITICAL'; color = '#c62828'; }
  else if (score >= 50) { level = 'HIGH';   color = '#e65100'; }
  else if (score >= 25) { level = 'MEDIUM'; color = '#f9a825'; }
  return { score, level, color };
};

// ── Helper: Get latest HistoricalAnalysis for a zone ─────────────────────────
interface HistoricalData {
  analysis:    any;
  doneScan:    IHistoricalScan[];
  latestScan:  IHistoricalScan;
  oldestScan:  IHistoricalScan;
  lossPct:     number;
  lossHa:      number;
  lossKm2:     number;
}

const getHistoricalData = async (zoneId: string): Promise<HistoricalData | null> => {
  const analysis = await HistoricalAnalysis
    .findOne({ zoneId })
    .sort({ createdAt: -1 });

  if (!analysis) return null;

  const doneScan = analysis.scans.filter((s: IHistoricalScan) => s.status === 'done');
  if (doneScan.length < 1) return null;

  return {
    analysis,
    doneScan,
    latestScan: doneScan[doneScan.length - 1],
    oldestScan: doneScan[0],
    lossPct:    analysis.summary?.total_loss_pct ?? 0,
    lossHa:     analysis.summary?.total_loss_ha  ?? 0,
    lossKm2:    parseFloat(((analysis.summary?.total_loss_ha ?? 0) / 100).toFixed(4)),
  };
};


// ── Feature 1: Carbon Loss Calculator ───────────────────────────────────────
// GET /api/legal/zone/:id/carbon
export const getCarbonLoss = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    // ── Primary: HistoricalAnalysis ──────────────────────────────────────────
    const hist = await getHistoricalData(req.params.id);

    if (hist && hist.doneScan.length >= 2) {
      const carbon = calcCarbonLoss(hist.lossKm2);
      res.json({
        success: true,
        data: {
          zone:          { id: zone._id, name: zone.name, area_km2: zone.area_km2 ?? 0 },
          dataSource:    'historical_analysis',
          period: {
            from:   hist.oldestScan.date,
            to:     hist.latestScan.date,
            scans:  hist.doneScan.length,
            skipped: hist.analysis.summary?.scans_skipped ?? 0,
          },
          deforestation: {
            forestLossPct: parseFloat(hist.lossPct.toFixed(2)),
            deforestedKm2: hist.lossKm2,
            deforestedHa:  parseFloat(hist.lossHa.toFixed(2)),
          },
          carbonImpact: {
            treesLost:      carbon.treesLost,
            co2TonnesLost:  carbon.co2Tonnes,
            economicDamage: {
              usd:      carbon.valueUSD,
              inr:      carbon.valueINR,
              inrLakhs: carbon.valueLakhINR,
              basis:    `₹${CAMPA_RATE_INR}/tonne (CAMPA rate) | $${CARBON_CREDIT_USD}/tonne (international)`,
            },
          },
          note: 'Estimates based on avg tropical forest density (40,000 trees/km²) and 22kg CO₂/tree/year',
        },
      });
      return;
    }

    // ── Fallback: Scan model (campaign scans) ────────────────────────────────
    const scans = await Scan.find({ zoneId: req.params.id, status: 'completed' })
      .sort({ createdAt: -1 }).limit(20);

    if (scans.length < 2) {
      res.json({ success: true, message: 'Need at least 2 completed scans for carbon calculation', data: null });
      return;
    }

    const latest      = scans[0];
    const oldest      = scans[scans.length - 1];
    const lossPct     = Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0));
    const totalKm2    = zone.area_km2 || 10;
    const deforestedKm2 = parseFloat(((lossPct / 100) * totalKm2).toFixed(4));
    const carbon      = calcCarbonLoss(deforestedKm2);

    res.json({
      success: true,
      data: {
        zone:          { id: zone._id, name: zone.name, area_km2: totalKm2 },
        dataSource:    'campaign_scan',
        period:        { from: oldest.scanDate?.toISOString().split('T')[0], to: latest.scanDate?.toISOString().split('T')[0], scans: scans.length },
        deforestation: { forestLossPct: parseFloat(lossPct.toFixed(2)), deforestedKm2, deforestedHa: parseFloat((deforestedKm2 * 100).toFixed(2)) },
        carbonImpact:  { treesLost: carbon.treesLost, co2TonnesLost: carbon.co2Tonnes, economicDamage: { usd: carbon.valueUSD, inr: carbon.valueINR, inrLakhs: carbon.valueLakhINR, basis: `₹${CAMPA_RATE_INR}/tonne (CAMPA) | $${CARBON_CREDIT_USD}/tonne (intl)` } },
        note:          'Estimates based on avg tropical forest density (40,000 trees/km²) and 22kg CO₂/tree/year',
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── Feature 3: Zone Risk Score ───────────────────────────────────────────────
// GET /api/legal/zone/:id/risk
export const getZoneRiskScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    const since3months = new Date();
    since3months.setMonth(since3months.getMonth() - 3);
    const alertCount = await Alert.countDocuments({ zoneId: req.params.id, createdAt: { $gte: since3months } });

    // ── Primary: HistoricalAnalysis ──────────────────────────────────────────
    const hist = await getHistoricalData(req.params.id);

    const lossPct        = hist?.lossPct        ?? 0;
    const latestSeverity = hist?.latestScan?.severity ?? 'none';
    const risk           = calcRiskScore(lossPct, alertCount, latestSeverity);

    const latestThreats  = (hist?.latestScan?.threats ?? []).filter((t: string) => t && t !== 'none');

    res.json({
      success: true,
      data: {
        zone:      { id: zone._id, name: zone.name, area_km2: zone.area_km2 ?? 0 },
        dataSource: hist ? 'historical_analysis' : 'no_data',
        riskScore:  risk.score,
        riskLevel:  risk.level,
        breakdown: {
          ndviLoss:      parseFloat(lossPct.toFixed(2)),
          alerts3mo:     alertCount,
          latestThreat:  latestSeverity,
          threats:       latestThreats,
          ndviMean:      hist?.latestScan?.ndvi_mean      ?? 0,
          forestPct:     hist?.latestScan?.forest_pct     ?? 0,
          scansDone:     hist?.doneScan?.length            ?? 0,
          scansSkipped:  hist?.analysis?.summary?.scans_skipped ?? 0,
          lastScanDate:  hist?.latestScan?.date            ?? null,
          totalLossHa:   hist?.lossHa                      ?? 0,
        },
        recommendation:
          risk.level === 'CRITICAL' ? 'IMMEDIATE ground inspection and legal action required!' :
          risk.level === 'HIGH'     ? 'Schedule ground verification within 7 days.' :
          risk.level === 'MEDIUM'   ? 'Monitor closely — increase scan frequency.' :
                                      'Zone is stable — routine monitoring sufficient.',
        lastScan: hist?.latestScan?.date ?? null,
      },
    });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── GET /api/legal/risk-scores — All zones ranked by risk ───────────────────
export const getAllRiskScores = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zones        = await Zone.find({ isActive: true });
    const since3months = new Date();
    since3months.setMonth(since3months.getMonth() - 3);

    const results = await Promise.all(zones.map(async (zone) => {
      const [hist, alertCount] = await Promise.all([
        HistoricalAnalysis
          .findOne({ zoneId: zone._id })
          .sort({ createdAt: -1 })
          .select('summary scans ai_verdict'),
        Alert.countDocuments({ zoneId: zone._id, createdAt: { $gte: since3months } }),
      ]);

      const doneScan       = (hist?.scans ?? []).filter((s: IHistoricalScan) => s.status === 'done');
      const latestScan     = doneScan[doneScan.length - 1];
      const lossPct        = hist?.summary?.total_loss_pct ?? 0;
      const latestSeverity = latestScan?.severity ?? 'none';
      const risk           = calcRiskScore(lossPct, alertCount, latestSeverity);

      return {
        zoneId:      zone._id,
        zoneName:    zone.name,
        area_km2:    zone.area_km2 ?? 0,
        riskScore:   risk.score,
        riskLevel:   risk.level,
        forestPct:   latestScan?.forest_pct ?? null,
        ndviLoss:    parseFloat(lossPct.toFixed(2)),
        alerts3mo:   alertCount,
        lastScan:    latestScan?.date ?? null,
        scansDone:   doneScan.length,
        hasData:     doneScan.length >= 2,
      };
    }));

    results.sort((a, b) => b.riskScore - a.riskScore);
    res.json({ success: true, count: results.length, data: results });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};


// ── Feature 2: FIR-Ready Legal Evidence Report ──────────────────────────────
// GET /api/legal/zone/:id/fir
export const downloadFIRReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const zone = await Zone.findById(req.params.id).populate('createdBy', 'name email');
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    // ── Data sources ─────────────────────────────────────────────────────────
    const [hist, alerts] = await Promise.all([
      getHistoricalData(req.params.id),
      Alert.find({ zoneId: req.params.id }).sort({ createdAt: -1 }).limit(10),
    ]);

    // Fallback scan data
    const scans = hist ? [] : await Scan.find({ zoneId: req.params.id, status: 'completed' })
      .sort({ createdAt: -1 }).limit(10);

    // Compute loss
    let lossPct     = 0;
    let lossKm2     = 0;
    let lossHa      = 0;

    if (hist && hist.doneScan.length >= 2) {
      lossPct = hist.lossPct;
      lossKm2 = hist.lossKm2;
      lossHa  = hist.lossHa;
    } else if (scans.length >= 2) {
      const oldest   = scans[scans.length - 1];
      const latest   = scans[0];
      const totalKm2 = zone.area_km2 || 10;
      lossPct  = Math.max(0, (oldest.results?.forestPercentage ?? 0) - (latest.results?.forestPercentage ?? 0));
      lossKm2  = parseFloat(((lossPct / 100) * totalKm2).toFixed(4));
      lossHa   = parseFloat((lossKm2 * 100).toFixed(2));
    }

    const carbon   = calcCarbonLoss(lossKm2);
    const caseRef  = `ECO-${Date.now().toString().slice(-8)}`;
    const today    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── PDF Setup ─────────────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 55, size: 'A4' });
    res.setHeader('Content-Type',        'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="FIR_Evidence_${zone.name.replace(/\s+/g, '_')}_${caseRef}.pdf"`);
    doc.pipe(res);

    const DARK  = '#1a1a2e';
    const RED   = '#c62828';
    const BLUE  = '#0d47a1';
    const GREEN = '#1b5e20';
    const GRAY  = '#546e7a';
    const LGRAY = '#f5f5f5';

    // ── TOP BORDER ───────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 8).fill(RED);

    // ── HEADER ──────────────────────────────────────────────────────────────
    doc.fillColor(DARK).fontSize(10).font('Helvetica').text('GOVERNMENT OF INDIA', { align: 'center' });
    doc.fontSize(8).fillColor(GRAY).text('Ministry of Environment, Forest and Climate Change', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).lineWidth(1.5).stroke(RED);
    doc.moveDown(0.3);
    doc.fillColor(DARK).fontSize(18).font('Helvetica-Bold').text('FOREST CRIME EVIDENCE REPORT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor(RED).text('(For Submission to Competent Authority / Forest Court)', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(55, doc.y).lineTo(doc.page.width - 55, doc.y).lineWidth(1.5).stroke(RED);
    doc.moveDown(0.6);

    // ── CASE HEADER ──────────────────────────────────────────────────────────
    doc.rect(55, doc.y, doc.page.width - 110, 48).fill(LGRAY).stroke('#cccccc');
    const ch = doc.y;
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
       .text(`Case Reference No.: ${caseRef}`, 65, ch + 7)
       .text(`Date of Report: ${today}`, 65, ch + 22)
       .text(`Classification: CONFIDENTIAL — OFFICIAL USE ONLY`, 65, ch + 37);
    doc.fontSize(9).font('Helvetica-Bold').fillColor(RED)
       .text(`Detection Method: AI Satellite Monitoring (EcoWatch)`, 300, ch + 7)
       .text(`Satellite Source: Sentinel-2 L2A (ESA Copernicus)`, 300, ch + 22)
       .text(`AI Model: Qwen2-VL + NDVI + SCL Cloud Masking`, 300, ch + 37);
    doc.y = ch + 60;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const section = (title: string) => {
      doc.moveDown(0.5);
      doc.rect(55, doc.y, doc.page.width - 110, 18).fill(DARK);
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text(`  ${title}`, 58, doc.y - 13);
      doc.y += 8;
      doc.fillColor(DARK).font('Helvetica');
    };

    const field = (label: string, value: string, x = 65) => {
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(GRAY).text(`${label}:`, x, doc.y, { continued: true, width: 160 });
      doc.font('Helvetica').fillColor(DARK).text(`  ${value}`, { lineGap: 1 });
    };

    // ── SECTION 1: LOCATION ──────────────────────────────────────────────────
    section('1. LOCATION & ZONE IDENTIFICATION');
    field('Zone Name',              zone.name);
    field('Zone Description',       zone.description || 'Not specified');
    field('GPS Coordinates',        `${zone.coordinates?.lat?.toFixed(6)}°N, ${zone.coordinates?.lng?.toFixed(6)}°E`);
    field('Bounding Box (WGS84)',   `SW: ${zone.bbox?.lat_min?.toFixed(6)}°N ${zone.bbox?.lng_min?.toFixed(6)}°E  NE: ${zone.bbox?.lat_max?.toFixed(6)}°N ${zone.bbox?.lng_max?.toFixed(6)}°E`);
    field('Total Protected Area',   `${(zone.area_km2 ?? 0).toFixed(2)} km² (${((zone.area_km2 ?? 0) * 100).toFixed(0)} hectares)`);

    // ── SECTION 2: SATELLITE EVIDENCE ───────────────────────────────────────
    section('2. SATELLITE EVIDENCE & TIMELINE');

    if (hist && hist.doneScan.length >= 2) {
      field('Data Source',          'EcoWatch Historical Analysis (Sentinel-2 L2A NDVI)');
      field('Observation Period',   `${hist.oldestScan.date}  →  ${hist.latestScan.date}`);
      field('Total Observations',   `${hist.doneScan.length} satellite passes (${hist.analysis.summary?.scans_skipped ?? 0} skipped — cloud cover)`);
      field('Forest Coverage (Baseline)',  `${hist.oldestScan.forest_pct?.toFixed(2)}%`);
      field('Forest Coverage (Latest)',    `${hist.latestScan.forest_pct?.toFixed(2)}%`);
      field('Net Forest Loss',             `${lossPct.toFixed(2)}% (${lossKm2.toFixed(4)} km² / ${lossHa.toFixed(2)} hectares)`);
      field('NDVI Mean (Latest)',          `${hist.latestScan.ndvi_mean?.toFixed(4)}`);
      field('Cloud Masking Applied',       `SCL-based (Sentinel-2 Scene Classification Layer) — unreliable pixels excluded`);

      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('  Observation Log (Done Scans Only):', 65);
      hist.doneScan.forEach((s: IHistoricalScan, i: number) => {
        const threats = (s.threats ?? []).filter((t: string) => t !== 'none').join(', ') || 'None';
        const cloudNote = s.cloud_pct > 0 ? ` | Cloud Masked: ${s.cloud_pct?.toFixed(0)}%` : '';
        doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
           .text(`  [${i + 1}] ${s.date}  —  Forest: ${s.forest_pct?.toFixed(1)}%  |  NDVI: ${s.ndvi_mean?.toFixed(3)}  |  Threats: ${threats}  |  Severity: ${s.severity}${cloudNote}  |  Δ: ${s.delta_from_first > 0 ? '-' : '+'}${Math.abs(s.delta_from_first).toFixed(1)}%`, 75);
      });

    } else if (scans.length >= 2) {
      const oldest = scans[scans.length - 1];
      const latest = scans[0];
      field('Data Source',          'Campaign Monitoring Scans');
      field('Observation Period',   `${oldest.scanDate?.toLocaleDateString('en-IN')} to ${latest.scanDate?.toLocaleDateString('en-IN')}`);
      field('Forest Coverage (First)',  `${oldest.results?.forestPercentage?.toFixed(2)}%`);
      field('Forest Coverage (Latest)', `${latest.results?.forestPercentage?.toFixed(2)}%`);
      field('Net Forest Loss',          `${lossPct.toFixed(2)}% (${lossKm2.toFixed(4)} km²)`);
      scans.slice(0, 8).forEach((s, i) => {
        const threats = (s.results?.threats as string[] ?? []).filter(t => t !== 'none').join(', ') || 'None';
        doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
           .text(`  [${i + 1}] ${s.scanDate?.toLocaleDateString('en-IN') ?? 'N/A'}  —  Forest: ${s.results?.forestPercentage?.toFixed(1)}%  |  Threats: ${threats}  |  Severity: ${s.results?.severity ?? 'N/A'}`, 75);
      });
    }

    // ── SECTION 3: AI THREAT ANALYSIS ───────────────────────────────────────
    section('3. AI THREAT DETECTION (QWEN2-VL MULTIMODAL ANALYSIS)');

    const latestForSection = hist?.latestScan;
    const threatsArr = (latestForSection?.threats ?? []).filter((t: string) => t !== 'none');
    field('Threats Identified',  threatsArr.length > 0 ? threatsArr.join(', ').toUpperCase() : 'None detected');
    field('Threat Severity',     (latestForSection?.severity ?? 'N/A').toUpperCase());
    field('Vegetation Cover',    `Forest: ${latestForSection?.forest_pct?.toFixed(1)}% | Vegetation: ${latestForSection?.vegetation_pct?.toFixed(1)}% | Bare Soil: ${latestForSection?.bare_soil_pct?.toFixed(1)}% | Water: ${latestForSection?.water_pct?.toFixed(1)}%`);

    if (latestForSection?.description) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(BLUE).text('  AI Visual Analysis Description (Expert Opinion):', 65);
      const descHeight = Math.max(55, Math.min(100, latestForSection.description.length / 4));
      doc.rect(65, doc.y + 2, doc.page.width - 130, descHeight).fill('#fff8e1').stroke('#ffe082');
      doc.fontSize(8).font('Helvetica').fillColor('#333')
         .text(latestForSection.description, 72, doc.y + 6, { width: doc.page.width - 145, lineGap: 2 });
      doc.y += descHeight + 10;
    }

    // AI Verdict
    if (hist?.analysis?.ai_verdict) {
      doc.moveDown(0.3);
      doc.fontSize(8).font('Helvetica-Bold').fillColor(RED).text('  Overall AI Verdict:', 65);
      doc.rect(65, doc.y + 2, doc.page.width - 130, 40).fill('#fce4ec').stroke('#ef9a9a');
      doc.fontSize(8).font('Helvetica').fillColor('#333')
         .text(hist.analysis.ai_verdict, 72, doc.y + 6, { width: doc.page.width - 145, lineGap: 2 });
      doc.y += 50;
    }

    // ── SECTION 4: ECONOMIC DAMAGE ───────────────────────────────────────────
    if (doc.y > 650) doc.addPage();
    section('4. ECONOMIC DAMAGE ASSESSMENT');
    field('Deforested Area',                   `${lossKm2.toFixed(4)} km² (${lossHa.toFixed(2)} hectares)`);
    field('Trees Lost (Estimated)',             `${carbon.treesLost.toLocaleString('en-IN')} trees`);
    field('CO₂ Emissions (Economic Loss)',      `${carbon.co2Tonnes.toLocaleString('en-IN')} metric tonnes`);
    field('Economic Damage (CAMPA ₹1000/t)',   `₹ ${carbon.valueINR.toLocaleString('en-IN')} (₹${carbon.valueLakhINR} Lakhs)`);
    field('Carbon Credit Value (Intl.)',        `USD ${carbon.valueUSD.toLocaleString()} (approx ₹${(carbon.valueUSD * USD_TO_INR).toFixed(0)} at current rate)`);
    field('Applicable Law',                    'Indian Forest Act, 1927 | Wildlife Protection Act, 1972 | Environment Protection Act, 1986');

    // ── SECTION 5: ALERTS HISTORY ────────────────────────────────────────────
    if (alerts.length > 0) {
      if (doc.y > 650) doc.addPage();
      section('5. OFFICIAL ALERT HISTORY');
      alerts.forEach((a, i) => {
        doc.fontSize(8).font('Helvetica-Bold').fillColor(RED)
           .text(`  Alert ${i + 1}: [${a.severity}] — ${new Date(a.createdAt).toLocaleDateString('en-IN')}`, 65);
        doc.fontSize(7.5).font('Helvetica').fillColor(DARK).text(`  ${a.message}`, 75);
        doc.moveDown(0.2);
      });
    }

    // ── SECTION 6: METHODOLOGY ───────────────────────────────────────────────
    if (doc.y > 650) doc.addPage();
    section('6. SCIENTIFIC METHODOLOGY');
    doc.fontSize(8).font('Helvetica').fillColor(DARK)
       .text('NDVI Calculation: Physics-based Normalized Difference Vegetation Index using raw Sentinel-2 spectral bands (B08 NIR / B04 Red). Formula: NDVI = (NIR − Red) / (NIR + Red). Values > 0.5 = Dense Forest.', 65, doc.y, { width: doc.page.width - 130, lineGap: 2 });
    doc.moveDown(0.3);
    doc.text('Cloud Masking: Sentinel-2 Scene Classification Layer (SCL) used to exclude cloud (SCL=8,9), cloud shadow (SCL=3), and cirrus (SCL=10) pixels from NDVI computation. Only clear-sky pixels contribute to land cover percentages.', 65, doc.y, { width: doc.page.width - 130, lineGap: 2 });
    doc.moveDown(0.3);
    doc.text('AI Vision: Qwen2-VL multimodal language model performs natural language analysis of satellite imagery to identify threats (illegal logging, encroachment, mining). Analysis corroborates NDVI calculations.', 65, doc.y, { width: doc.page.width - 130, lineGap: 2 });

    // ── SECTION 7: CERTIFICATION ─────────────────────────────────────────────
    if (doc.y > 650) doc.addPage();
    section('7. CERTIFICATION & DECLARATION');
    doc.moveDown(0.4);
    doc.fontSize(8.5).font('Helvetica').fillColor(DARK)
       .text('This report is generated by EcoWatch — an AI-powered satellite forest monitoring system using European Space Agency (ESA) Sentinel-2 L2A imagery with SCL cloud masking and Qwen2-VL Vision Language Model analysis.', 65, doc.y, { width: doc.page.width - 130, lineGap: 3 });
    doc.moveDown(0.5);
    doc.text('The NDVI calculations are physics-based measurements derived from raw spectral band analysis (B08 NIR and B04 Red), providing scientifically verifiable forest coverage data admissible as technical evidence.', 65, doc.y, { width: doc.page.width - 130, lineGap: 3 });

    doc.moveDown(1.5);
    const sigY = doc.y;
    doc.rect(65, sigY, 160, 55).stroke('#888');
    doc.rect(280, sigY, 160, 55).stroke('#888');
    doc.rect(doc.page.width - 195, sigY, 160, 55).stroke('#888');
    doc.fontSize(8).fillColor(GRAY)
       .text('Reporting Authority', 70, sigY + 38)
       .text('Forest Department Officer', 285, sigY + 38)
       .text('EcoWatch System', doc.page.width - 190, sigY + 38);

    // ── BOTTOM BORDER ────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 35, doc.page.width, 35).fill(DARK);
    doc.fillColor('#aaa').fontSize(7)
       .text(`Case Ref: ${caseRef}  |  Generated: ${today}  |  EcoWatch AI Deforestation Monitor  |  Sentinel-2 L2A + SCL + Qwen2-VL`,
             55, doc.page.height - 20, { align: 'center', width: doc.page.width - 110 });

    doc.end();

  } catch (err) {
    if (!res.headersSent) res.status(500).json({ success: false, error: String(err) });
  }
};
