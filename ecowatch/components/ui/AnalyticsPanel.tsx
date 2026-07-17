"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { AnalyticsResponse, AlertsOverTimeResponse } from "@/types/dashboard.types";
import { SignalHigh, ServerCrash, TrendingUp, Satellite, History, AlertTriangle, Cpu, TreePine, ShieldAlert } from "lucide-react";
import Link from "next/link";

interface AnalyticsPanelProps {
  analytics: AnalyticsResponse | null;
  alertsOverTime: AlertsOverTimeResponse | null;
  riskScores: any[];
}

const COLORS = ["#10b981", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"];

export function AnalyticsPanel({ analytics, alertsOverTime, riskScores }: AnalyticsPanelProps) {
  const [campaigns, setCampaigns] = useState<{ active: number; paused: number; completed: number; totalScansLeft: number }>(
    { active: 0, paused: 0, completed: 0, totalScansLeft: 0 }
  );

  // Real telemetry state
  const [apiLatency, setApiLatency]     = useState<number | null>(null);
  const [mlOnline,   setMlOnline]       = useState<boolean | null>(null);
  const [zoneCount,  setZoneCount]      = useState<number>(0);
  const [todayAlerts, setTodayAlerts]   = useState<number>(0);
  const [topRiskZone, setTopRiskZone]   = useState<{ name: string; score: number } | null>(null);

  // New feature states
  const [avgForestPct,  setAvgForestPct]  = useState<number | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [threatTypes,   setThreatTypes]   = useState<{ threat: string; count: number; color: string }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // ── 1. Real API Latency ──────────────────────────────────────────────────
    const measureLatency = async () => {
      const t0 = performance.now();
      try {
        await fetch("http://localhost:5000/api/public/stats");
        setApiLatency(Math.round(performance.now() - t0));
      } catch { setApiLatency(null); }
    };
    measureLatency();
    const latencyInterval = setInterval(measureLatency, 30_000);

    // ── 2. ML Service Health ─────────────────────────────────────────────────
    const checkML = async () => {
      try {
        const r = await fetch("http://localhost:8001/api/health", { signal: AbortSignal.timeout(3000) });
        setMlOnline(r.ok);
      } catch { setMlOnline(false); }
    };
    checkML();
    const mlInterval = setInterval(checkML, 60_000);

    // ── 3. Zone Count + Today's Alerts + Highest Risk Zone ──────────────────
    const fetchExtra = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [zonesRes, riskRes] = await Promise.all([
          fetch("http://localhost:5000/api/zones",             { headers }).then(r => r.json()),
          fetch("http://localhost:5000/api/legal/risk-scores", { headers }).then(r => r.json()),
        ]);

        if (zonesRes.success) setZoneCount(zonesRes.data?.length ?? 0);

        if (riskRes.success && riskRes.data?.length > 0) {
          const sorted = [...riskRes.data].sort((a: any, b: any) => b.riskScore - a.riskScore);
          setTopRiskZone({ name: sorted[0].zoneName, score: sorted[0].riskScore });
          // F2: avg forest coverage
          const withForest = riskRes.data.filter((z: any) => z.forestPct !== null && z.forestPct !== undefined);
          if (withForest.length > 0) {
            const avg = withForest.reduce((s: number, z: any) => s + z.forestPct, 0) / withForest.length;
            setAvgForestPct(Math.round(avg * 10) / 10);
          }
        }

        // Today's alerts count
        const alertsRes = await fetch("http://localhost:5000/api/alerts", { headers }).then(r => r.json());
        if (alertsRes.success) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const count = (alertsRes.data ?? []).filter((a: any) => new Date(a.createdAt) >= today).length;
          setTodayAlerts(count);
        }

        // F3: Threat type breakdown
        const threatRes = await fetch("http://localhost:5000/api/analytics/threat-types", { headers }).then(r => r.json());
        if (threatRes.success) setThreatTypes(threatRes.data ?? []);

        // F5: Recent historical analyses (last 3)
        const histRes = await fetch("http://localhost:5000/api/historical?limit=3", { headers }).then(r => r.json());
        if (histRes.success) setRecentAnalyses((histRes.data ?? []).slice(0, 3));

      } catch { /* silent */ }
    };
    fetchExtra();

    // ── 4. Campaign counts (existing) ────────────────────────────────────────
    fetch("http://localhost:5000/api/campaigns", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const list = d.data as any[];
          const active    = list.filter(c => c.status === "active").length;
          const paused    = list.filter(c => c.status === "paused").length;
          const completed = list.filter(c => c.status === "completed").length;
          const totalScansLeft = list
            .filter(c => c.status === "active")
            .reduce((sum: number, c: any) => sum + (c.scans?.filter((s: any) => s.status === "pending").length ?? 0), 0);
          setCampaigns({ active, paused, completed, totalScansLeft });
        }
      })
      .catch(() => {});

    return () => {
      clearInterval(latencyInterval);
      clearInterval(mlInterval);
    };
  }, []);

  // Format data for Recharts Pie
  const chartData = analytics?.data.labels.map((label, index) => ({
    name: label.replace("_", " "),
    value: analytics.data.data[index],
  })) || [];

  // Format data for Recharts Bar
  const overTimeData = alertsOverTime?.data.labels.map((label, index) => {
    const dataPoint: any = { name: label };
    alertsOverTime.data.datasets.forEach(ds => {
      dataPoint[ds.label] = ds.data[index];
    });
    return dataPoint;
  }) || [];

  return (
    <div className="w-[320px] h-full flex flex-col gap-4 overflow-y-auto scrollbar-none pb-4">
      
      {/* System Status Module — REAL DATA */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">System Telemetry</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Real API Latency */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <SignalHigh size={16} className={apiLatency !== null && apiLatency < 100 ? "text-emerald-400" : "text-amber-400"} />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">API Latency</span>
            <span className="text-lg font-bold text-white">
              {apiLatency !== null ? `${apiLatency}ms` : <span className="text-xs animate-pulse text-zinc-500">Pinging...</span>}
            </span>
          </div>

          {/* Real ML Service Health */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <Cpu size={16} className={mlOnline === true ? "text-cyan-400" : mlOnline === false ? "text-red-400" : "text-zinc-500"} />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">ML Service</span>
            <span className={`text-lg font-bold ${
              mlOnline === true ? "text-cyan-400" : mlOnline === false ? "text-red-400" : "text-zinc-500"
            }`}>
              {mlOnline === true ? "Online" : mlOnline === false ? "Offline" : "Checking..."}
            </span>
          </div>

          {/* Real Zone Count */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <TreePine size={16} className="text-emerald-400" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Zones Active</span>
            <span className="text-lg font-bold text-white">{zoneCount}</span>
          </div>

          {/* Today's Alerts */}
          <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex flex-col gap-2">
            <AlertTriangle size={16} className={todayAlerts > 0 ? "text-red-400" : "text-zinc-500"} />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Today's Alerts</span>
            <span className={`text-lg font-bold ${todayAlerts > 0 ? "text-red-400" : "text-white"}`}>{todayAlerts}</span>
          </div>
        </div>

        {/* Highest Risk Zone */}
        {topRiskZone && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
            <span className="text-[9px] font-mono text-red-400/70 uppercase tracking-widest">⚠ Highest Risk Zone</span>
            <p className="text-sm font-bold text-red-300 mt-1 truncate">{topRiskZone.name}</p>
            <p className="text-[10px] font-mono text-zinc-500">Risk Score: {topRiskZone.score.toFixed(1)}</p>
          </div>
        )}
      </div>

      {/* Active Campaigns Widget */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">Monitoring Campaigns</h3>
          <Satellite size={13} className="text-zinc-500" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg">
            <span className="text-lg font-bold text-emerald-400">{campaigns.active}</span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Active</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-yellow-500/5 border border-yellow-500/15 rounded-lg">
            <span className="text-lg font-bold text-yellow-400">{campaigns.paused}</span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Paused</span>
          </div>
          <div className="flex flex-col items-center p-2 bg-blue-500/5 border border-blue-500/15 rounded-lg">
            <span className="text-lg font-bold text-blue-400">{campaigns.completed}</span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Done</span>
          </div>
        </div>

        {campaigns.active > 0 && (
          <p className="text-[10px] text-zinc-500 font-mono">
            {campaigns.totalScansLeft} scans pending across active campaigns
          </p>
        )}

        <div className="flex gap-2">
          <Link href="/monitoring" className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all">
              <Satellite size={10} /> Campaigns
            </button>
          </Link>
          <Link href="/historical" className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
              <History size={10} /> Historical
            </button>
          </Link>
        </div>
      </div>

      {/* F2: Global Forest Health Progress Bar */}
      {avgForestPct !== null && (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">Global Forest Health</h3>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-zinc-400">Avg Coverage</span>
            <span className={`text-sm font-bold font-mono ${
              avgForestPct > 60 ? 'text-emerald-400' : avgForestPct > 35 ? 'text-amber-400' : 'text-red-400'
            }`}>{avgForestPct}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                avgForestPct > 60 ? 'bg-emerald-500' : avgForestPct > 35 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(avgForestPct, 100)}%` }}
            />
          </div>
          <p className="text-[9px] font-mono text-zinc-600">Calculated across all monitored zones</p>
        </div>
      )}

      {/* F3: Threat Type Breakdown Chart */}
      {threatTypes.length > 0 && (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">Threat Type Breakdown</h3>
            <ShieldAlert size={14} className="text-zinc-500" />
          </div>
          <div className="flex flex-col gap-2">
            {threatTypes.map((t) => {
              const maxCount = Math.max(...threatTypes.map(x => x.count));
              const pct = maxCount > 0 ? (t.count / maxCount) * 100 : 0;
              return (
                <div key={t.threat} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-zinc-400 w-28 truncate capitalize">{t.threat.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: t.color }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 w-5 text-right">{t.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Threat Distribution Pie Chart */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">Global Threat Matrix</h3>
          <ShieldAlert size={14} className="text-zinc-500" />
        </div>

        <div className="flex-1 w-full relative min-h-[200px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-500 animate-pulse">Initializing Data Stream...</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 mt-4">
          {chartData.map((entry, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-zinc-300 capitalize">{entry.name}</span>
              </div>
              <span className="text-xs font-mono text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* F5: Recent Historical Analyses */}
      {recentAnalyses.length > 0 && (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-mono tracking-widest uppercase text-blue-500">Recent Analyses</h3>
            <History size={13} className="text-zinc-500" />
          </div>
          <div className="flex flex-col gap-2">
            {recentAnalyses.map((a: any, i: number) => {
              const sev = a.scans?.[a.scans.length - 1]?.severity ?? 'none';
              const sevColor = sev === 'critical' ? 'text-red-400' : sev === 'high' ? 'text-amber-400' : sev === 'medium' ? 'text-yellow-400' : 'text-emerald-400';
              return (
                <div key={i} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                  <span className="text-[10px] text-zinc-300 truncate max-w-[140px]">{a.zoneName ?? a.zoneId?.name ?? 'Zone'}</span>
                  <span className={`text-[9px] font-mono uppercase font-bold ${sevColor}`}>{sev}</span>
                  <span className="text-[9px] text-zinc-600 font-mono">
                    {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
          <Link href="/historical">
            <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider text-blue-400 border border-blue-500/20 hover:bg-blue-500/10 transition-all">
              View All Historical →
            </button>
          </Link>
        </div>
      )}

      {/* 6-Month Trend */}
      <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col min-h-[250px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-mono tracking-widest uppercase text-emerald-500">6-Month Trend</h3>
          <TrendingUp size={14} className="text-zinc-500" />
        </div>

        <div className="flex-1 w-full relative">
          {overTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overTimeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                  labelStyle={{ color: '#71717a', fontSize: '10px', fontFamily: 'monospace', marginBottom: '4px' }}
                />
                <Bar dataKey="Critical" stackId="a" fill="#c62828" radius={[0, 0, 4, 4]} />
                <Bar dataKey="High" stackId="a" fill="#e65100" />
                <Bar dataKey="Medium" stackId="a" fill="#f9a825" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-mono text-zinc-500 animate-pulse">Gathering Temporal Data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
