"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const http_1 = __importDefault(require("http"));
const db_1 = __importDefault(require("./config/db"));
const autoScan_scheduler_1 = require("./scheduler/autoScan.scheduler");
const campaign_scheduler_1 = require("./scheduler/campaign.scheduler");
const env_1 = __importDefault(require("./config/env"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const zone_routes_1 = __importDefault(require("./routes/zone.routes"));
const scan_routes_1 = __importDefault(require("./routes/scan.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const legal_routes_1 = __importDefault(require("./routes/legal.routes"));
const gis_routes_1 = __importDefault(require("./routes/gis.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const field_routes_1 = __importDefault(require("./routes/field.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const campaign_routes_1 = __importDefault(require("./routes/campaign.routes"));
const historical_routes_1 = __importDefault(require("./routes/historical.routes"));
const scanAnalysis_routes_1 = __importDefault(require("./routes/scanAnalysis.routes"));
const socket_1 = require("./utils/socket");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Initialize WebSockets
(0, socket_1.initSocket)(server);
// ── Middleware ───────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Uploads static serve
const uploadDir = path_1.default.join(__dirname, '..', env_1.default.UPLOAD_DIR);
const fieldDir = path_1.default.join(__dirname, '..', 'uploads', 'field');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
if (!fs_1.default.existsSync(fieldDir))
    fs_1.default.mkdirSync(fieldDir, { recursive: true });
app.use('/uploads', express_1.default.static(uploadDir));
// Processed satellite images static serve (replaces ML service /images endpoint)
const processedDir = path_1.default.join(__dirname, '..', 'data', 'processed');
if (!fs_1.default.existsSync(processedDir))
    fs_1.default.mkdirSync(processedDir, { recursive: true });
app.use('/images', express_1.default.static(processedDir));
// ── Routes ───────────────────────────────────────────────────
app.get('/', (_req, res) => {
    res.json({ service: 'EcoWatch Node.js Service', version: '1.0.0', status: 'running' });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/zones', zone_routes_1.default);
app.use('/api/scans', scan_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/legal', legal_routes_1.default);
app.use('/api/gis', gis_routes_1.default);
app.use('/api/public', public_routes_1.default);
app.use('/api/field', field_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/export', export_routes_1.default);
app.use('/api/campaigns', campaign_routes_1.default);
app.use('/api/historical', historical_routes_1.default);
app.use('/api/scan', scanAnalysis_routes_1.default); // Sentinel Hub + NDVI + GPT-4o (replaces ML service)
// ── 404 Handler ──────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});
// ── Start ────────────────────────────────────────────────────
const start = async () => {
    await (0, db_1.default)();
    (0, autoScan_scheduler_1.startScheduler)(); // Auto-scan cron job
    (0, campaign_scheduler_1.startCampaignScheduler)(); // Campaign monitoring cron
    server.listen(Number(env_1.default.PORT), () => {
        console.log(`\n🚀 EcoWatch Node.js Service`);
        console.log(`   Port    : ${env_1.default.PORT}`);
        console.log(`   MongoDB : connected`);
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
        console.log(`   POST /api/historical/analyze      -> Historical multi-date analysis (GPT-4o)`);
        console.log(`   POST /api/historical                  -> Save historical analysis result`);
        console.log(`   GET  /api/historical                  -> List saved analyses`);
        console.log(`   GET  /api/historical/:id              -> Full analysis + images`);
        console.log();
    });
};
start();
exports.default = app;
//# sourceMappingURL=index.js.map