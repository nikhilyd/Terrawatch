"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, ShieldAlert, FileText, CloudRain, TreeDeciduous,
  DollarSign, Activity, AlertTriangle, Loader2, Database,
  Leaf, Droplets, Mountain, Cloud, SkipForward, CheckCircle2,
  TrendingDown, BarChart3,
} from "lucide-react";
import { legalService } from "@/lib/api/legal";
import { ZoneRiskData, SingleZoneRiskData, CarbonLossData } from "@/types/legal.types";
import { toast } from "sonner";
import { LegalBackground } from "@/components/ui/LegalBackground";

// ── Circular Risk Ring ────────────────────────────────────────────────────────
const RiskRing = ({ score, color }: { score: number; color: string }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-12 h-12">
      <svg className="transform -rotate-90 w-12 h-12">
        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/10" />
        <motion.circle
          cx="24" cy="24" r={radius} stroke={color} strokeWidth="4" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ strokeLinecap: "round" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono font-bold text-white">{score}</span>
      </div>
    </div>
  );
};

// ── Metric Mini-Card ──────────────────────────────────────────────────────────
const MetricCard = ({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string; sub?: string; icon: any; color: string;
}) => (
  <div className="bg-black/40 border border-white/8 rounded-xl p-3 flex flex-col gap-1">
    <div className="flex items-center gap-1.5 mb-0.5">
      <Icon size={11} className={color} />
      <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{label}</span>
    </div>
    <span className={`text-lg font-mono font-bold ${color}`}>{value}</span>
    {sub && <span className="text-[9px] text-white/30 font-mono">{sub}</span>}
  </div>
);

export default function LegalDashboard() {
  const [riskScores,       setRiskScores]       = useState<ZoneRiskData[]>([]);
  const [selectedZoneId,   setSelectedZoneId]   = useState<string | null>(null);
  const [isLoadingList,    setIsLoadingList]     = useState(true);
  const [zoneRisk,         setZoneRisk]          = useState<SingleZoneRiskData | null>(null);
  const [carbonLoss,       setCarbonLoss]        = useState<CarbonLossData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails]  = useState(false);
  const [isGeneratingFIR,  setIsGeneratingFIR]   = useState(false);
  const [showUSD,          setShowUSD]           = useState(false);

  useEffect(() => { fetchLeaderboard(); }, []);

  useEffect(() => {
    if (selectedZoneId) fetchZoneDetails(selectedZoneId);
  }, [selectedZoneId]);

  const fetchLeaderboard = async () => {
    setIsLoadingList(true);
    const res = await legalService.getAllRiskScores();
    if (res.success) setRiskScores(res.data);
    setIsLoadingList(false);
  };

  const fetchZoneDetails = async (id: string) => {
    setIsLoadingDetails(true);
    const [riskRes, carbonRes] = await Promise.all([
      legalService.getZoneRiskScore(id),
      legalService.getCarbonLoss(id),
    ]);
    if (riskRes.success) setZoneRisk(riskRes.data);
    setCarbonLoss(carbonRes.success && carbonRes.data ? carbonRes.data : null);
    setIsLoadingDetails(false);
  };

  const handleGenerateFIR = async () => {
    if (!selectedZoneId || !zoneRisk) return;
    setIsGeneratingFIR(true);
    toast.info("Compiling Satellite Evidence & Generating FIR...");
    const success = await legalService.downloadFIRReport(selectedZoneId, zoneRisk.zone.name);
    if (success) toast.success("Legal FIR PDF Generated Successfully!");
    else toast.error("Failed to generate FIR. Ensure zone has completed scans.");
    setIsGeneratingFIR(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "CRITICAL": return "#ef4444";
      case "HIGH":     return "#f97316";
      case "MEDIUM":   return "#eab308";
      case "LOW":      return "#10b981";
      default:         return "#94a3b8";
    }
  };

  const getRiskBgClass = (level: string) => {
    switch (level) {
      case "CRITICAL": return "bg-red-500/10 border-red-500/30";
      case "HIGH":     return "bg-orange-500/10 border-orange-500/30";
      case "MEDIUM":   return "bg-yellow-500/10 border-yellow-500/30";
      case "LOW":      return "bg-emerald-500/10 border-emerald-500/30";
      default:         return "bg-white/5 border-white/10";
    }
  };

  // FIR enabled if ≥2 done historical scans OR carbon loss data exists
  const firEnabled = !isGeneratingFIR && (
    (zoneRisk?.breakdown?.scansDone ?? 0) >= 2 || !!carbonLoss
  );

  return (
    <div className="relative min-h-screen bg-black pt-20 px-6 pb-6 overflow-hidden flex flex-col">
      <LegalBackground />

      {/* Header */}
      <div className="mb-6 flex items-center justify-between relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Scale className="text-indigo-500" size={32} />
            Legal & Impact Assessment
          </h1>
          <p className="text-zinc-400 mt-1 font-mono text-xs uppercase tracking-widest">
            Enforcement Command Center • Global Risk Leaderboard
          </p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 h-[calc(100vh-140px)] relative z-10">

        {/* ── LEFT: Global Risk Leaderboard ────────────────────────────────── */}
        <div className="w-[40%] flex flex-col bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
            <h2 className="text-sm font-mono tracking-widest text-white uppercase flex items-center gap-2">
              <Activity size={16} className="text-red-500" />
              Global Risk Leaderboard
            </h2>
            <span className="text-[10px] font-mono text-white/30">{riskScores.length} zones</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 space-y-2">
            {isLoadingList ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-mono text-xs">CALCULATING GLOBAL THREAT MATRIX...</span>
              </div>
            ) : (
              riskScores.map((zone, idx) => (
                <motion.div
                  key={zone.zoneId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedZoneId(String(zone.zoneId))}
                  className={`p-4 rounded-xl border transition-all cursor-pointer group
                    ${selectedZoneId === String(zone.zoneId) ? getRiskBgClass(zone.riskLevel) : "bg-black/40 border-white/5 hover:border-white/20"}
                    ${!zone.hasData ? "opacity-60" : ""}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-5 text-center font-mono text-zinc-500 text-xs">#{idx + 1}</div>
                      <div>
                        <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors block">
                          {zone.zoneName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-mono text-zinc-500">
                            {zone.area_km2.toFixed(2)} km²
                          </span>
                          <span className="text-[10px] font-mono text-zinc-600">•</span>
                          {zone.hasData ? (
                            <span className="text-[10px] font-mono text-emerald-500/70 flex items-center gap-1">
                              <CheckCircle2 size={9} />
                              {zone.scansDone} scans
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-600 flex items-center gap-1">
                              <Database size={9} />
                              no analysis yet
                            </span>
                          )}
                          {zone.alerts3mo > 0 && (
                            <span className="text-[10px] font-mono text-red-400/70">
                              {zone.alerts3mo} alerts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-mono tracking-widest uppercase opacity-80"
                          style={{ color: getRiskColor(zone.riskLevel) }}>
                          {zone.riskLevel}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {zone.ndviLoss > 0 ? `-${zone.ndviLoss}% NDVI` : "STABLE"}
                        </span>
                      </div>
                      <RiskRing score={zone.riskScore} color={getRiskColor(zone.riskLevel)} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Impact Details & Legal Action ─────────────────────────── */}
        <div className="w-[60%] bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          <AnimatePresence mode="wait">
            {!selectedZoneId ? (
              <motion.div key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-4"
              >
                <Scale size={64} className="opacity-20" />
                <p className="font-mono tracking-widest uppercase text-sm">Select a Zone for Impact Analysis</p>
              </motion.div>

            ) : isLoadingDetails ? (
              <motion.div key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3"
              >
                <Loader2 className="animate-spin" size={32} />
                <span className="font-mono text-xs tracking-widest uppercase">Fetching Legal & Impact Records...</span>
              </motion.div>

            ) : zoneRisk ? (
              <motion.div key="details"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col p-6 overflow-y-auto gap-6"
              >
                {/* ── Zone Header ─────────────────────────────────────────── */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{zoneRisk.zone.name}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-mono text-zinc-400">
                        {zoneRisk.zone.area_km2.toFixed(2)} km²
                      </p>
                      {/* Data source badge */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 ${
                        zoneRisk.dataSource === "historical_analysis"
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-500"
                      }`}>
                        <Database size={8} />
                        {zoneRisk.dataSource === "historical_analysis" ? "Historical Analysis" : "No Analysis Data"}
                      </span>
                      {zoneRisk.breakdown.lastScanDate && (
                        <span className="text-[9px] font-mono text-zinc-500">
                          Last scan: {zoneRisk.breakdown.lastScanDate}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border flex flex-col items-end ${getRiskBgClass(zoneRisk.riskLevel)}`}>
                    <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">Overall Risk</span>
                    <span className="text-lg font-bold" style={{ color: getRiskColor(zoneRisk.riskLevel) }}>
                      {zoneRisk.riskLevel} ({zoneRisk.riskScore}/100)
                    </span>
                  </div>
                </div>

                {/* ── NDVI + Scan Stats ────────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-3">
                  <MetricCard label="NDVI Loss"     value={`${zoneRisk.breakdown.ndviLoss}%`}
                    sub="vs baseline" icon={TrendingDown} color="text-red-400" />
                  <MetricCard label="Forest Cover"  value={`${zoneRisk.breakdown.forestPct.toFixed(1)}%`}
                    sub="latest scan" icon={Leaf} color="text-emerald-400" />
                  <MetricCard label="NDVI Mean"     value={zoneRisk.breakdown.ndviMean.toFixed(3)}
                    sub="latest scan" icon={BarChart3} color="text-cyan-400" />
                  <MetricCard label="Alerts (3mo)"  value={String(zoneRisk.breakdown.alerts3mo)}
                    sub="recent" icon={ShieldAlert} color="text-orange-400" />
                </div>

                {/* ── Scan Coverage Stats ──────────────────────────────────── */}
                {zoneRisk.dataSource === "historical_analysis" && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <CheckCircle2 size={11} className="text-emerald-500" />
                      <span className="text-zinc-400">{zoneRisk.breakdown.scansDone} scans analyzed</span>
                    </div>
                    {zoneRisk.breakdown.scansSkipped > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <SkipForward size={11} className="text-zinc-600" />
                        <span className="text-zinc-600">{zoneRisk.breakdown.scansSkipped} skipped (cloud cover)</span>
                      </div>
                    )}
                    {zoneRisk.breakdown.totalLossHa > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        <TrendingDown size={11} className="text-red-500" />
                        <span className="text-red-400/70">{zoneRisk.breakdown.totalLossHa.toFixed(2)} ha total loss</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Threats ─────────────────────────────────────────────── */}
                {zoneRisk.breakdown.threats && zoneRisk.breakdown.threats.filter(t => t && t !== "none").length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Threats:</span>
                    {zoneRisk.breakdown.threats.filter(t => t && t !== "none").map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* ── Carbon & Economic Impact ─────────────────────────────── */}
                <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <CloudRain size={100} />
                  </div>
                  <h3 className="text-sm font-mono uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                    <CloudRain size={16} />
                    Environmental & Economic Impact
                  </h3>

                  {carbonLoss ? (
                    <>
                      {/* Period */}
                      <div className="flex items-center gap-4 mb-4 text-[10px] font-mono text-zinc-500">
                        <span>Period: <span className="text-zinc-300">{carbonLoss.period.from} → {carbonLoss.period.to}</span></span>
                        <span>Scans: <span className="text-emerald-400">{carbonLoss.period.scans} done</span></span>
                        {carbonLoss.period.skipped > 0 && (
                          <span className="text-zinc-600">{carbonLoss.period.skipped} cloud-skipped</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6 relative z-10">
                        <div className="flex flex-col gap-4">
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Est. CO₂ Released</span>
                            <div className="text-3xl font-mono font-bold text-white mt-1">
                              {carbonLoss.carbonImpact.co2TonnesLost.toLocaleString()}
                              <span className="text-sm text-zinc-500 ml-1">tonnes</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Trees Destroyed</span>
                            <div className="text-xl font-mono font-bold text-red-400 mt-1 flex items-center gap-2">
                              <TreeDeciduous size={18} />
                              {carbonLoss.carbonImpact.treesLost.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Deforested Area</span>
                            <div className="text-lg font-mono font-bold text-orange-400 mt-1">
                              {carbonLoss.deforestation.deforestedHa.toFixed(2)} ha
                              <span className="text-sm text-zinc-500 ml-1">
                                ({carbonLoss.deforestation.forestLossPct.toFixed(1)}% loss)
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center border-l border-white/10 pl-6">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Economic Damage</span>
                            <button
                              onClick={() => setShowUSD(!showUSD)}
                              className="text-[10px] font-mono bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors"
                            >
                              Show {showUSD ? "INR" : "USD"}
                            </button>
                          </div>
                          <div className="text-3xl font-mono font-bold text-amber-400 flex items-center gap-1">
                            {showUSD ? <DollarSign size={22} /> : "₹"}
                            {showUSD
                              ? carbonLoss.carbonImpact.economicDamage.usd.toLocaleString()
                              : `${carbonLoss.carbonImpact.economicDamage.inrLakhs} Lakhs`
                            }
                          </div>
                          <span className="text-[9px] font-mono text-zinc-600 mt-2">
                            {carbonLoss.carbonImpact.economicDamage.basis}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center flex flex-col items-center text-zinc-500">
                      <AlertTriangle size={28} className="mb-2 opacity-50" />
                      <p className="font-mono text-xs uppercase tracking-widest">
                        {zoneRisk.breakdown.scansDone < 2
                          ? "Insufficient Data — Run Historical Analysis First"
                          : "Carbon data unavailable"}
                      </p>
                      {zoneRisk.breakdown.scansDone < 2 && (
                        <p className="text-[10px] mt-1 opacity-60">
                          Requires at least 2 completed scans to calculate temporal forest loss.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── AI Recommendation + FIR ──────────────────────────────── */}
                <div className="mt-auto space-y-3">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                    <ShieldAlert size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-mono font-bold text-red-400 uppercase mb-1">AI Recommendation</h4>
                      <p className="text-sm text-red-200/80">{zoneRisk.recommendation}</p>
                    </div>
                  </div>

                  <button
                    id="generate-fir-btn"
                    onClick={handleGenerateFIR}
                    disabled={!firEnabled}
                    className="w-full relative overflow-hidden group bg-red-600 hover:bg-red-500 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isGeneratingFIR
                      ? <Loader2 className="animate-spin relative z-10" size={22} />
                      : <FileText className="relative z-10" size={22} />
                    }
                    <span className="font-mono font-bold tracking-widest uppercase relative z-10">
                      {isGeneratingFIR ? "Compiling Satellite Evidence..." : "Generate Legal FIR (PDF)"}
                    </span>
                    {firEnabled && !isGeneratingFIR && (
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        animate={{ opacity: [0, 0.4, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </button>

                  {!firEnabled && (
                    <p className="text-center text-[10px] text-zinc-500 font-mono">
                      FIR requires ≥2 completed historical scans.
                      {zoneRisk.breakdown.scansDone > 0
                        ? ` (${zoneRisk.breakdown.scansDone}/2 available)`
                        : " Run Historical Analysis first."}
                    </p>
                  )}
                </div>

              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
