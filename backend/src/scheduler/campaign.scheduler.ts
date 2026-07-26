/**
 * Campaign Scheduler
 * ------------------
 * Har ghante active campaigns check karo.
 * Agar kisi campaign ka next scan due ho → Kafka pe trigger karo.
 * Scan complete hone pe: compare + alert + final report.
 */

import cron       from 'node-cron';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

import Campaign  from '../models/Campaign';
import Scan      from '../models/Scan';
import Zone      from '../models/Zone';
import { processScanJob } from './scanProcessor';
import env from '../config/env';

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

// ── Hectares calculator ───────────────────────────────────────────────────────
const calculateHectaresLost = (bbox: number[], forestPctOld: number, forestPctNew: number): number => {
  const [lngMin, latMin, lngMax, latMax] = bbox;
  const latMid   = (latMin + latMax) / 2;
  const widthKm  = Math.abs(lngMax - lngMin) * 111.32 * Math.cos((latMid * Math.PI) / 180);
  const heightKm = Math.abs(latMax - latMin) * 110.574;
  const totalHa  = widthKm * heightKm * 100; // km² → hectares
  const lossHa   = totalHa * (forestPctOld - forestPctNew) / 100;
  return parseFloat(Math.max(0, lossHa).toFixed(1));
};

// ── Email alert sender ────────────────────────────────────────────────────────
const sendDeforestationAlert = async (
  toEmail:      string,
  campaignName: string,
  zoneName:     string,
  scanIdx:      number,
  deltaPct:     number,
  lossHa:       number,
): Promise<void> => {
  if (!toEmail || !env.SMTP_USER || !env.SMTP_PASS) return;

  try {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

    await transporter.sendMail({
      from:    `"EcoWatch Alert" <${env.SMTP_USER}>`,
      to:      toEmail,
      subject: `🚨 [EcoWatch] Deforestation Alert — ${campaignName}`,
      html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#b71c1c;padding:20px;border-radius:8px 8px 0 0">
    <h2 style="color:white;margin:0">🚨 EcoWatch — Deforestation Alert</h2>
  </div>
  <div style="background:#fff8f8;padding:25px;border:1px solid #ffcdd2">
    <p>A significant forest loss has been detected in your monitoring campaign.</p>
    <table style="width:100%;border-collapse:collapse;margin:15px 0">
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Campaign</td>
          <td style="padding:8px">${campaignName}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Zone</td>
          <td style="padding:8px">${zoneName}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Scan #</td>
          <td style="padding:8px">${scanIdx + 1}</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Forest Loss</td>
          <td style="padding:8px;color:#b71c1c;font-weight:bold">${deltaPct.toFixed(1)}%</td></tr>
      <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold">Area Lost</td>
          <td style="padding:8px;color:#b71c1c;font-weight:bold">${lossHa} hectares</td></tr>
    </table>
    <p><strong>Action required:</strong> Please investigate this zone immediately.</p>
    <p style="color:#888;font-size:12px">EcoWatch Automated Monitoring System</p>
  </div>
</div>`,
    });

    console.log(`[CampaignScheduler] Alert email sent to ${toEmail} for campaign: ${campaignName}`);
  } catch (err) {
    console.error('[CampaignScheduler] Email send failed:', err);
  }
};

// ── Process scan result for a campaign ───────────────────────────────────────
// Called after a scan job completes (from result consumer)
export const processCampaignScanResult = async (
  campaignId: string,
  scanIdx:    number,
  scanDocId:  string,
): Promise<void> => {
  try {
    const campaign = await Campaign.findById(campaignId).populate('zoneId', 'name');
    if (!campaign) return;

    const scan = await Scan.findById(scanDocId);
    if (!scan || scan.status !== 'completed') return;

    const zoneName   = (campaign.zoneId as any)?.name ?? 'Unknown';
    const forestPct  = scan.results?.forestPercentage ?? 0;
    const ndvi       = scan.results?.ndviMean         ?? 0;

    // Find baseline (scan 0)
    const baselinePct = campaign.scans[0]?.forestPct ?? forestPct;

    // Find previous scan's forestPct
    const prevScan    = scanIdx > 0 ? campaign.scans[scanIdx - 1] : null;
    const prevPct     = prevScan?.forestPct ?? forestPct;

    const deltaFromBaseline = parseFloat((baselinePct - forestPct).toFixed(2));
    const deltaFromPrevious = parseFloat((prevPct     - forestPct).toFixed(2));
    const lossHectares      = calculateHectaresLost(campaign.bbox, baselinePct, forestPct);

    // Update this scan slot
    campaign.scans[scanIdx].status            = 'done';
    campaign.scans[scanIdx].actualDate        = new Date();
    campaign.scans[scanIdx].scanId            = scan._id as any;
    campaign.scans[scanIdx].ndvi              = ndvi;
    campaign.scans[scanIdx].forestPct         = forestPct;
    campaign.scans[scanIdx].deltaFromBaseline = deltaFromBaseline;
    campaign.scans[scanIdx].deltaFromPrevious = deltaFromPrevious;
    campaign.scans[scanIdx].lossHectares      = lossHectares;

    // Move to next scan
    campaign.currentScanIdx = scanIdx + 1;

    // Alert check — if NDVI drop > threshold AND not baseline AND alert not sent
    const isBaseline = campaign.scans[scanIdx].isBaseline;
    if (
      !isBaseline &&
      deltaFromPrevious >= campaign.alertThreshold &&
      !campaign.scans[scanIdx].alertSent &&
      campaign.alertEmail
    ) {
      campaign.scans[scanIdx].alertSent = true;
      await sendDeforestationAlert(
        campaign.alertEmail,
        campaign.name,
        zoneName,
        scanIdx,
        deltaFromPrevious,
        lossHectares,
      );
    }

    // Check if all scans done
    const allDone = campaign.scans.every(s => s.status === 'done' || s.status === 'skipped');
    if (allDone) {
      campaign.status = 'completed';

      // Generate final report
      const doneSans  = campaign.scans.filter(s => s.status === 'done');
      const lastScan  = doneSans[doneSans.length - 1];
      const firstScan = doneSans[0];

      const totalLossPct = parseFloat((firstScan.forestPct - lastScan.forestPct).toFixed(2));
      const totalLossHa  = calculateHectaresLost(campaign.bbox, firstScan.forestPct, lastScan.forestPct);

      // Annualized rate
      const daysSpan    = (lastScan.actualDate!.getTime() - firstScan.actualDate!.getTime()) / 86400000;
      const ratePerYear = daysSpan > 0 ? parseFloat((totalLossHa / daysSpan * 365).toFixed(1)) : 0;

      // Biggest drop
      let biggestDrop = 0, biggestDropIdx = 0;
      campaign.scans.forEach((s, i) => {
        if (s.deltaFromPrevious > biggestDrop) {
          biggestDrop    = s.deltaFromPrevious;
          biggestDropIdx = i;
        }
      });

      campaign.finalReport = {
        totalLossPct,
        totalLossHa,
        ratePerYear,
        biggestDropPct:   biggestDrop,
        biggestDropIndex: biggestDropIdx,
        aiVerdict:        '',   // Will be filled by ML service if requested
        generatedAt:      new Date(),
      };

      console.log(`[CampaignScheduler] Campaign "${campaign.name}" completed. Total loss: ${totalLossPct}% (${totalLossHa} ha)`);
    }

    await campaign.save();
  } catch (err) {
    console.error('[CampaignScheduler] processCampaignScanResult error:', err);
  }
};

// ── Main: Trigger due campaign scans ─────────────────────────────────────────
const runCampaignScans = async (): Promise<void> => {
  try {
    const now       = new Date();
    const campaigns = await Campaign.find({ status: 'active' }).populate('zoneId');

    for (const campaign of campaigns) {
      const nextIdx = campaign.currentScanIdx;
      if (nextIdx >= campaign.scans.length) continue;

      const nextScan = campaign.scans[nextIdx];
      if (!nextScan || nextScan.status !== 'pending') continue;
      if (nextScan.scheduledDate > now) continue; // Not due yet

      // Mark as processing
      campaign.scans[nextIdx].status = 'processing';
      await campaign.save();

      const zone = campaign.zoneId as any;
      if (!zone || !campaign.bbox?.length) continue;

      const jobId   = uuidv4();
      const scanDate = nextScan.scheduledDate;

      // Date window: 15 days before scheduled date (for cloud-free mosaic)
      const dateFrom = new Date(scanDate);
      dateFrom.setDate(dateFrom.getDate() - 15);

      const job = {
        job_id:      jobId,
        zone_id:     zone._id.toString(),
        zone_name:   zone.name,
        bbox:        campaign.bbox,
        date_from:   formatDate(dateFrom),
        date_to:     formatDate(scanDate > now ? now : scanDate),
        resolution:  campaign.resolution,
        // Campaign metadata for result consumer
        campaign_id:   campaign._id.toString(),
        campaign_scan_idx: nextIdx,
      };

      // Create Scan record
      await Scan.create({
        zoneId:    zone._id,
        jobId,
        imagePath: `campaign://${campaign.name}/scan-${nextIdx + 1}`,
        status:    'pending',
      });

      processScanJob(job).catch(err => console.error(`[${jobId}] Campaign scan failed:`, err));

      console.log(`[CampaignScheduler] Triggered scan ${nextIdx + 1}/${campaign.scans.length} for "${campaign.name}" | jobId=${jobId}`);
    }
  } catch (err) {
    console.error('[CampaignScheduler] runCampaignScans error:', err);
  }
};

// ── Export: Start campaign cron ──────────────────────────────────────────────
export const startCampaignScheduler = (): void => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log(`[CampaignScheduler] Hourly check: ${new Date().toISOString()}`);
    await runCampaignScans();
  });

  // Run once at startup (after 15 sec delay for DB connection)
  setTimeout(runCampaignScans, 15_000);

  console.log('[CampaignScheduler] Started — checking every hour');
};
