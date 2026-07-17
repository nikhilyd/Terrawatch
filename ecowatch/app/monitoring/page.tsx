"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  Satellite, Plus, Trash2, Pause, Play, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, SkipForward, TrendingDown, Mail,
} from "lucide-react";
import { campaignService } from "@/lib/api/campaigns";
import { zonesService } from "@/lib/api/zones";
import { FlexibleDatePicker } from "@/components/ui/FlexibleDatePicker";
import { Campaign, CampaignScan } from "@/types/campaign.types";
import { Zone } from "@/types/zone.types";
import { io } from "socket.io-client";

// ── Days until a date (positive = future) ────────────────────────────────────
const daysUntil = (d: Date) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

// ── Scan status badge ────────────────────────────────────────────────────────
function ScanBadge({ scan, index, currentScanIdx }: { scan: CampaignScan; index: number; currentScanIdx: number }) {
  const isBaseline = scan.isBaseline;
  const date       = new Date(scan.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const days       = daysUntil(new Date(scan.scheduledDate));
  // A scan is "locked" if it comes after the next pending scan
  const isLocked   = scan.status === "pending" && index > currentScanIdx;

  const statusConfig = {
    done: {
      dot:  isBaseline ? "bg-blue-400" : scan.deltaFromPrevious >= 10 ? "bg-red-400" : scan.deltaFromPrevious >= 5 ? "bg-yellow-400" : "bg-emerald-400",
      text: isBaseline ? "text-blue-300" : scan.deltaFromPrevious >= 10 ? "text-red-300" : "text-emerald-300",
    },
    pending:    { dot: isLocked ? "bg-white/10" : days > 1 ? "bg-white/25" : "bg-yellow-400 animate-pulse", text: "text-white/40" },
    processing: { dot: "bg-yellow-400 animate-pulse", text: "text-yellow-300" },
    skipped:    { dot: "bg-white/10",  text: "text-white/30" },
  };
  const cfg = statusConfig[scan.status] ?? statusConfig.pending;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="flex flex-col items-center pt-1">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/60 font-mono">{date}</span>
          {isBaseline && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300">
              BASELINE
            </span>
          )}
          {/* Pending: show countdown or locked */}
          {scan.status === "pending" && !isLocked && (
            days > 1  ? (
              <span className="text-[10px] text-yellow-300/80">⏳ {days} days away</span>
            ) : days >= 0 ? (
              <span className="text-[10px] text-amber-300 animate-pulse">⚡ Due soon — awaiting scheduler</span>
            ) : (
              <span className="text-[10px] text-red-400">⚠️ Overdue — will run next cycle</span>
            )
          )}
          {scan.status === "pending" && isLocked && (
            <span className="text-[10px] text-white/25">🔒 Locked — prior scan pending</span>
          )}
          {scan.status === "processing" && (
            <span className="text-[10px] text-yellow-300 animate-pulse">⚡ Processing…</span>
          )}
          {scan.status === "skipped" && (
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <SkipForward className="w-3 h-3" /> Skipped: {scan.skipReason || "Cloud cover"}
            </span>
          )}
          {scan.status === "done" && !isBaseline && (
            <span className={`text-[10px] font-semibold ${cfg.text}`}>
              {scan.deltaFromPrevious > 0 ? `▼ ${scan.deltaFromPrevious.toFixed(1)}%` : `▲ ${Math.abs(scan.deltaFromPrevious).toFixed(1)}%`}
              {" "}from prev
            </span>
          )}
          {scan.alertSent && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 flex items-center gap-1">
              <Mail className="w-2.5 h-2.5" /> Alert Sent
            </span>
          )}
        </div>
        {scan.status === "done" && (
          <div className="mt-1 flex items-center gap-4 text-[11px] text-white/50">
            <span>Forest: <span className="text-white/80">{scan.forestPct.toFixed(1)}%</span></span>
            {!isBaseline && (
              <>
                <span>Δ Baseline: <span className={scan.deltaFromBaseline > 0 ? "text-red-300" : "text-emerald-300"}>{scan.deltaFromBaseline > 0 ? "-" : "+"}{Math.abs(scan.deltaFromBaseline).toFixed(1)}%</span></span>
                <span>Lost: <span className="text-orange-300">{scan.lossHectares.toFixed(0)} ha</span></span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Campaign card ────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onRefresh }: { campaign: Campaign; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const zone = typeof campaign.zoneId === "object" ? campaign.zoneId : null;
  const done = campaign.scans.filter(s => s.status === "done").length;
  const total = campaign.scans.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusColors = {
    active:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    paused:    "text-yellow-400  bg-yellow-500/10  border-yellow-500/30",
    completed: "text-blue-400    bg-blue-500/10    border-blue-500/30",
  };

  const handlePause = async () => {
    setLoading(true);
    const res = await campaignService.togglePause(campaign._id);
    if (res.success) { toast.success(`Campaign ${res.data?.status}`); onRefresh(); }
    else toast.error("Failed to update campaign");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete campaign "${campaign.name}"?`)) return;
    const res = await campaignService.deleteCampaign(campaign._id);
    if (res.success) { toast.success("Campaign deleted"); onRefresh(); }
    else toast.error("Failed to delete campaign");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/3 backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white truncate">{campaign.name}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${statusColors[campaign.status]}`}>
              {campaign.status.toUpperCase()}
            </span>
          </div>
          {zone && <p className="text-xs text-white/40 mt-0.5">Zone: {zone.name} · {campaign.resolution}m resolution</p>}
          {/* Next scan countdown for active campaigns */}
          {campaign.status === "active" && (() => {
            const nextScan = campaign.scans.find((s, i) => s.status === "pending" && i === campaign.currentScanIdx);
            if (!nextScan) return null;
            const d = daysUntil(new Date(nextScan.scheduledDate));
            return (
              <p className={`text-xs mt-0.5 font-medium ${
                d > 7 ? "text-emerald-400/60" : d > 0 ? "text-yellow-400" : "text-amber-400 animate-pulse"
              }`}>
                {d > 0
                  ? `🛰️ Next scan in ${d} day${d !== 1 ? "s" : ""} — ${new Date(nextScan.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                  : "⚡ Next scan due — will trigger on next hourly check"}
              </p>
            );
          })()}
          {campaign.status === "completed" && (
            <p className="text-xs mt-0.5 text-blue-400/60">✅ All scans completed</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {campaign.status !== "completed" && (
            <button onClick={handlePause} disabled={loading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all disabled:opacity-40">
              {campaign.status === "paused" ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          )}
          <button onClick={handleDelete}
            className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-white/60 hover:text-red-300 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(e => !e)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
          <span>{done}/{total} scans complete</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
          />
        </div>
      </div>

      {/* Final report strip */}
      {campaign.status === "completed" && campaign.finalReport && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-xs text-blue-300 font-semibold mb-1">📊 Final Report</p>
          <div className="flex gap-4 text-xs text-white/60 flex-wrap">
            <span>Total Loss: <span className="text-red-300 font-semibold">{campaign.finalReport.totalLossPct.toFixed(1)}%</span></span>
            <span>Area: <span className="text-orange-300 font-semibold">{campaign.finalReport.totalLossHa.toFixed(0)} ha</span></span>
            <span>Rate: <span className="text-yellow-300 font-semibold">{campaign.finalReport.ratePerYear.toFixed(0)} ha/yr</span></span>
          </div>
          {campaign.finalReport.aiVerdict && (
            <p className="text-xs text-white/50 mt-2 italic">"{campaign.finalReport.aiVerdict}"</p>
          )}
        </div>
      )}

      {/* Scan timeline (expanded) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-0">
              {campaign.scans.map((scan, i) => (
                <ScanBadge key={i} scan={scan} index={i} currentScanIdx={campaign.currentScanIdx} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const [zones,     setZones]     = useState<Zone[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [showForm,  setShowForm]  = useState(false);

  // Form state
  const [name,           setName]           = useState("");
  const [zoneId,         setZoneId]         = useState("");
  const [selectedDates,  setSelectedDates]  = useState<string[]>([]);
  const [mode,           setMode]           = useState<"historical" | "monitoring">("monitoring");
  const [scanCount,      setScanCount]      = useState(4);
  const [resolution,     setResolution]     = useState(20);
  const [maxCloud,       setMaxCloud]       = useState(50);
  const [retry,          setRetry]          = useState(true);
  const [alertEmail,     setAlertEmail]     = useState("");
  const [alertThreshold, setAlertThreshold] = useState(10);

  const selectedZone = zones.find(z => z._id === zoneId);

  const fetchData = async () => {
    setLoading(true);
    const [zonesRes, campaignsRes] = await Promise.all([
      zonesService.getZones(),
      campaignService.getCampaigns(),
    ]);
    if (zonesRes.success) setZones(zonesRes.data);
    if (campaignsRes.success) setCampaigns(campaignsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth/login"; return; }
    fetchData();

    // Setup Socket.IO for real-time campaign updates
    const socket = io("http://localhost:5000");
    
    socket.on("scan_update", () => {
      fetchData(); // Refresh campaigns on any scan update
    });

    socket.on("alert_updated", () => {
      fetchData(); 
    });

    // Polling fallback (every 2 mins)
    const intervalId = setInterval(fetchData, 120000);

    return () => {
      socket.disconnect();
      clearInterval(intervalId);
    };
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Campaign name required"); return; }
    if (!zoneId)      { toast.error("Please select a zone"); return; }
    if (selectedDates.length < 2) { toast.error("Please configure at least 2 scan dates"); return; }

    setCreating(true);
    const startDate = selectedDates[0];
    const endDate   = selectedDates[selectedDates.length - 1];

    const res = await campaignService.createCampaign({
      name, zoneId, startDate, endDate, scanCount: selectedDates.length,
      resolution, maxCloudCover: maxCloud, retryIfCloudy: retry,
      alertEmail, alertThreshold,
    });

    if (res.success) {
      toast.success(`Campaign "${name}" created!`);
      setName(""); setZoneId(""); setShowForm(false);
      fetchData();
    } else {
      toast.error(res.message || "Failed to create campaign");
    }
    setCreating(false);
  };

  const activeCampaigns    = campaigns.filter(c => c.status === "active");
  const pausedCampaigns    = campaigns.filter(c => c.status === "paused");
  const completedCampaigns = campaigns.filter(c => c.status === "completed");

  return (
    <div className="min-h-screen max-w-5xl mx-auto py-8 space-y-8">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Satellite className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Monitoring Campaigns</h1>
          </div>
          <p className="text-sm text-white/40">Schedule repeated satellite scans to track deforestation over time</p>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* ── Create Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" /> New Monitoring Campaign
              </h2>

              {/* Name + Zone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Campaign Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amazon Watch 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Zone *</label>
                  <select value={zoneId} onChange={e => setZoneId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="" className="bg-gray-900">Select a zone…</option>
                    {zones.map(z => (
                      <option key={z._id} value={z._id} className="bg-gray-900">{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Picker */}
              <div className="space-y-2">
                <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Schedule Future Scans *</label>
                <div className="p-4 rounded-xl bg-white/3 border border-white/10">
                  <FlexibleDatePicker
                    onDatesChange={(dates, m) => { setSelectedDates(dates); setMode(m); }}
                    onScanCountChange={setScanCount}
                    bbox={selectedZone?.bbox ? [selectedZone.bbox.lng_min, selectedZone.bbox.lat_min, selectedZone.bbox.lng_max, selectedZone.bbox.lat_max] : undefined}
                    disabled={creating}
                    forceFuture={true}
                  />
                </div>
              </div>

              {/* Scan Settings */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Resolution</label>
                  <select value={resolution} onChange={e => setResolution(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    <option value={10} className="bg-gray-900">10m (High Quality)</option>
                    <option value={20} className="bg-gray-900">20m (Recommended)</option>
                    <option value={30} className="bg-gray-900">30m (Fast)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Max Cloud Cover</label>
                  <select value={maxCloud} onChange={e => setMaxCloud(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    {[20, 30, 40, 50, 60, 70].map(v => (
                      <option key={v} value={v} className="bg-gray-900">{v}%</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Alert Threshold</label>
                  <select value={alertThreshold} onChange={e => setAlertThreshold(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                    {[5, 8, 10, 15, 20].map(v => (
                      <option key={v} value={v} className="bg-gray-900">≥{v}% drop triggers alert</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alert Email */}
              <div className="space-y-2">
                <label className="text-xs text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Alert Email (optional)
                </label>
                <input value={alertEmail} onChange={e => setAlertEmail(e.target.value)} type="email" placeholder="officer@forest.gov.in"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50" />
                <p className="text-xs text-white/30">Email alert sent immediately when deforestation threshold is crossed</p>
              </div>

              {/* Retry toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setRetry(r => !r)}
                  className={`w-10 h-5 rounded-full border transition-all ${retry ? "bg-emerald-500/30 border-emerald-500/60" : "bg-white/5 border-white/10"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white mt-0.5 transition-all ${retry ? "ml-5" : "ml-0.5"}`} />
                </div>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                  Retry cloudy scans within ±7 days
                </span>
              </label>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2">
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                  ) : (
                    <><Satellite className="w-4 h-4" />Start Campaign</>
                  )}
                </button>
                <button onClick={() => setShowForm(false)} disabled={creating}
                  className="px-4 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Campaigns List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <Satellite className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No campaigns yet. Create your first monitoring campaign.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Active ({activeCampaigns.length})
              </h2>
              {activeCampaigns.map(c => <CampaignCard key={c._id} campaign={c} onRefresh={fetchData} />)}
            </section>
          )}
          {pausedCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-400">Paused ({pausedCampaigns.length})</h2>
              {pausedCampaigns.map(c => <CampaignCard key={c._id} campaign={c} onRefresh={fetchData} />)}
            </section>
          )}
          {completedCampaigns.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-400">Completed ({completedCampaigns.length})</h2>
              {completedCampaigns.map(c => <CampaignCard key={c._id} campaign={c} onRefresh={fetchData} />)}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
