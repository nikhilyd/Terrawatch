"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMouse } from "react-use";
import { FileSpreadsheet, Map, Download, Loader2, BarChart3, ShieldAlert } from "lucide-react";
import { reportsService } from "@/lib/api/reports";
import { toast } from "sonner";
import confetti from "canvas-confetti";

function ExportCard({ 
  title, subtitle, icon: Icon, colorClass, onDownload, type
}: { 
  title: string, subtitle: string, icon: any, colorClass: string, onDownload: () => Promise<boolean>, type: "CSV" | "GEOJSON" 
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { docX, docY } = useMouse(ref as any);
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const x = ref.current ? docX - ref.current.getBoundingClientRect().left : 0;
  const y = ref.current ? docY - ref.current.getBoundingClientRect().top : 0;

  const handleDownload = async () => {
    setIsDownloading(true);
    const toastId = toast.loading(`Generating Global ${type} Export...`, {
      description: "Compiling massive dataset, please hold.",
    });

    const success = await onDownload();
    setIsDownloading(false);

    if (success) {
      toast.success(`Global ${type} Export Complete!`, { id: toastId });
      // Matrix-style confetti
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.8 },
        colors: ['#3b82f6', '#06b6d4', '#000000', '#ffffff']
      });
    } else {
      toast.error("Export Failed", { id: toastId, description: "Please try again later." });
    }
  };

  return (
    <motion.div
      ref={ref}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative overflow-hidden bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col cursor-default h-full"
    >
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
        style={{
          background: `radial-gradient(circle 250px at ${x}px ${y}px, rgba(255,255,255,0.08), transparent 100%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 relative z-10 ${colorClass}`}>
        <Icon size={24} />
      </div>

      <h3 className="text-xl font-bold text-white mb-2 relative z-10">{title}</h3>
      <p className="text-sm text-zinc-400 mb-8 flex-1 relative z-10 leading-relaxed">{subtitle}</p>

      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="w-full relative z-10 overflow-hidden group bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl p-4 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? (
          <Loader2 className="animate-spin text-cyan-400" size={20} />
        ) : (
          <Download size={20} className="group-hover:-translate-y-1 group-hover:scale-110 transition-transform text-cyan-400" />
        )}
        <span className="font-mono font-bold tracking-widest text-xs uppercase">
          {isDownloading ? "Compiling..." : `Download ${type}`}
        </span>
      </button>
    </motion.div>
  );
}

export function GlobalExportCards() {
  return (
    <div className="flex flex-col gap-6 h-full">
      
      <div className="flex-1">
        <ExportCard
          title="Global Threat Log"
          subtitle="Download a comprehensive CSV containing every single AI-detected anomaly, alert, and incident report recorded across all global zones. Perfect for ML training or statistical auditing."
          icon={FileSpreadsheet}
          colorClass="bg-red-500/10 text-red-400 border border-red-500/20"
          type="CSV"
          onDownload={() => reportsService.exportAllAlertsCSV()}
        />
      </div>

      <div className="flex-1">
        <ExportCard
          title="Global Planetary Map"
          subtitle="Download the entire network of monitored zones and their associated risk parameters as a standardized GeoJSON file. Designed for direct import into ArcGIS, QGIS, or custom geospatial engines."
          icon={Map}
          colorClass="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
          type="GEOJSON"
          onDownload={() => reportsService.exportAllZonesGeoJSON()}
        />
      </div>

      <div className="flex-1">
        <ExportCard
          title="Historical NDVI Timeline"
          subtitle="Download complete multi-temporal Sentinel-2 NDVI analysis data across all zones. Includes forest %, cloud masking %, severity, and loss timeline for ML research."
          icon={BarChart3}
          colorClass="bg-blue-500/10 text-blue-400 border border-blue-500/20"
          type="CSV"
          onDownload={() => reportsService.exportAllHistoricalCSV()}
        />
      </div>

      <div className="flex-1">
        <ExportCard
          title="Ground Intelligence Log"
          subtitle="Download all field officer ground truth reports with GPS coordinates, GPT-4o Vision threat analysis, severity classification, and AI descriptions."
          icon={ShieldAlert}
          colorClass="bg-orange-500/10 text-orange-400 border border-orange-500/20"
          type="CSV"
          onDownload={() => reportsService.exportAllFieldReportsCSV()}
        />
      </div>


    </div>
  );
}
