import express from 'express';
import cors    from 'cors';
import path    from 'path';
import fs      from 'fs';
import http    from 'http';

import connectDB             from './config/db';
import { connectKafka }      from './config/kafka';
import { startResultConsumer }   from './scheduler/consumer';
import { startScheduler }        from './scheduler/producer';
import { startCampaignScheduler } from './scheduler/campaign.scheduler';
import env                   from './config/env';

import authRoutes   from './routes/auth.routes';
import zoneRoutes   from './routes/zone.routes';
import scanRoutes   from './routes/scan.routes';
import alertRoutes  from './routes/alert.routes';
import reportRoutes from './routes/report.routes';
import legalRoutes  from './routes/legal.routes';
import gisRoutes    from './routes/gis.routes';
import publicRoutes   from './routes/public.routes';
import fieldRoutes    from './routes/field.routes';
import userRoutes     from './routes/user.routes';
import analyticsRoutes  from './routes/analytics.routes';
import exportRoutes    from './routes/export.routes';
import campaignRoutes    from './routes/campaign.routes';
import historicalRoutes  from './routes/historical.routes';
import { initSocket } from './utils/socket';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads static serve
const uploadDir  = path.join(__dirname, '..', env.UPLOAD_DIR);
const fieldDir   = path.join(__dirname, '..', 'uploads', 'field');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(fieldDir))  fs.mkdirSync(fieldDir,  { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ── Routes ───────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ service: 'EcoWatch Node.js Service', version: '1.0.0', status: 'running' });
});

app.use('/api/auth',    authRoutes);
app.use('/api/users',   userRoutes);
app.use('/api/zones',   zoneRoutes);
app.use('/api/scans',   scanRoutes);
app.use('/api/alerts',  alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/legal',   legalRoutes);
app.use('/api/gis',     gisRoutes);
app.use('/api/public',    publicRoutes);
app.use('/api/field',     fieldRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export',    exportRoutes);
app.use('/api/campaigns',  campaignRoutes);
app.use('/api/historical', historicalRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Start ────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await connectKafka();
  await startResultConsumer();
  startScheduler();             // Auto-scan cron job
  startCampaignScheduler();     // Campaign monitoring cron

  server.listen(Number(env.PORT), () => {
    console.log(`\n🚀 EcoWatch Node.js Service`);
    console.log(`   Port    : ${env.PORT}`);
    console.log(`   MongoDB : connected`);
    console.log(`   Kafka   : connected`);
    console.log(`\n   Core:`);
    console.log(`   POST /api/auth/register  | POST /api/auth/login | GET /api/auth/me`);
    console.log(`   GET  /api/zones          | POST /api/zones`);
    console.log(`   GET  /api/scans          | POST /api/scans/trigger-all`);
    console.log(`   GET  /api/alerts         | PUT  /api/alerts/:id/status`);
    console.log(`\n   Reports & Intelligence:`);
    console.log(`   GET  /api/reports/zone/:id            -> PDF Report`);
    console.log(`   GET  /api/reports/zone/:id/trend      -> Forest Trend`);
    console.log(`   GET  /api/analytics/threat-distribution-> Threat Pie Chart`);
    console.log(`   GET  /api/analytics/alerts-over-time  -> Alerts Bar Chart`);
    console.log(`   GET  /api/export/zone/:id/csv         -> Zone Scans CSV`);
    console.log(`   GET  /api/export/alerts/csv           -> All Alerts CSV`);
    console.log(`   GET  /api/legal/zone/:id/carbon       -> Carbon Calculator`);
    console.log(`   GET  /api/legal/zone/:id/fir          -> FIR Legal PDF`);
    console.log(`   GET  /api/legal/risk-scores           -> All Zones Risk`);
    console.log(`\n   GIS & Public:`);
    console.log(`   GET  /api/gis/zone/:id/kml            -> Google Earth KML`);
    console.log(`   GET  /api/gis/all/geojson             -> All Zones GeoJSON`);
    console.log(`   GET  /api/public/stats                -> Public Dashboard (no auth)`);
    console.log(`   POST /api/field/report                -> Field Photo Report`);
    console.log(`\n   Campaigns & Historical:`);
    console.log(`   POST /api/campaigns                   -> Create monitoring campaign`);
    console.log(`   GET  /api/campaigns                   -> List campaigns`);
    console.log(`   GET  /api/campaigns/:id               -> Campaign detail + scans`);
    console.log(`   POST /api/campaigns/preview-dates     -> Calculate scan dates (no DB)`);
    console.log(`   POST /ml:8001/historical/analyze      -> Historical multi-date analysis`);
    console.log(`   POST /api/historical                  -> Save historical analysis result`);
    console.log(`   GET  /api/historical                  -> List saved analyses`);
    console.log(`   GET  /api/historical/:id              -> Full analysis + images`);
    console.log();
  });
};

start();

export default app;
