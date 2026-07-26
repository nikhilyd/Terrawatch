"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMouse } from "react-use";
import { PublicStats } from "@/types/public.types";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Globe, Satellite, AlertTriangle, Wind, Target } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface MetricsGridProps {
  stats: PublicStats;
}

function Card({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { docX, docY } = useMouse(ref as any);
  const [isHovered, setIsHovered] = useState(false);

  const x = ref.current ? docX - ref.current.getBoundingClientRect().left : 0;
  const y = ref.current ? docY - ref.current.getBoundingClientRect().top : 0;

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5 }}
      className={`relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 ${className}`}
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(circle 150px at ${x}px ${y}px, rgba(6,182,212,0.15), transparent 100%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

export function MetricsGrid({ stats }: MetricsGridProps) {
  const forestCoverage = parseFloat(stats.monitoring.averageForestCoverage) || 0;

  // Mock data for the sparkline chart
  const sparklineData = [
    { value: 20 }, { value: 35 }, { value: 45 }, { value: 30 },
    { value: 60 }, { value: 80 }, { value: 100 }, { value: stats.environment.co2EstimateTonnes }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Forest Coverage Circle */}
      <Card className="flex flex-col items-center justify-center text-center">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Globe size={14} className="text-cyan-500" /> Average Forest Health
        </h3>
        <div className="w-32 h-32 mb-4">
          <CircularProgressbarWithChildren
            value={forestCoverage}
            strokeWidth={4}
            styles={buildStyles({
              pathColor: "#3b82f6",
              trailColor: "rgba(255,255,255,0.05)",
              strokeLinecap: "round"
            })}
          >
            <div className="text-2xl font-bold font-mono text-white">{forestCoverage}%</div>
          </CircularProgressbarWithChildren>
        </div>
        <p className="text-xs text-zinc-400 font-mono">Monitored via NDVI Satellite Imagery</p>
      </Card>

      {/* CO2 Emissions Prevented with Recharts */}
      <Card className="flex flex-col justify-between">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Wind size={14} className="text-blue-500" /> CO₂ Tracking (Est.)
        </h3>
        
        <div className="flex-1 min-h-[60px] w-full mt-2 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 mb-2">
          <span className="text-5xl font-bold font-mono text-blue-400 tracking-tighter">
            {stats.environment.co2EstimateTonnes.toLocaleString()}
          </span>
          <span className="text-sm text-blue-500/50 ml-2">Tonnes</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-zinc-300">Economic Value: <span className="text-white font-mono">₹{stats.environment.co2EstimateLakhsINR} Lakhs</span></span>
          <span className="text-[10px] text-zinc-600">{stats.environment.note}</span>
        </div>
      </Card>

      {/* Global AI Scans */}
      <Card className="flex flex-col justify-between">
        <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Satellite size={14} className="text-cyan-500" /> AI Scans Executed
        </h3>
        <div className="mt-6 mb-4">
          <span className="text-6xl font-bold tracking-tighter text-white">
            {stats.monitoring.totalSatelliteScans.toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono">Across {stats.monitoring.totalZonesMonitored} Global Zones</p>
      </Card>

      {/* Active Threats */}
      <Card className="flex flex-col justify-between border-red-500/20 bg-red-950/10">
        <h3 className="text-xs font-mono text-red-500 uppercase tracking-widest flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" /> Active Global Threats
        </h3>
        <div className="mt-6 mb-4 flex items-end gap-3">
          <span className="text-6xl font-bold tracking-tighter text-red-500">
            {stats.alerts.activeThreats}
          </span>
          <span className="text-xs font-mono text-red-500/70 mb-2">CRITICAL: {stats.alerts.criticalAlerts}</span>
        </div>
        
        {stats.spotlight.mostDangerousZone ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-red-400 mb-1">
              <Target size={12} /> MOST TARGETED ZONE
            </div>
            <div className="text-sm text-white">{stats.spotlight.mostDangerousZone.name}</div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 font-mono">No active threats right now.</p>
        )}
      </Card>

    </div>
  );
}
