"use client";

import { PublicAlert } from "@/types/public.types";
import { Virtuoso } from "react-virtuoso";
import { formatDistanceToNow } from "date-fns";
import { ShieldAlert, Crosshair, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

interface PublicThreatFeedProps {
  alerts: PublicAlert[];
}

export function PublicThreatFeed({ alerts }: PublicThreatFeedProps) {
  
  if (alerts.length === 0) {
    return (
      <div className="w-full h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex items-center justify-center">
        <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">No Active Threats Detected</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col overflow-hidden relative">
      
      {/* Animated Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

      {/* Header */}
      <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between z-10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <h2 className="text-sm font-mono tracking-widest text-white uppercase">Live Threat Feed</h2>
        </div>
        <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded">
          {alerts.length} Detected
        </span>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 min-h-0 relative z-0">
        <Virtuoso
          style={{ height: "100%" }}
          data={alerts}
          className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent p-4"
          itemContent={(index, alert) => (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index < 10 ? index * 0.05 : 0 }}
              className="mb-3 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className={alert.severity === 'CRITICAL' ? "text-red-500" : "text-orange-500"} />
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                    alert.severity === 'CRITICAL' 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  {formatDistanceToNow(new Date(alert.date), { addSuffix: true })}
                </span>
              </div>
              
              <h4 className="text-white text-sm font-medium leading-tight mb-2 group-hover:text-cyan-400 transition-colors">
                {alert.message}
              </h4>
              
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded-md border border-white/5">
                  <Crosshair size={12} className="text-cyan-500" />
                  <span className="truncate max-w-[150px]">{alert.zone}</span>
                </div>
                
                {alert.forestLoss && alert.forestLoss !== "0%" && (
                  <div className="flex items-center gap-1 text-xs font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                    <TrendingDown size={12} />
                    {alert.forestLoss} Loss
                  </div>
                )}
              </div>
            </motion.div>
          )}
        />
        
        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#020617] to-transparent pointer-events-none" />
      </div>
    </div>
  );
}
