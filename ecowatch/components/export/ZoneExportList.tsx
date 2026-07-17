"use client";

import { Zone } from "@/types/zone.types";
import { Virtuoso } from "react-virtuoso";
import { motion, AnimatePresence } from "framer-motion";
import { Download, FileSpreadsheet, Globe2, Loader2, MapPin, BarChart3, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { reportsService } from "@/lib/api/reports";
import { toast } from "sonner";

interface ZoneExportListProps {
  zones: Zone[];
}

export function ZoneExportList({ zones }: ZoneExportListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null); // "csv-id", "kml-id", "geojson-id"
  const [stats, setStats] = useState<Record<string, any>>({});

  useEffect(() => {
    zones.forEach(async (z) => {
      if (!stats[z._id]) {
        const data = await reportsService.getZoneExportStats(z._id);
        if (data) setStats(prev => ({ ...prev, [z._id]: data }));
      }
    });
  }, [zones]);

  const handleDownload = async (zone: Zone, type: 'csv' | 'historical-csv' | 'field-csv' | 'kml' | 'geojson') => {
    const actionId = `${type}-${zone._id}`;
    setLoadingAction(actionId);
    
    const toastId = toast.loading(`Generating ${type.toUpperCase()} for ${zone.name}...`);
    
    let success = false;
    if (type === 'csv') {
      success = await reportsService.exportZoneScansCSV(zone._id, zone.name);
    } else if (type === 'historical-csv') {
      success = await reportsService.exportZoneHistoricalCSV(zone._id, zone.name);
    } else if (type === 'field-csv') {
      success = await reportsService.exportZoneFieldReportsCSV(zone._id, zone.name);
    } else if (type === 'kml') {
      success = await reportsService.exportZoneKML(zone._id, zone.name);
    } else if (type === 'geojson') {
      success = await reportsService.exportZoneGeoJSON(zone._id, zone.name);
    }

    setLoadingAction(null);

    if (success) {
      toast.success(`Exported Successfully!`, { id: toastId });
    } else {
      toast.error(`Failed to export ${type.toUpperCase()}`, { id: toastId });
    }
  };

  if (zones.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest">
        No active zones available for export.
      </div>
    );
  }

  return (
    <Virtuoso
      style={{ height: "100%" }}
      data={zones}
      className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2"
      itemContent={(index, zone) => {
        const isExpanded = expandedId === zone._id;
        
        return (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index < 10 ? index * 0.05 : 0 }}
            className={`mb-3 border rounded-2xl transition-colors overflow-hidden ${
              isExpanded 
                ? "bg-cyan-500/5 border-cyan-500/30" 
                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {/* Header / Clickable Area */}
            <div 
              className="p-4 flex items-center justify-between cursor-pointer group"
              onClick={() => setExpandedId(isExpanded ? null : zone._id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isExpanded ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/50 text-zinc-500 group-hover:text-cyan-400'}`}>
                  <MapPin size={16} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {zone.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 flex flex-wrap gap-2 mt-1">
                    <span>{zone.area_km2 > 0 ? `${zone.area_km2.toFixed(2)} km²` : 'Area N/A'}</span>
                    <span>• Threshold: {zone.alertThreshold}%</span>
                    {stats[zone._id] && (
                      <span className="text-cyan-600/70">
                        • {stats[zone._id].scanCount} Scans • {stats[zone._id].alertCount} Alerts • {stats[zone._id].fieldCount} Field Reports • {stats[zone._id].histCount} Hist. Analyses
                      </span>
                    )}
                  </span>

                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-2 py-1 rounded hidden sm:block border border-cyan-500/20">
                  Select Format
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  className="w-6 h-6 flex items-center justify-center text-zinc-500"
                >
                  ▼
                </motion.div>
              </div>
            </div>

            {/* Expandable Export Options */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 bg-black/20"
                >
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                    
                    {/* CSV Button */}
                    <button 
                      onClick={() => handleDownload(zone, 'csv')}
                      disabled={loadingAction !== null}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed text-center"
                    >
                      {loadingAction === `csv-${zone._id}` ? (
                        <Loader2 size={24} className="text-cyan-500 animate-spin" />
                      ) : (
                        <FileSpreadsheet size={24} className="text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white group-hover:text-cyan-400">Scan History (CSV)</span>
                    </button>

                    {/* Historical CSV Button */}
                    <button 
                      onClick={() => handleDownload(zone, 'historical-csv')}
                      disabled={loadingAction !== null}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed text-center"
                    >
                      {loadingAction === `historical-csv-${zone._id}` ? (
                        <Loader2 size={24} className="text-blue-500 animate-spin" />
                      ) : (
                        <BarChart3 size={24} className="text-zinc-400 group-hover:text-blue-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white group-hover:text-blue-400">Historical (CSV)</span>
                    </button>

                    {/* Field Reports CSV Button */}
                    <button 
                      onClick={() => handleDownload(zone, 'field-csv')}
                      disabled={loadingAction !== null}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed text-center"
                    >
                      {loadingAction === `field-csv-${zone._id}` ? (
                        <Loader2 size={24} className="text-orange-500 animate-spin" />
                      ) : (
                        <ShieldAlert size={24} className="text-zinc-400 group-hover:text-orange-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white group-hover:text-orange-400">Field Reports (CSV)</span>
                    </button>

                    {/* KML Button */}
                    <button 
                      onClick={() => handleDownload(zone, 'kml')}
                      disabled={loadingAction !== null}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAction === `kml-${zone._id}` ? (
                        <Loader2 size={24} className="text-emerald-500 animate-spin" />
                      ) : (
                        <Globe2 size={24} className="text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white group-hover:text-emerald-400">Google Earth (KML)</span>
                    </button>

                    {/* GeoJSON Button */}
                    <button 
                      onClick={() => handleDownload(zone, 'geojson')}
                      disabled={loadingAction !== null}
                      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingAction === `geojson-${zone._id}` ? (
                        <Loader2 size={24} className="text-indigo-500 animate-spin" />
                      ) : (
                        <Download size={24} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                      )}
                      <span className="text-[10px] font-mono font-bold tracking-widest text-white group-hover:text-indigo-400">Raw Polygon (GeoJSON)</span>
                    </button>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        );
      }}
    />
  );
}
