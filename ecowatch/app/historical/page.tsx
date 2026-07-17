"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  History, Search, AlertTriangle,
  SkipForward, TrendingDown, Zap, Leaf, BarChart3,
  Clock, Trash2, ChevronDown, ChevronUp,
  Database, Plus, Sparkles, Activity
} from "lucide-react";
import { historicalService, historicalSaveService, SavedAnalysis } from "@/lib/api/campaigns";
import { zonesService } from "@/lib/api/zones";
import { FlexibleDatePicker } from "@/components/ui/FlexibleDatePicker";
import { HistoricalResult, HistoricalScan } from "@/types/campaign.types";
import { Zone } from "@/types/zone.types";
import { formatDistanceToNow } from "date-fns";

const ML_BASE = "http://localhost:8001";

// ── Severity color ────────────────────────────────────────────────────────────
const severityColor = (s: string) => {
  if (s === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
  if (s === "high")     return "text-orange-400 bg-orange-500/10 border-orange-500/30";
  if (s === "medium")   return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  if (s === "low")      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  return "text-white/30 bg-white/5 border-white/10";
};

// ── Forest bar ────────────────────────────────────────────────────────────────
function ForestBar({ pct }: { pct: number }) {
  const bars = Math.round(pct / 5);
  return (
    <div className="flex items-end gap-px h-8">
      {Array.from({ length: 20 }, (_, i) => (
        <div key={i}
          className={`w-1.5 rounded-t-sm ${i < bars ? "bg-emerald-500" : "bg-white/5"}`}
          style={{ height: `${20 + i * 3}%` }}
        />
      ))}
    </div>
  );
}

// ── Timeline chart ────────────────────────────────────────────────────────────
function TimelineChart({ scans }: { scans: HistoricalScan[] }) {
  const done = scans.filter(s => s.status === "done");
  if (done.length < 2) return null;
  const max   = Math.max(...done.map(s => s.forest_pct));
  const min   = Math.min(...done.map(s => s.forest_pct));
  const range = max - min || 1;
  return (
    <div className="relative h-32 flex items-end gap-2 px-2">
      <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-white/30 text-right pr-1">
        <span>{max.toFixed(0)}%</span>
        <span>{((max + min) / 2).toFixed(0)}%</span>
        <span>{min.toFixed(0)}%</span>
      </div>
      <div className="flex-1 ml-8 flex items-end gap-1.5 h-full">
        {done.map((scan, i) => {
          const h       = ((scan.forest_pct - min) / range) * 80 + 20;
          const isFirst = i === 0;
          const prev    = i > 0 ? done[i - 1].forest_pct : scan.forest_pct;
          const drop    = prev - scan.forest_pct;
          const color   = isFirst ? "bg-blue-500" : drop >= 10 ? "bg-red-500" : drop >= 5 ? "bg-yellow-500" : "bg-emerald-500";
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 group cursor-default">
              <div className="relative flex-1 w-full flex items-end">
                <div className={`w-full rounded-t-sm ${color} group-hover:opacity-80`} style={{ height: `${h}%` }} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                  <div className="bg-gray-900 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white whitespace-nowrap shadow-xl">
                    <div className="font-semibold">{scan.date.slice(0, 7)}</div>
                    <div>Forest: {scan.forest_pct.toFixed(1)}%</div>
                    {!isFirst && <div className={drop > 0 ? "text-red-300" : "text-emerald-300"}>{drop > 0 ? `-${drop.toFixed(1)}%` : `+${Math.abs(drop).toFixed(1)}%`}</div>}
                  </div>
                </div>
              </div>
              <span className="text-[8px] text-white/30 -rotate-45 origin-top-left whitespace-nowrap">{scan.date.slice(2, 7)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live scan card ────────────────────────────────────────────────────────────
function ScanCard({ scan, index }: { scan: HistoricalScan; index: number }) {
  const isBaseline  = index === 0;
  const isDone      = scan.status === "done";
  const realThreats = (scan.threats || []).filter((t: string) => t && t !== "none");
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
      className={`p-4 rounded-xl border transition-all ${
        !isDone      ? "bg-white/2 border-white/5 opacity-60" :
        isBaseline   ? "bg-blue-500/5 border-blue-500/20" :
        scan.delta_from_first > 10 ? "bg-red-500/5 border-red-500/20" :
        scan.delta_from_first > 5  ? "bg-yellow-500/5 border-yellow-500/20" :
        "bg-emerald-500/5 border-emerald-500/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-sm font-mono text-white/80">{scan.date}</span>
            {isBaseline && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-semibold">BASELINE</span>}
            {!isDone && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 flex items-center gap-1"><SkipForward className="w-3 h-3" />Skipped — {scan.skip_reason || "cloud cover"}</span>}
            {isDone && !isBaseline && scan.delta_from_first > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-semibold">
                -{scan.delta_from_first.toFixed(1)}% from baseline
              </span>
            )}
            {realThreats.map((t: string) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300">{t.replace(/_/g, " ")}</span>
            ))}
            {isDone && scan.cloud_pct > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400">
                ☁ {scan.cloud_pct.toFixed(0)}% masked
              </span>
            )}
          </div>
          {isDone && (
            <div className="flex items-center gap-6 text-xs text-white/60">
              <span>Forest: <span className="text-white font-semibold">{scan.forest_pct.toFixed(1)}%</span></span>
              {scan.ndvi_mean != null && <span>NDVI: <span className="text-white/80">{scan.ndvi_mean.toFixed(3)}</span></span>}
              {scan.loss_hectares > 0 && <span>Loss: <span className="text-orange-300 font-semibold">{scan.loss_hectares.toFixed(0)} ha</span></span>}
              {scan.severity && scan.severity !== "none" && (
                <span className={`text-[10px] px-2 py-0.5 rounded border ${severityColor(scan.severity)}`}>{scan.severity.toUpperCase()}</span>
              )}
            </div>
          )}
        </div>
        {isDone && <ForestBar pct={scan.forest_pct} />}
      </div>
    </motion.div>
  );
}

// ── Image with fallback ───────────────────────────────────────────────────────
function ScanImage({ url, label }: { url: string; label: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) return null; // silently hide if unavailable
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">{label}</p>
      <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/20">
        <img
          src={url}
          alt={label}
          onError={() => setErr(true)}
          className="w-full object-contain max-h-80"
          style={{ background: "#fff" }}
        />
      </div>
    </div>
  );
}

// ── Collapsible image — user clicks to reveal ────────────────────────────────
function CollapsibleImage({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const [err,  setErr]  = useState(false);
  if (err) return null;
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[10px] text-white/30 hover:text-white/60 transition-colors py-1">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Hide" : "View"} Satellite Analysis Image
        <span className="text-white/20 ml-1">(RGB + NDVI · may contain clouds)</span>
      </button>
      {open && (
        <div className="mt-1 rounded-xl overflow-hidden border border-white/10 bg-white">
          <img
            src={url}
            alt="Satellite Analysis"
            onError={() => { setErr(true); setOpen(false); }}
            className="w-full object-contain max-h-80"
          />
        </div>
      )}
    </div>
  );
}

// ── Saved analysis card ───────────────────────────────────────────────────────
function SavedAnalysisCard({
  analysis, onDelete, onExpand, expanded,
}: {
  analysis: SavedAnalysis;
  onDelete: (id: string) => void;
  onExpand: (id: string) => void;
  expanded: boolean;
}) {
  const s         = analysis.summary;
  const isLoss    = s && s.total_loss_pct > 0;
  const dateRange = analysis.dates?.length >= 2
    ? `${analysis.dates[0]} → ${analysis.dates[analysis.dates.length - 1]}`
    : "—";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-[#0a0a0c] overflow-hidden transition-all hover:border-white/20 relative group"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLoss ? 'bg-red-500' : 'bg-emerald-500'}`} />
      
      {/* ── Card Header (Clickable) ── */}
      <div className="p-5 pl-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer gap-4" onClick={() => onExpand(analysis._id)}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-white font-bold text-lg">{analysis.zoneName}</h3>
            <span className="text-[10px] text-white/40 font-mono tracking-wide px-2 py-0.5 rounded-full bg-white/5">
              {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-xs text-white/40 font-mono tracking-wide mb-3">
            {dateRange} • {analysis.scans?.length || 0} scans • {analysis.resolution}m res
          </p>
          <div className="flex flex-wrap gap-2">
            {s?.rate_per_year != null && s.rate_per_year > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-yellow-500/20 bg-yellow-500/10 text-yellow-300/90">
                {s.rate_per_year.toFixed(0)} ha/yr loss
              </span>
            )}
            {s?.scans_done != null && (
              <span className="text-[10px] px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/10 text-blue-300/90">
                {s.scans_done} scans done
              </span>
            )}
          </div>
        </div>

        {/* ── Key Metrics (Moved to Right) ── */}
        <div className="flex gap-8 items-center md:pr-8">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Total Loss</p>
            <p className={`text-base font-mono font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
              {s ? (isLoss ? '-' : '+') + Math.abs(s.total_loss_pct).toFixed(1) : 0}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Impact Area</p>
            <p className="text-base font-mono text-white/80">{s?.total_loss_ha.toFixed(1) || 0} ha</p>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDelete(analysis._id); }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="p-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* ── AI Verdict Insights (Subtle Container) ── */}
      {analysis.ai_verdict && !expanded && (
        <div className="px-6 pb-4">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/10">
            <Sparkles className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-100/70 italic line-clamp-2 leading-relaxed">
              {analysis.ai_verdict}
            </p>
          </div>
        </div>
      )}

      {/* ── Expanded Section ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden bg-black/20">
            <div className="p-6 border-t border-white/5 space-y-6">
              
              {/* Full Verdict in Expanded View */}
              {analysis.ai_verdict && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/20 mb-6">
                  <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-100/90 italic leading-relaxed">
                    {analysis.ai_verdict}
                  </p>
                </div>
              )}

              {(analysis.scans || []).map((scan: any, i: number) => (
                <div key={i} className="space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-mono text-white/90 font-bold">{scan.date}</span>
                    {i === 0 && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">Baseline</span>}
                    {scan.status === "skipped" && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/40 flex items-center gap-1 font-bold">
                        <SkipForward className="w-3 h-3" /> Skipped
                      </span>
                    )}
                    {scan.status === "done" && scan.severity && scan.severity !== "none" && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${severityColor(scan.severity)}`}>{scan.severity}</span>
                    )}
                    {scan.status === "done" && (scan.cloud_pct || 0) > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-bold">
                        ☁ {(scan.cloud_pct || 0).toFixed(0)}% cloud
                      </span>
                    )}
                  </div>

                  {scan.status === "done" && (
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: "Forest",     val: scan.forest_pct,     color: "text-emerald-400" },
                          { label: "Vegetation", val: scan.vegetation_pct, color: "text-lime-400" },
                          { label: "Water",      val: scan.water_pct,      color: "text-cyan-400" },
                          { label: "Soil",       val: scan.bare_soil_pct,  color: "text-orange-400" },
                        ].map(m => (
                          <div key={m.label} className="bg-black/40 rounded-lg p-3 text-center border border-white/5">
                            <p className="text-[9px] text-white/40 uppercase tracking-widest">{m.label}</p>
                            <p className={`text-base font-bold font-mono mt-1 ${m.color}`}>{(m.val ?? 0).toFixed(1)}%</p>
                          </div>
                        ))}
                      </div>

                      {(scan.threats || []).filter((t: string) => t && t !== "none").length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {scan.threats.filter((t: string) => t && t !== "none").map((t: string) => (
                            <span key={t} className="text-[10px] px-2 py-1 rounded bg-red-500/15 border border-red-500/30 text-red-300 font-bold uppercase tracking-wider">
                              {t.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}

                      {scan.description && (
                        <p className="text-xs text-white/50 italic leading-relaxed mt-4 bg-black/20 p-3 rounded-lg border border-white/5">{scan.description}</p>
                      )}

                      {/* Analysis image — hidden behind toggle */}
                      {(() => {
                        const imgUrl = scan.heatmap_url || scan.image_url;
                        if (!imgUrl) return null;
                        return <CollapsibleImage url={imgUrl} />;
                      })()}

                      {i > 0 && scan.delta_from_first != null && (
                        <div className="mt-4 flex items-center gap-2">
                          <TrendingDown className={`w-4 h-4 ${scan.delta_from_first > 0 ? "text-red-400" : "text-emerald-400"}`} />
                          <p className={`text-xs font-bold ${scan.delta_from_first > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {scan.delta_from_first > 0
                              ? `-${scan.delta_from_first.toFixed(1)}% from baseline · ${(scan.loss_hectares || 0).toFixed(0)} ha lost`
                              : `+${Math.abs(scan.delta_from_first).toFixed(1)}% from baseline (recovery)`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {i < (analysis.scans?.length ?? 0) - 1 && <div className="h-px bg-white/5 my-4 w-full" />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type ViewState = "form" | "loading" | "results";
type TabState  = "new"  | "past";

export default function HistoricalPage() {
  const [tab,    setTab]    = useState<TabState>("new");
  const [view,   setView]   = useState<ViewState>("form");
  const [zones,  setZones]  = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [resolution,    setResolution]    = useState(10);
  const [result, setResult] = useState<HistoricalResult | null>(null);
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const [pastAnalyses,     setPastAnalyses]     = useState<SavedAnalysis[]>([]);
  const [loadingPast,      setLoadingPast]      = useState(false);
  const [expandedId,       setExpandedId]       = useState<string | null>(null);
  const [expandedFullData, setExpandedFullData] = useState<Record<string, SavedAnalysis>>({});

  const selectedZone = zones.find(z => z._id === zoneId);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth/login"; return; }
    zonesService.getZones().then(r => { if (r.success) setZones(r.data); });
    loadPastAnalyses();
  }, []);

  const loadPastAnalyses = async () => {
    setLoadingPast(true);
    const res = await historicalSaveService.getAnalyses();
    if (res.success) setPastAnalyses(res.data);
    setLoadingPast(false);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!expandedFullData[id]) {
      const res = await historicalSaveService.getAnalysis(id);
      if (res.success && res.data) setExpandedFullData(prev => ({ ...prev, [id]: res.data! }));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this analysis?")) return;
    const res = await historicalSaveService.deleteAnalysis(id);
    if (res.success) {
      toast.success("Analysis deleted");
      setPastAnalyses(prev => prev.filter(a => a._id !== id));
      if (expandedId === id) setExpandedId(null);
    } else {
      toast.error("Failed to delete");
    }
  };

  const handleAnalyze = async () => {
    if (!zoneId)               { toast.error("Select a zone first"); return; }
    if (selectedDates.length < 2) { toast.error("Configure at least 2 scan dates"); return; }
    setView("loading"); setError("");
    const zone = zones.find(z => z._id === zoneId);
    if (!zone?.bbox) { setError("Zone bbox not configured"); setView("form"); return; }
    const bbox = [zone.bbox.lng_min, zone.bbox.lat_min, zone.bbox.lng_max, zone.bbox.lat_max];
    const res = await historicalService.analyze({ zone_id: zoneId, bbox, dates: selectedDates, resolution });
    if (res.success && res.data) {
      setResult(res.data);
      setView("results");
      setSaving(true);
      const savePayload = {
        zoneId,
        zoneName:   zone.name,
        bbox,
        dates:      selectedDates,
        resolution,
        scans: res.data.scans.map((s: HistoricalScan) => ({
          date:           s.date,
          status:         s.status,
          skip_reason:    s.skip_reason || "",
          ndvi_mean:      s.ndvi_mean,
          forest_pct:     s.forest_pct,
          vegetation_pct: s.vegetation_pct || 0,
          water_pct:      s.water_pct      || 0,
          bare_soil_pct:  s.bare_soil_pct  || 0,
          cloud_pct:      s.cloud_pct      || 0,
          threats:        s.threats || [],
          severity:       s.severity || "none",
          description:    s.description || "",
          image_url:   s.image_path   ? `${ML_BASE}/images/${s.image_path.split(/[/\\]/).pop()}`   : "",
          heatmap_url: s.heatmap_path ? `${ML_BASE}/images/${s.heatmap_path.split(/[/\\]/).pop()}` : "",
          delta_from_first: s.delta_from_first,
          loss_hectares:    s.loss_hectares,
        })),
        summary:    res.data.summary,
        ai_verdict: res.data.ai_verdict || "",
      };
      const saved = await historicalSaveService.saveAnalysis(savePayload);
      if (saved.success) { toast.success("Analysis saved!", { icon: "💾" }); loadPastAnalyses(); }
      else toast.warning("Analysis complete but could not save");
      setSaving(false);
    } else {
      setError(res.error || "Analysis failed.");
      setView("form");
      toast.error(res.error || "Analysis failed");
    }
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto py-8 space-y-8">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <History className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Historical Analysis</h1>
            <p className="text-sm text-white/40">Compare satellite imagery across time · Sentinel-2 archive from 2015</p>
          </div>
        </div>
        {saving && (
          <span className="flex items-center gap-2 text-xs text-blue-300 animate-pulse">
            <Database className="w-4 h-4" /> Saving to database…
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/3 border border-white/10 w-fit">
        <button onClick={() => setTab("new")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "new" ? "bg-blue-500/20 border border-blue-500/30 text-blue-300" : "text-white/50 hover:text-white"}`}>
          <Plus className="w-4 h-4" /> New Analysis
        </button>
        <button onClick={() => { setTab("past"); loadPastAnalyses(); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "past" ? "bg-blue-500/20 border border-blue-500/30 text-blue-300" : "text-white/50 hover:text-white"}`}>
          <Database className="w-4 h-4" /> Past Analyses
          {pastAnalyses.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200">{pastAnalyses.length}</span>
          )}
        </button>
      </div>

      {/* NEW ANALYSIS TAB */}
      {tab === "new" && (
        <>
          {view === "form" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/3 backdrop-blur-xl p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Zone *</label>
                  <select value={zoneId} onChange={e => setZoneId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50">
                    <option value="" className="bg-gray-900">Select a zone…</option>
                    {zones.map(z => <option key={z._id} value={z._id} className="bg-gray-900">{z.name}</option>)}
                  </select>
                  {selectedZone && (
                    selectedZone.bbox ? (
                      <p className="text-xs text-white/30">Area: ~{selectedZone.area_km2?.toFixed(0) ?? "?"} km² · BBox configured</p>
                    ) : (
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 mt-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300">Zone &quot;{selectedZone.name}&quot; has no bounding box. Edit it in Mission Control first.</p>
                      </div>
                    )
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Time Range &amp; Samples</label>
                  <div className="p-4 rounded-xl bg-white/3 border border-white/10">
                    <FlexibleDatePicker
                      onDatesChange={dates => setSelectedDates(dates)}
                      bbox={selectedZone?.bbox ? [selectedZone.bbox.lng_min, selectedZone.bbox.lat_min, selectedZone.bbox.lng_max, selectedZone.bbox.lat_max] : undefined}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Image Resolution</label>
                  <div className="flex gap-3">
                    {[{ v: 10, l: "10m — High Quality" }, { v: 20, l: "20m — Recommended" }, { v: 30, l: "30m — Fast" }].map(r => (
                      <button key={r.v} onClick={() => setResolution(r.v)}
                        className={`flex-1 py-2.5 rounded-lg text-xs border transition-all ${resolution === r.v ? "bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold" : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"}`}>
                        {r.l}
                      </button>
                    ))}
                  </div>
                </div>
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
                <button onClick={handleAnalyze} disabled={!!selectedZone && !selectedZone.bbox}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Search className="w-4 h-4" /> Analyze History
                </button>
              </div>
            </motion.div>
          )}

          {view === "loading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-32 gap-6">
              <div className="relative">
                <div className="w-16 h-16 border-2 border-blue-500/20 rounded-full animate-spin border-t-blue-400" />
                <History className="absolute inset-0 m-auto w-6 h-6 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Analyzing {selectedDates.length} satellite images…</p>
                <p className="text-white/40 text-sm mt-1">Fetching from Sentinel-2 archive · Running NDVI + AI analysis</p>
                <p className="text-white/30 text-xs mt-2">This may take a few minutes. Please wait.</p>
              </div>
            </motion.div>
          )}

          {view === "results" && result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("form")}
                  className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
                  ← New Analysis
                </button>
                <button onClick={() => { setTab("past"); loadPastAnalyses(); }}
                  className="ml-auto flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  <Database className="w-4 h-4" /> View in Past Analyses →
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Forest Loss", value: `${result.summary.total_loss_pct.toFixed(1)}%`,      sub: `${result.summary.total_loss_ha.toFixed(0)} hectares`,         color: "text-red-400",    bg: "bg-red-500/5 border-red-500/20",       icon: <TrendingDown className="w-4 h-4 text-red-400" /> },
                  { label: "Annual Rate",        value: `${result.summary.rate_per_year.toFixed(0)} ha/yr`, sub: "Annualized loss",                                              color: "text-orange-400", bg: "bg-orange-500/5 border-orange-500/20", icon: <BarChart3 className="w-4 h-4 text-orange-400" /> },
                  { label: "Biggest Drop",       value: `${result.summary.biggest_drop_pct.toFixed(1)}%`,  sub: result.summary.biggest_drop_date || "single period",            color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20", icon: <Zap className="w-4 h-4 text-yellow-400" /> },
                  { label: "Scans Analyzed",     value: `${result.summary.scans_done}/${result.scan_count + result.summary.scans_skipped}`, sub: `${result.summary.scans_skipped} skipped`,  color: "text-blue-400",   bg: "bg-blue-500/5 border-blue-500/20",     icon: <Leaf className="w-4 h-4 text-blue-400" /> },
                ].map((card, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border p-4 ${card.bg}`}>
                    <div className="flex items-center gap-2 mb-2">{card.icon}<p className="text-xs text-white/40">{card.label}</p></div>
                    <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-[11px] text-white/30 mt-0.5">{card.sub}</p>
                  </motion.div>
                ))}
              </div>
              {result.ai_verdict && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-2">AI Verdict</p>
                  <p className="text-sm text-white/80 leading-relaxed italic">&ldquo;{result.ai_verdict}&rdquo;</p>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-white/3 p-5">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-4">Forest Cover Over Time</p>
                <TimelineChart scans={result.scans} />
              </div>
              <div className="space-y-3">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Individual Scans</p>
                {result.scans.map((scan, i) => <ScanCard key={i} scan={scan} index={i} />)}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* PAST ANALYSES TAB */}
      {tab === "past" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {loadingPast ? (
            <div className="flex items-center justify-center py-20 gap-3 text-white/40">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
              Loading past analyses…
            </div>
          ) : pastAnalyses.length === 0 ? (
            <div className="text-center py-20 text-white/30">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No analyses saved yet.</p>
              <p className="text-xs mt-1">Run your first historical analysis to see it here.</p>
              <button onClick={() => setTab("new")}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/20 transition-all">
                <Plus className="w-4 h-4 inline mr-2" /> Start New Analysis
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">
                  {pastAnalyses.length} saved {pastAnalyses.length === 1 ? "analysis" : "analyses"}
                </p>
                <button onClick={loadPastAnalyses} className="text-xs text-white/30 hover:text-white transition-colors">Refresh</button>
              </div>
              {pastAnalyses.map(a => (
                <SavedAnalysisCard
                  key={a._id}
                  analysis={expandedFullData[a._id] || a}
                  onDelete={handleDelete}
                  onExpand={handleExpand}
                  expanded={expandedId === a._id}
                />
              ))}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
