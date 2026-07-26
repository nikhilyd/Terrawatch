/**
 * Field Report Controller
 * ------------------------
 * POST /api/field/report  — Field officer photo + GPS upload → GPT-4o analyzes
 * GET  /api/field/reports — All field reports for a zone
 */

import { Response }   from 'express';
import path           from 'path';
import fs             from 'fs';
import FieldReport    from '../models/FieldReport';
import Alert          from '../models/Alert';
import Zone           from '../models/Zone';
import { AuthRequest } from '../middleware/auth.middleware';
import { broadcastFieldReport, broadcastAlert } from '../utils/socket';
import { analyzeFieldPhoto } from '../services/visionAnalysis';

// ── POST /api/field/report ────────────────────────────────────────────────────
export const submitFieldReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { zoneId, lat, lng, notes, reporterName } = req.body;
    const file = (req as any).file;

    if (!zoneId || !file) {
      res.status(400).json({ success: false, message: 'zoneId and photo required' });
      return;
    }

    const zone = await Zone.findById(zoneId);
    if (!zone) { res.status(404).json({ success: false, message: 'Zone not found' }); return; }

    // Save field report to DB first
    const report = await FieldReport.create({
      zoneId,
      reportedBy:   req.user?.id,
      reporterName: reporterName || 'Field Officer',
      imagePath:    file.path,
      gps:          { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
      notes:        notes || '',
      status:       'pending',
    });

    // Send image to GPT-4o Vision for analysis
    try {
      const imageBuffer = fs.readFileSync(file.path);
      const base64Image = imageBuffer.toString('base64');

      const mlRes = await analyzeFieldPhoto(
        base64Image,
        zone.name,
        { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
        notes || '',
      );

      if (mlRes) {
        await FieldReport.findByIdAndUpdate(report._id, {
          status:      'analyzed',
          aiAnalysis: {
            threats:     mlRes.threats     ?? [],
            severity:    mlRes.severity    ?? 'none',
            description: mlRes.description ?? '',
            confidence:  mlRes.confidence  ?? 'low',
          },
        });

        // AUTO-ALERT: HIGH ya CRITICAL severity par alert create
        const sev = (mlRes.severity ?? 'none').toLowerCase();
        if (sev === 'high' || sev === 'critical') {
          try {
            const alert = await Alert.create({
              zoneId:        zoneId,
              source:        'field_report',
              fieldReportId: report._id,
              scanId:        null,
              forestLoss:    0,
              severity:      sev.toUpperCase() as 'HIGH' | 'CRITICAL',
              message:       `Field Officer Alert: ${(mlRes.threats ?? []).filter((t: string) => t !== 'none').join(', ') || 'Threat detected'} at ${zone.name} (GPS: ${lat}, ${lng})`,
              changeType:    mlRes.threats?.[0] ?? 'field_report',
              probableCause: mlRes.description ?? '',
              changeDescription: mlRes.description ?? '',
              hotspot:       { lat: parseFloat(lat) || 0, lng: parseFloat(lng) || 0 },
            });

            // Real-time broadcast
            broadcastAlert({
              ...alert.toObject(),
              zoneName: zone.name,
              source:   'field_report',
            });

            console.log(`[Field] AUTO-ALERT created | zone=${zone.name} | severity=${sev.toUpperCase()} | id=${alert._id}`);
          } catch (alertErr) {
            console.error('[Field] Auto-alert creation failed:', alertErr);
          }
        }
      }
    } catch (mlErr: any) {
      console.error('GPT-4o field analysis failed:', mlErr?.message);
      // Report saved, just not analyzed — still useful
    }

    const saved = await FieldReport.findById(report._id).populate('zoneId', 'name');
    
    // Broadcast the updated report via Socket.IO
    if (saved) {
      broadcastFieldReport(saved);
    }

    res.status(201).json({ success: true, data: saved });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};

// ── GET /api/field/reports?zone=:id ──────────────────────────────────────────
export const getFieldReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.zone) filter.zoneId = req.query.zone;

    const reports = await FieldReport.find(filter)
      .populate('zoneId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: reports.length, data: reports });

  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
};
