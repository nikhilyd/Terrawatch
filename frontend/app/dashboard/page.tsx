"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { dashboardService } from "@/lib/api/dashboard";
import { Alert, AnalyticsResponse, AlertsOverTimeResponse } from "@/types/dashboard.types";
import { AnalyticsPanel } from "@/components/ui/AnalyticsPanel";
import { AlertsFeed } from "@/components/ui/AlertsFeed";
import { ThreatDetailsModal } from "@/components/ui/ThreatDetailsModal";
import { io } from "socket.io-client";
import { toast, Toaster } from "sonner";
import { ShieldAlert, RefreshCw, Wifi, WifiOff, Shield } from "lucide-react";

const InteractiveMap = dynamic(() => import("@/components/ui/Map"), { ssr: false });

export default function DashboardPage() {
  const [alerts, setAlerts]                 = useState<Alert[]>([]);
  const [analytics, setAnalytics]           = useState<AnalyticsResponse | null>(null);
  const [alertsOverTime, setAlertsOverTime] = useState<AlertsOverTimeResponse | null>(null);
  const [focusCoords, setFocusCoords]       = useState<[number, number] | null>(null);
  const [selectedAlert, setSelectedAlert]   = useState<Alert | null>(null);
  const [isConnected, setIsConnected]       = useState(false);
  const [riskScores, setRiskScores]         = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing]     = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const [alertsRes, analyticsRes, overTimeRes] = await Promise.all([
      dashboardService.getAlerts(),
      dashboardService.getThreatDistribution(),
      dashboardService.getAlertsOverTime(6),
    ]);
    if (alertsRes.success) setAlerts(alertsRes.data);
    if (analyticsRes.success) setAnalytics(analyticsRes);
    if (overTimeRes.success) setAlertsOverTime(overTimeRes);
    if (token) {
      try {
        const riskRes = await fetch("http://localhost:5000/api/legal/risk-scores", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        if (riskRes.success) setRiskScores(riskRes.data ?? []);
      } catch { /* silent */ }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    fetchData();
    const socket = io("http://localhost:5000");
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.on("new_alert", (newAlert: Alert) => {
      setAlerts((prev) => {
        if (prev.find((a) => a._id === newAlert._id)) return prev;
        return [newAlert, ...prev];
      });
      fetchData();
      toast.custom((t) => (
        <div className="glass-strong rounded-2xl p-4 flex items-start gap-3 border border-red-500/25 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
          <div className="w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert size={15} className="text-red-400" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-red-400 uppercase tracking-wider">
              New Threat Detected
            </p>
            <p className="text-xs text-zinc-300">{newAlert.message}</p>
            <button
              onClick={() => {
                toast.dismiss(t);
                if (newAlert.hotspot) setFocusCoords([newAlert.hotspot.lat, newAlert.hotspot.lng]);
              }}
              className="mt-1.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest text-left"
            >
              View Coordinates →
            </button>
          </div>
        </div>
      ), { duration: 10000 });
    });

    socket.on("alert_updated", (updatedAlert: Alert) => {
      setAlerts((prev) => prev.map((a) => (a._id === updatedAlert._id ? updatedAlert : a)));
      fetchData();
    });

    return () => { socket.disconnect(); };
  }, []);

  const handleResolveAlert = async (id: string) => {
    const res = await dashboardService.updateAlertStatus(id, "RESOLVED", "Resolved via Dashboard");
    if (res.success) {
      setAlerts((prev) => prev.filter((a) => a._id !== id));
      toast.success("Threat marked as resolved.");
      fetchData();
    } else {
      toast.error("Failed to resolve threat.");
    }
  };

  return (
    <div className="fixed inset-0 pt-20 pb-4 px-4 overflow-hidden flex flex-col pointer-events-auto z-10">
      <Toaster position="top-center" theme="dark" />

      {/* Header Status Bar */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full h-auto min-h-[44px] py-2 sm:py-0 sm:h-11 mt-6 mb-3 glass rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 z-20 gap-2 sm:gap-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl glass-blue flex items-center justify-center">
            <Shield size={13} className="text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Command Center</span>
            <span className="text-zinc-700">/</span>
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Global Overview</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Uplink:</span>
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.span
                  key="connected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400"
                >
                  <Wifi size={11} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Secure
                </motion.span>
              ) : (
                <motion.span
                  key="disconnected"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400"
                >
                  <WifiOff size={11} />
                  Offline
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-lg glass text-zinc-500 hover:text-white transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </motion.div>

      {/* Main HUD Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-y-auto lg:overflow-hidden relative z-20 min-h-0">

        {/* Left: Analytics Panel */}
        <motion.div
          initial={{ x: -350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
          className="h-auto lg:h-full z-20 shrink-0 w-full lg:w-auto"
        >
          <AnalyticsPanel analytics={analytics} alertsOverTime={alertsOverTime} riskScores={riskScores} />
        </motion.div>

        {/* Center: Map Background */}
        <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden border border-white/5 opacity-85 pointer-events-auto shadow-[0_0_60px_rgba(59, 130, 246,0.05)]">
          <InteractiveMap alerts={alerts} focusCoords={focusCoords} />
          {/* Vignette overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.75)_100%)] z-10" />
        </div>

        {/* Right: Alerts Feed */}
        <motion.div
          initial={{ x: 350, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 22, delay: 0.05 }}
          className="h-auto lg:h-full z-20 lg:ml-auto shrink-0 w-full lg:w-auto"
        >
          <AlertsFeed
            alerts={alerts}
            onFocus={setFocusCoords}
            onResolve={handleResolveAlert}
            onViewDetails={setSelectedAlert}
            riskScores={riskScores}
          />
        </motion.div>
      </div>

      {/* Modal */}
      <ThreatDetailsModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}
