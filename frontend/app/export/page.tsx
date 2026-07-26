"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Toaster } from "sonner";
import { DownloadCloud } from "lucide-react";
import { zonesService } from "@/lib/api/zones";
import { Zone } from "@/types/zone.types";

import { NetworkBackground } from "@/components/ui/NetworkBackground";
import { GlobalExportCards } from "@/components/export/GlobalExportCards";
import { ZoneExportList } from "@/components/export/ZoneExportList";

export default function DataExportCenter() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchZones = async () => {
      const res = await zonesService.getZones();
      if (res.success) setZones(res.data);
      setIsLoading(false);
    };
    fetchZones();
  }, []);

  return (
    <div className="relative min-h-screen bg-[#020617] text-white overflow-x-hidden selection:bg-cyan-500/30">
      <Toaster position="top-center" theme="dark" />
      
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 h-screen pointer-events-none">
        <NetworkBackground />
      </div>

      {/* Main Content Overlay */}
      <div className="relative z-10 container mx-auto px-6 pt-24 pb-20 flex flex-col min-h-screen">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-mono text-cyan-500 tracking-widest uppercase">System Integration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 flex items-center gap-4">
            <DownloadCloud size={40} className="text-white/50" /> Data & GIS Export
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl font-light leading-relaxed">
            Download raw CSV datasets for machine learning analysis or export KML/GeoJSON boundaries for integration with QGIS and Google Earth Pro.
          </p>
        </motion.div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
          
          {/* Left Column: Global Exports */}
          <div className="lg:col-span-5 h-full">
            <GlobalExportCards />
          </div>

          {/* Right Column: Zone Specific Exports */}
          <div className="lg:col-span-7 h-[600px] lg:h-[700px] flex flex-col mt-8 lg:mt-0">
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.05)]">
              
              <div className="mb-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">Zone Specific Exports</h2>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Download History & Boundaries per Zone</p>
                </div>
                <span className="text-xs font-mono bg-white/5 px-3 py-1 rounded text-cyan-500 border border-white/5">
                  {zones.filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase())).length} Matching Zones
                </span>
              </div>

              {/* Search Bar */}
              <div className="mb-4 z-10 relative">
                <input
                  type="text"
                  placeholder="Search zones by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] focus:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                />
              </div>

              {/* The Virtualized List */}
              <div className="flex-1 min-h-0 relative z-10">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <ZoneExportList 
                    zones={zones.filter(z => z.name.toLowerCase().includes(searchQuery.toLowerCase()))} 
                  />
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
