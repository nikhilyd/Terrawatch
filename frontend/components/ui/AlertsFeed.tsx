"use client";

import { motion } from "framer-motion";
import { Alert } from "@/types/dashboard.types";
import { formatDistanceToNow } from "date-fns";
import {
  Crosshair, MapPin, CheckCircle2, ShieldAlert, Satellite, UserCheck, AlertTriangle, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertsFeedProps {
  alerts: Alert[];
  onFocus: (coords: [number, number]) => void;
  onResolve: (id: string) => void;
  onViewDetails: (alert: Alert) => void;
  riskScores: any[];
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; bg: string; border: string; dot: string }> = {
    CRITICAL: { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/25",    dot: "bg-red-400"    },
    HIGH:     { color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/25",  dot: "bg-amber-400"  },
    MEDIUM:   { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/25", dot: "bg-yellow-400" },
    LOW:      { color: "text-blue-400",bg: "bg-blue-500/10",border: "border-blue-500/25",dot: "bg-blue-400"},
  };
  const c = config[severity] ?? config.LOW;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border", c.color, c.bg, c.border)}>
      <span className={cn("w-1 h-1 rounded-full", c.dot)} />
      {severity}
    </span>
  );
}

export function AlertsFeed({ alerts, onFocus, onResolve, onViewDetails, riskScores }: AlertsFeedProps) {
  const activeAlerts = alerts.filter((a) => a.status !== "RESOLVED" && a.status !== "FALSE_ALARM");

  return (
    <div className="w-[360px] h-full flex flex-col gap-3">

      {/* Live Alert Feed */}
      <div className="glass rounded-2xl p-5 flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={11} className="text-red-400" />
            </div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white">
              Live Alert Feed
            </h3>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full glass text-[10px] font-semibold text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            {activeAlerts.length} Active
          </div>
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {activeAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3">
              <div className="w-10 h-10 rounded-2xl glass-blue flex items-center justify-center">
                <CheckCircle2 size={18} className="text-blue-400" />
              </div>
              <p className="text-xs text-zinc-500 text-center">No active threats detected.</p>
            </div>
          ) : (
            activeAlerts.map((alert, idx) => (
              <motion.div
                key={alert._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="group relative glass rounded-xl p-3.5 cursor-pointer hover:glass-strong transition-all duration-200"
                onClick={() => {
                  if (alert.hotspot) onFocus([alert.hotspot.lat, alert.hotspot.lng]);
                  else onFocus([20.5937, 78.9629]);
                }}
              >
                {/* Severity left bar */}
                <div className={cn(
                  "absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full",
                  alert.severity === "CRITICAL" ? "bg-red-500" :
                  alert.severity === "HIGH" ? "bg-amber-500" :
                  alert.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                )} />

                <div className="flex items-center justify-between mb-2 pl-2">
                  <div className="flex items-center gap-1.5">
                    <SeverityBadge severity={alert.severity} />
                    {(alert as any).source === "field_report" ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-semibold text-orange-400">
                        <UserCheck size={8} /> Field
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-semibold text-cyan-400">
                        <Satellite size={8} /> Orbital
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-600 font-mono shrink-0">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-snug line-clamp-2 pl-2 mb-2">
                  {alert.message}
                </p>

                {alert.hotspot && (
                  <div className="flex items-center gap-1.5 pl-2 text-[9px] font-mono text-zinc-600 mb-3">
                    <MapPin size={10} className="text-zinc-500" />
                    {alert.hotspot.lat.toFixed(4)}, {alert.hotspot.lng.toFixed(4)}
                  </div>
                )}

                {/* Action row — appears on hover */}
                <div className="flex items-center gap-1.5 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); onResolve(alert._id); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-[9px] font-semibold uppercase tracking-wider transition-colors"
                  >
                    <CheckCircle2 size={10} /> Resolve
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (alert.hotspot) onFocus([alert.hotspot.lat, alert.hotspot.lng]);
                      else onFocus([20.5937, 78.9629]);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[9px] font-semibold uppercase tracking-wider transition-colors"
                  >
                    <Crosshair size={10} /> Focus
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewDetails(alert); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg glass hover:glass-strong text-zinc-300 text-[9px] font-semibold uppercase tracking-wider transition-all"
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Top Risk Zones */}
      {riskScores.length > 0 && (
        <div className="glass rounded-2xl p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center">
              <Zap size={10} className="text-red-400" />
            </div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-red-400">
              Top Risk Zones
            </h3>
          </div>
          <div className="flex flex-col gap-1">
            {[...riskScores]
              .sort((a, b) => b.riskScore - a.riskScore)
              .slice(0, 5)
              .map((zone: any, i: number) => {
                const score = zone.riskScore ?? 0;
                const color = score >= 75 ? "text-red-400" : score >= 50 ? "text-amber-400" : score >= 25 ? "text-yellow-400" : "text-blue-400";
                const bar = score >= 75 ? "bg-red-500" : score >= 50 ? "bg-amber-500" : score >= 25 ? "bg-yellow-500" : "bg-blue-500";
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                    <span className={cn("text-[10px] text-zinc-600 tabular-nums w-4 shrink-0", color)}>
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-zinc-300 truncate">{zone.zoneName}</span>
                        <span className={cn("text-[10px] font-bold tabular-nums shrink-0 ml-2", color)}>
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full h-0.5 bg-white/5 rounded-full">
                        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                    <a
                      href="/legal"
                      className="shrink-0 text-[9px] font-semibold text-cyan-500 hover:text-cyan-300 border border-cyan-500/20 px-1.5 py-0.5 rounded-lg hover:bg-cyan-500/10 transition-all"
                    >
                      FIR
                    </a>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
