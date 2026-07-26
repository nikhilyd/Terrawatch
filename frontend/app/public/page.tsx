"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { PublicStats, PublicAlert, PublicZone } from "@/types/public.types";
import { publicService } from "@/lib/api/public";
import { PublicHero } from "@/components/public/PublicHero";
import { MetricsGrid } from "@/components/public/MetricsGrid";
import { PublicThreatFeed } from "@/components/public/PublicThreatFeed";
import { Toaster, toast } from "sonner";
import { io } from "socket.io-client";
import { ShieldAlert } from "lucide-react";
import confetti from "canvas-confetti";

export default function PublicTransparencyPortal() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [alerts, setAlerts] = useState<PublicAlert[]>([]);
  const [zones, setZones] = useState<PublicZone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const yBg = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  useEffect(() => {
    const fetchData = async () => {
      const [statsRes, alertsRes, zonesRes] = await Promise.all([
        publicService.getStats(),
        publicService.getAlerts(),
        publicService.getZones(),
      ]);
      
      if (statsRes.success) setStats(statsRes.data);
      if (alertsRes.success) setAlerts(alertsRes.data);
      if (zonesRes.success) setZones(zonesRes.data);
      
      setIsLoading(false);
    };

    fetchData();

    // Setup Socket for Real-Time Live Feed
    const socket = io("http://localhost:5000");

    socket.on("new_alert", (newAlert: any) => {
      // Map internal Alert format to PublicAlert format
      const publicFormattedAlert: PublicAlert = {
        zone: newAlert.zoneId?.name || "Unknown Zone",
        coordinates: newAlert.zoneId?.coordinates || null,
        severity: newAlert.severity,
        forestLoss: `${newAlert.forestLoss}%`,
        message: newAlert.message,
        changeType: newAlert.changeType || null,
        probableCause: newAlert.probableCause || null,
        changedAreas: newAlert.changedAreas || [],
        date: new Date().toISOString(),
      };

      setAlerts(prev => [publicFormattedAlert, ...prev]);
      
      // Update stats optimistically (or just refetch)
      fetchData();

      // Show Live Notification to the Public!
      toast.custom((t) => (
        <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 p-4 rounded-xl flex items-start gap-4 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <ShieldAlert className="text-red-500 shrink-0 mt-1 animate-pulse" />
          <div className="flex flex-col gap-1">
            <h1 className="text-red-500 font-bold font-mono uppercase tracking-widest text-sm">LIVE SATELLITE DETECTION</h1>
            <p className="text-zinc-300 text-xs">EcoWatch AI just detected a new anomaly: {publicFormattedAlert.message}</p>
          </div>
        </div>
      ), { duration: 8000 });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handlePledge = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#06b6d4', '#ffffff']
    });
    toast.success("Thank you for joining the Planetary Defense Initiative!", {
      icon: "🌍"
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-cyan-500 tracking-widest uppercase">Initializing Global Uplink...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#020617] text-white overflow-hidden selection:bg-cyan-500/30">
      <Toaster position="top-right" theme="dark" />
      
      {/* Dynamic 3D Hero Background */}
      <div className="absolute inset-0 z-0 h-[100vh]">
        <motion.div style={{ y: yBg }} className="w-full h-full">
          <PublicHero />
        </motion.div>
      </div>

      {/* Main Content Overlay */}
      <div className="relative z-10 container mx-auto px-6 pt-32 pb-20">
        
        {/* Header Titles */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="max-w-3xl mb-24"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-mono text-cyan-500 tracking-widest uppercase">Live Public Feed</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white via-white to-zinc-500 text-transparent bg-clip-text">
            Planetary Defense <br/> Initiative.
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl font-light leading-relaxed">
            EcoWatch uses cutting-edge ESA Sentinel-2 satellites and GPT-4o Vision Artificial Intelligence to monitor global deforestation and environmental crimes in real-time. This data is open to the world.
          </p>
        </motion.div>

        {/* The Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Metrics and Zone Spotlight */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {stats && <MetricsGrid stats={stats} />}
            
            {/* Gamification Call To Action */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mt-6 p-8 rounded-3xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 backdrop-blur-xl relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59, 130, 246,0.1),transparent_50%)] transition-opacity duration-500 group-hover:opacity-100 opacity-0" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Join the Watch.</h3>
                  <p className="text-sm text-blue-200/80 max-w-md">
                    Stand with us against illegal deforestation. Pledge your support to help us expand our satellite monitoring network to more vulnerable zones.
                  </p>
                </div>
                <button 
                  onClick={handlePledge}
                  className="shrink-0 bg-blue-500 hover:bg-blue-400 text-black px-8 py-4 rounded-xl font-mono text-sm font-bold tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(59, 130, 246,0.4)] hover:shadow-[0_0_40px_rgba(59, 130, 246,0.6)] hover:-translate-y-1"
                >
                  Pledge Support
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Live Threat Feed */}
          <div className="lg:col-span-4 h-[800px]">
            <PublicThreatFeed alerts={alerts} />
          </div>

        </div>

      </div>
    </div>
  );
}
