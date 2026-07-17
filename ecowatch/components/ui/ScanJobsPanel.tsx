"use client";

import { Scan } from "@/types/scan.types";
import { Zone } from "@/types/zone.types";
import { formatDistanceToNow } from "date-fns";
import { Play, RotateCcw, AlertTriangle, CheckCircle2, Loader2, XCircle, FileText, Mail, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";
import { useState, useEffect } from "react";
import { reportsService } from "@/lib/api/reports";
import { toast } from "sonner";

// ── ML Pipeline Stage Progress Bar ───────────────────────────────────────────
const PIPELINE_STAGES = [
  "Fetching Sentinel-2 imagery...",
  "Running NDVI calculation...",
  "Analyzing with Qwen2-VL AI...",
  "Detecting deforestation threats...",
  "Publishing scan results...",
];

function ScanProgressBar({ status }: { status: string }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status !== "pending" && status !== "processing") return;
    const stageInterval = setInterval(() => {
      setStageIdx((i) => (i + 1) % PIPELINE_STAGES.length);
    }, 3500);
    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 95 ? 10 : p + Math.random() * 8));
    }, 600);
    return () => { clearInterval(stageInterval); clearInterval(progressInterval); };
  }, [status]);

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Loader2 size={10} className="text-amber-400 animate-spin shrink-0" />
        <span className="text-[9px] font-mono text-amber-400/80 truncate">
          {PIPELINE_STAGES[stageIdx]}
        </span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 rounded-full"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

interface ScanJobsPanelProps {
  zone: Zone;
  scans: Scan[];
  isLoading: boolean;
  onTriggerScan: (zoneId: string) => void;
  onRetryScan: (scanId: string) => void;
  isTriggering: boolean;
}

export function ScanJobsPanel({ zone, scans, isLoading, onTriggerScan, onRetryScan, isTriggering }: ScanJobsPanelProps) {
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    const toastId = toast.loading("Compiling intelligence report...");
    const success = await reportsService.downloadZoneReportPDF(zone._id, zone.name);
    if (success) toast.success("Report downloaded securely.", { id: toastId });
    else toast.error("Failed to generate report.", { id: toastId });
    setIsGeneratingPDF(false);
  };

  const handleSendEmail = async () => {
    if (!emailInput.includes("@")) {
      toast.error("Invalid email address.");
      return;
    }
    setIsSendingEmail(true);
    const toastId = toast.loading(`Transmitting report to ${emailInput}...`);
    const success = await reportsService.emailZoneReport(zone._id, emailInput);
    if (success) {
      toast.success("Transmission successful.", { id: toastId });
      setShowEmailPrompt(false);
      setEmailInput("");
    } else {
      toast.error("Transmission failed. Check SMTP configuration.", { id: toastId });
    }
    setIsSendingEmail(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="text-emerald-500" size={16} />;
      case "processing": return <Loader2 className="text-cyan-500 animate-spin" size={16} />;
      case "failed": return <XCircle className="text-red-500" size={16} />;
      case "pending": return <RotateCcw className="text-amber-500 animate-pulse" size={16} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-emerald-500 border-emerald-500/20 bg-emerald-500/10";
      case "processing": return "text-cyan-500 border-cyan-500/20 bg-cyan-500/10";
      case "failed": return "text-red-500 border-red-500/20 bg-red-500/10";
      case "pending": return "text-amber-500 border-amber-500/20 bg-amber-500/10";
      default: return "text-zinc-500 border-white/10 bg-white/5";
    }
  };

  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden pointer-events-auto">
      
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex flex-col gap-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent pointer-events-none" />
        
        <div className="flex items-center justify-between relative z-10">
          <h2 className="text-xs font-mono tracking-widest uppercase text-white">Zone Analysis</h2>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-500/20">
            {zone.name}
          </span>
        </div>

        <button 
          onClick={() => onTriggerScan(zone._id)}
          disabled={isTriggering}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-white/5 hover:bg-cyan-500/20 text-white hover:text-cyan-400 border border-white/10 hover:border-cyan-500/50 transition-all py-2.5 rounded-lg text-xs font-mono uppercase tracking-widest disabled:opacity-50"
        >
          {isTriggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {isTriggering ? "Initializing..." : "Trigger Manual Scan"}
        </button>

        {/* Info: Processing time notice */}
        {scans.some(s => s.status === "pending" || s.status === "processing") && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded-lg mt-1">
            <Loader2 size={11} className="text-amber-400 animate-spin shrink-0 mt-0.5" />
            <p className="text-[9px] font-mono text-amber-400/80 leading-relaxed">
              ML pipeline active — Sentinel-2 imagery fetch + Qwen2-VL analysis takes <strong>5–10 minutes</strong>. Results will appear automatically below.
            </p>
          </div>
        )}


        {/* Intelligence Report Actions */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <button 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-400 border border-white/10 hover:border-emerald-500/50 transition-all py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest disabled:opacity-50"
            title="Download PDF Report"
          >
            {isGeneratingPDF ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            Download
          </button>
          <button 
            onClick={() => setShowEmailPrompt(!showEmailPrompt)}
            className={`w-full flex items-center justify-center gap-2 transition-all py-2 rounded-lg text-[10px] font-mono uppercase tracking-widest border ${showEmailPrompt ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-white/5 hover:bg-indigo-500/20 text-white hover:text-indigo-400 border-white/10 hover:border-indigo-500/50'}`}
            title="Email Report"
          >
            <Mail size={12} />
            Email
          </button>
        </div>

        {/* Email Prompt Expansion */}
        <AnimatePresence>
          {showEmailPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 flex gap-2">
                <input 
                  type="email"
                  placeholder="officer@ecowatch.gov"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded text-xs px-3 py-1.5 font-mono text-white outline-none focus:border-indigo-500/50"
                  autoFocus
                />
                <button 
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !emailInput}
                  className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/40 px-3 rounded flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  {isSendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scans List */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-xs gap-2">
            <Loader2 className="animate-spin" size={14} /> Fetching scan logs...
          </div>
        ) : scans.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 font-mono text-xs gap-2 text-center px-4">
            <AlertTriangle size={24} className="text-amber-500/50 mb-2" />
            No ML pipeline scans have been executed for this zone yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <TooltipProvider delayDuration={200}>
              {scans.map((scan, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={scan._id}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${getStatusColor(scan.status)} transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(scan.status)}
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                        {scan.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono opacity-60">
                      {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Progress bar for pending/processing scans */}
                  {(scan.status === "pending" || scan.status === "processing") && (
                    <ScanProgressBar status={scan.status} />
                  )}

                  {scan.status === 'completed' && scan.results && (() => {
                    const r = scan.results;
                    const severityColor: Record<string, string> = {
                      none:     "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                      low:      "text-yellow-400  bg-yellow-500/10  border-yellow-500/30",
                      medium:   "text-orange-400  bg-orange-500/10  border-orange-500/30",
                      high:     "text-red-400     bg-red-500/10     border-red-500/30",
                      critical: "text-red-300     bg-red-900/30     border-red-400/50",
                    };
                    const threatColors: Record<string, string> = {
                      deforestation:        "bg-red-500/20 text-red-300 border-red-500/30",
                      illegal_mining:       "bg-orange-500/20 text-orange-300 border-orange-500/30",
                      agricultural_expansion: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                      water_pollution:      "bg-blue-500/20 text-blue-300 border-blue-500/30",
                      urban_encroachment:   "bg-purple-500/20 text-purple-300 border-purple-500/30",
                      fire_damage:          "bg-red-600/20 text-red-400 border-red-600/30",
                    };
                    const landBars = [
                      { label: "Forest",  pct: r.forestPercentage,     color: "bg-emerald-500" },
                      { label: "Veg",     pct: r.vegetationPercentage, color: "bg-lime-500" },
                      { label: "Water",   pct: r.waterPercentage,      color: "bg-cyan-500" },
                      { label: "Bare",    pct: r.bareSoilPercentage,   color: "bg-orange-500" },
                    ];
                    const realThreats = (r.threats || []).filter(t => t && t !== "none");

                    return (
                      <div className="mt-2 flex flex-col gap-3">

                        {/* Row 1: Deforestation + Severity + Confidence */}
                        <div className="grid grid-cols-3 gap-1.5">
                          <div className="bg-black/30 p-2 rounded-lg flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase tracking-widest text-white/40">Status</span>
                            <span className={`text-[10px] font-mono font-bold ${r.deforestationDetected ? "text-red-400" : "text-emerald-400"}`}>
                              {r.deforestationDetected ? "⚠ DETECTED" : "✓ CLEAR"}
                            </span>
                          </div>
                          <div className="bg-black/30 p-2 rounded-lg flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase tracking-widest text-white/40">Severity</span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border w-fit ${severityColor[r.severity] || severityColor.none}`}>
                              {(r.severity || "none").toUpperCase()}
                            </span>
                          </div>
                          <div className="bg-black/30 p-2 rounded-lg flex flex-col gap-0.5">
                            <span className="text-[8px] uppercase tracking-widest text-white/40">AI Conf.</span>
                            <span className={`text-[10px] font-mono font-bold uppercase ${
                              r.vlConfidence === "high" ? "text-emerald-400" :
                              r.vlConfidence === "medium" ? "text-yellow-400" : "text-red-400"
                            }`}>{r.vlConfidence || "N/A"}</span>
                          </div>
                        </div>

                        {/* Row 2: NDVI land cover breakdown */}
                        <div className="bg-black/30 p-2.5 rounded-lg">
                          <p className="text-[8px] uppercase tracking-widest text-white/40 mb-2">NDVI Land Cover</p>
                          <div className="space-y-1.5">
                            {landBars.map(b => (
                              <div key={b.label} className="flex items-center gap-2">
                                <span className="text-[9px] text-white/50 w-10 font-mono">{b.label}</span>
                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${b.color}`}
                                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-white/60 font-mono w-9 text-right">
                                  {b.pct?.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[8px] text-white/30 mt-1.5 font-mono">
                            NDVI mean: {r.ndviMean?.toFixed(3)} &nbsp;|&nbsp; min: {r.ndviMin?.toFixed(3)} &nbsp;|&nbsp; max: {r.ndviMax?.toFixed(3)}
                          </p>
                        </div>

                        {/* Row 3: Detected threats */}
                        {realThreats.length > 0 && (
                          <div className="bg-black/30 p-2.5 rounded-lg">
                            <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1.5">Detected Threats</p>
                            <div className="flex flex-wrap gap-1">
                              {realThreats.map(t => (
                                <span key={t} className={`text-[9px] px-2 py-0.5 rounded-full border font-mono ${threatColors[t] || "bg-white/10 text-white/60 border-white/20"}`}>
                                  {t.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                            {(r.affectedAreas || []).length > 0 && (
                              <p className="text-[8px] text-white/30 mt-1 font-mono">
                                Areas: {r.affectedAreas.join(", ")}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Row 4: AI description */}
                        {r.description && (
                          <div className="bg-black/30 p-2.5 rounded-lg">
                            <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">AI Analysis</p>
                            <p className="text-[10px] text-white/60 leading-relaxed font-mono line-clamp-4">
                              {r.description}
                            </p>
                          </div>
                        )}

                      </div>
                    );
                  })()}

                  {scan.status === 'failed' && (
                    <div className="mt-2 flex items-center justify-between bg-black/20 p-2 rounded">
                      <span className="text-[10px] font-mono truncate text-red-400/80 w-[70%]">
                        {scan.failReason || "Pipeline execution failed"}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={() => onRetryScan(scan._id)}
                            className="text-white bg-white/10 hover:bg-white/20 p-1.5 rounded transition-colors"
                          >
                            <RotateCcw size={12} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white">
                          Retry Scan
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </motion.div>
              ))}
            </TooltipProvider>
          </div>
        )}
      </div>

    </div>
  );
}
