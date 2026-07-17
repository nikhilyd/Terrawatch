"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MapPin, UploadCloud, Crosshair, ShieldAlert, AlertTriangle, CheckCircle2, Info, WifiOff, Satellite } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useGeolocation, useNetworkState } from "react-use";
import * as Tooltip from '@radix-ui/react-tooltip';
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { io } from "socket.io-client";

import { fieldService } from "@/lib/api/field";
import { zonesService } from "@/lib/api/zones";
import { historicalSaveService } from "@/lib/api/campaigns";
import { FieldReport } from "@/types/field.types";
import { Zone } from "@/types/zone.types";
import { FieldBackground } from "@/components/ui/FieldBackground";

// Helper for Tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Zod Schema
const fieldReportSchema = z.object({
  zoneId: z.string().min(1, "Target zone is required"),
  notes: z.string().optional(),
});
type FieldReportForm = z.infer<typeof fieldReportSchema>;

export default function FieldOperationsPage() {
  const [zones,   setZones]   = useState<Zone[]>([]);
  const [reports, setReports] = useState<FieldReport[]>([]);

  // Severity filter for right panel
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");

  // Cache: zone satellite images (lazy loaded per report)
  const [zoneLatestImages, setZoneLatestImages] = useState<Record<string, string>>({});
  const fetchingZones = useRef<Set<string>>(new Set()); // prevent duplicate fetches
  
  // Custom States for Media & GPS
  const [photo,        setPhoto]        = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [manualLat,    setManualLat]    = useState<number | null>(null);
  const [manualLng,    setManualLng]    = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // react-use hooks
  const geo = useGeolocation();
  const network = useNetworkState();
  
  // React Hook Form
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FieldReportForm>({
    resolver: zodResolver(fieldReportSchema),
    defaultValues: { zoneId: "", notes: "" }
  });

  useEffect(() => {
    setIsMounted(true);
    fetchZones();
    fetchReports();

    // ── Setup Socket.IO for Real-Time Updates ──
    const socket = io("http://localhost:5000");

    socket.on("connect", () => {
      console.log("Connected to Real-Time Command Center WebSockets");
    });

    socket.on("new_field_report", (newReport: FieldReport) => {
      setReports((prev) => {
        if (prev.find((r) => r._id === newReport._id)) {
          return prev.map(r => r._id === newReport._id ? newReport : r);
        }
        return [newReport, ...prev];
      });
      toast.success(`New Field Intel: ${newReport.reporterName}`, {
        description: `Zone: ${newReport.zoneId?.name || 'Unknown Zone'}`,
        icon: '🛰️',
      });
    });

    socket.on("new_alert", (alertData: any) => {
      const isFieldAlert = alertData.source === 'field_report';
      toast.error(
        isFieldAlert
          ? `🚨 Field Officer Alert: ${alertData.severity} threat confirmed!`
          : `🛰️ Satellite Alert: ${alertData.severity} threat detected!`,
        { description: alertData.message, duration: 6000 }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchZones = async () => {
    const res = await zonesService.getZones();
    if (res.success) setZones(res.data);
  };

  const fetchReports = async () => {
    const res = await fieldService.getFieldReports();
    if (res.success) setReports(res.data);
  };

  // Lazy-load latest satellite image for a zone (cache to prevent re-fetching)
  const fetchZoneSatelliteImage = async (zoneId: string) => {
    if (zoneLatestImages[zoneId] || fetchingZones.current.has(zoneId)) return;
    fetchingZones.current.add(zoneId);
    try {
      const res = await historicalSaveService.getAnalysesByZone(zoneId);
      if (res.success && res.data?.length > 0) {
        const doneScan = res.data[0].scans?.find((s: any) => s.status === "done" && s.image_url);
        if (doneScan?.image_url) {
          setZoneLatestImages(prev => ({ ...prev, [zoneId]: doneScan.image_url }));
        }
      }
    } catch { /* silently ignore */ }
  };

  // Filter reports by severity
  const filteredReports = severityFilter === "ALL"
    ? reports
    : reports.filter(r =>
        r.aiAnalysis?.severity?.toLowerCase() === severityFilter.toLowerCase()
      );

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      toast.success("Visual evidence captured");
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const currentLat = manualLat ?? geo.latitude;
  const currentLng = manualLng ?? geo.longitude;
  const hasGps = currentLat !== null && currentLng !== null;

  const getGpsFix = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    toast.loading("Acquiring GPS fix...", { id: "gps" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setManualLat(pos.coords.latitude);
        setManualLng(pos.coords.longitude);
        toast.success(`GPS locked: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`, { id: "gps" });
      },
      (err) => {
        if (err.code === 1) {
          toast.error("Location access denied. Allow location in browser settings.", { id: "gps" });
        } else if (err.code === 2) {
          toast.error("Location unavailable. Check GPS / network signal.", { id: "gps" });
        } else if (err.code === 3) {
          toast.error("GPS timeout. Try again in open area.", { id: "gps" });
        } else {
          toast.error("Failed to acquire GPS fix.", { id: "gps" });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const onSubmit = async (data: FieldReportForm) => {
    if (!network.online) {
      toast.error("Network offline. Please reconnect to transmit.");
      return;
    }
    if (!photo) {
      toast.error("Visual evidence (photo) is required.");
      return;
    }
    if (!hasGps) {
      toast.error("GPS coordinates are required to submit.");
      return;
    }

    const toastId = toast.loading("Transmitting report to Command Center...");
    
    const formData = new FormData();
    formData.append("zoneId", data.zoneId);
    formData.append("lat", currentLat.toString());
    formData.append("lng", currentLng.toString());
    formData.append("notes", data.notes || "");
    formData.append("photo", photo);

    const res = await fieldService.submitFieldReport(formData);
    
    if (res.success) {
      toast.success("Transmission successful. AI Verification complete.", { id: toastId });
      reset();
      setPhoto(null);
      setPhotoPreview(null);
      // Update local state proactively, socket will also catch it
      setReports(prev => prev.some(r => r._id === res.data._id) ? prev.map(r => r._id === res.data._id ? res.data : r) : [res.data, ...prev]);
    } else {
      toast.error("Transmission failed. Please retry.", { id: toastId });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-white px-4 md:px-8 overflow-hidden">
      <FieldBackground />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10 pt-24 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 border-b border-white/10 pb-6"
        >
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 w-fit">
              <Crosshair size={14} className="text-cyan-400" />
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Ground Unit Portal</span>
            </div>
            
            {/* Network Status Warning */}
            {isMounted && !network.online && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 animate-pulse">
                <WifiOff size={14} className="text-red-400" />
                <span className="text-xs font-mono text-red-400 uppercase tracking-widest hidden sm:inline">System Offline</span>
              </div>
            )}
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Field Operations</h1>
          <p className="text-zinc-400 font-mono text-sm">Upload ground intelligence for real-time Qwen2-VL AI verification.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: REPORT FORM */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden h-fit"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]" />
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UploadCloud className="text-emerald-500" />
              New Ground Report
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Zone Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 uppercase flex justify-between">
                  Target Zone
                  {errors.zoneId && <span className="text-red-400">{errors.zoneId.message}</span>}
                </label>
                <Controller
                  name="zoneId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className={cn(
                        "w-full bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none appearance-none transition-all",
                        errors.zoneId ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-emerald-500/50"
                      )}
                    >
                      <option value="" disabled className="bg-zinc-900 text-zinc-500">Select monitoring zone...</option>
                      {zones.map((zone) => (
                        <option key={zone._id} value={zone._id} className="bg-zinc-900 text-white">
                          {zone.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              {/* GPS Fetcher */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 uppercase flex items-center gap-2">
                  Coordinates
                  <Tooltip.Provider delayDuration={200}>
                    <Tooltip.Root>
                      <Tooltip.Trigger type="button" className="cursor-help"><Info size={12} className="text-zinc-500" /></Tooltip.Trigger>
                      <Tooltip.Content className="bg-zinc-800 text-xs px-2 py-1 rounded border border-white/10 shadow-xl" sideOffset={4}>
                        Click FIX to acquire your current GPS coordinates. Allow location access when prompted.
                      </Tooltip.Content>
                    </Tooltip.Root>
                  </Tooltip.Provider>
                </label>
                <div className="flex gap-3">
                  <div className={cn(
                    "flex-1 border rounded-xl px-4 py-3 flex items-center justify-between text-sm transition-all",
                    hasGps
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : geo.error
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-white/5 border-white/10"
                  )}>
                    {isMounted ? (
                      hasGps ? (
                        <span className="font-mono text-emerald-400">
                          {currentLat!.toFixed(6)}, {currentLng!.toFixed(6)}
                        </span>
                      ) : geo.error ? (
                        <span className="text-red-400 font-mono text-xs flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {geo.error.code === 1 ? "Location Denied" : geo.error.code === 2 ? "Location Unavailable" : "GPS Error"}
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-mono text-xs flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-pulse" />
                          Click FIX to get coordinates
                        </span>
                      )
                    ) : (
                      <span className="text-zinc-600 font-mono text-xs">Initializing...</span>
                    )}

                    {hasGps && (
                      <button
                        type="button"
                        onClick={() => { setManualLat(null); setManualLng(null); }}
                        className="text-[9px] font-mono text-zinc-600 hover:text-red-400 uppercase transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={getGpsFix}
                    className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 rounded-xl transition-colors flex items-center gap-2 text-sm text-cyan-400 font-mono uppercase"
                  >
                    <MapPin size={16} />
                    Fix
                  </button>
                </div>
                {geo.error?.code === 1 && (
                  <p className="text-[10px] font-mono text-red-400/70">
                    ⚠ Open browser settings → Site Settings → Allow Location for localhost
                  </p>
                )}
              </div>

              {/* Photo Capture */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 uppercase">Visual Evidence</label>
                
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handlePhotoCapture}
                />
                
                <AnimatePresence mode="wait">
                  {photoPreview ? (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative rounded-xl overflow-hidden border border-white/10 group h-48"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleCaptureClick}
                          className="px-4 py-2 bg-black/80 border border-white/20 rounded-full text-xs font-mono uppercase hover:bg-emerald-900 transition-colors flex items-center gap-2 text-white"
                        >
                          <Camera size={14} /> Retake Photo
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="capture"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      type="button"
                      onClick={handleCaptureClick}
                      className="w-full h-48 border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl bg-white/5 flex flex-col items-center justify-center gap-3 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="text-emerald-500" />
                      </div>
                      <span className="text-sm font-mono text-zinc-400 uppercase group-hover:text-emerald-400 transition-colors">Tap to Capture Area</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-400 uppercase">Field Notes (Optional)</label>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 min-h-[100px] resize-none transition-colors"
                      placeholder="Describe ground conditions..."
                    />
                  )}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-mono uppercase tracking-widest rounded-xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {isSubmitting ? "Transmitting..." : "Submit to Command"}
              </button>
            </form>
          </motion.div>

          {/* RIGHT: FIELD FEED */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full"
          >
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <ShieldAlert className="text-cyan-500" />
              Live Field Intelligence
            </h2>

            {/* ── Severity Filter Buttons ── */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(level => {
                const count = level === "ALL"
                  ? reports.length
                  : reports.filter(r => r.aiAnalysis?.severity?.toUpperCase() === level).length;
                const isActive = severityFilter === level;
                const colorClass =
                  level === "CRITICAL" ? (isActive ? "bg-red-500/20 border-red-500/50 text-red-300"     : "border-red-500/20 text-red-500/50") :
                  level === "HIGH"     ? (isActive ? "bg-orange-500/20 border-orange-500/50 text-orange-300" : "border-orange-500/20 text-orange-500/50") :
                  level === "MEDIUM"   ? (isActive ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" : "border-yellow-500/20 text-yellow-500/50") :
                  level === "LOW"      ? (isActive ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300" : "border-emerald-500/20 text-emerald-500/50") :
                  (isActive ? "bg-white/20 border-white/30 text-white" : "border-white/10 text-zinc-500");
                return (
                  <button key={level} onClick={() => setSeverityFilter(level)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase border transition-all hover:opacity-100 ${colorClass} ${!isActive ? "opacity-60 hover:opacity-100" : ""}`}>
                    {level} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 border border-white/5 rounded-2xl bg-white/5">
                  <p className="text-zinc-500 font-mono text-sm uppercase">
                    {severityFilter === "ALL" ? "No field reports found" : `No ${severityFilter} severity reports`}
                  </p>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredReports.map((report) => {
                    const zoneId = String((report.zoneId as any)?._id || report.zoneId || "");
                    const satImage = zoneLatestImages[zoneId];
                    if (zoneId && !satImage) fetchZoneSatelliteImage(zoneId);

                    return (
                    <motion.div 
                      key={report._id} 
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                    >
                      {/* Report Header */}
                      <div className="p-4 border-b border-white/5 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-white">{report.reporterName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                              {new Date(report.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                            <MapPin size={12} />
                            {(report.zoneId as any)?.name || "Unknown Zone"} • {report.gps.lat.toFixed(4)}, {report.gps.lng.toFixed(4)}
                          </div>
                        </div>
                        
                        {report.status === "analyzed" ? (
                          <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 size={12} /> AI Verified
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 animate-pulse">
                            <AlertTriangle size={12} /> Pending AI
                          </div>
                        )}
                      </div>
                      
                      {/* Report Content */}
                      <div className="flex flex-col sm:flex-row gap-4 p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={`http://localhost:5000/${report.imagePath}`} 
                          alt="Field evidence" 
                          className="w-full sm:w-32 h-32 object-cover rounded-lg border border-white/10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                          }}
                        />
                        <div className="flex-1 space-y-3">
                          <p className="text-sm text-zinc-300 italic">&ldquo;{report.notes || "No notes provided"}&rdquo;</p>
                          
                          {/* AI Analysis Block */}
                          {report.status === "analyzed" && report.aiAnalysis && (
                            <div className={cn(
                              "p-3 rounded-xl border transition-colors",
                              report.aiAnalysis.severity === 'high' ? 'bg-red-500/5 border-red-500/20 hover:bg-red-500/10' : 
                              report.aiAnalysis.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 
                              'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                            )}>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-mono text-white/70 uppercase flex items-center gap-1">
                                  <Crosshair size={12}/> Qwen2-VL Analysis
                                </span>
                                <span className={cn(
                                  "text-[10px] font-mono px-2 py-0.5 rounded uppercase",
                                  report.aiAnalysis.severity === 'high' ? 'bg-red-500/20 text-red-400' : 
                                  report.aiAnalysis.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 
                                  'bg-emerald-500/20 text-emerald-400'
                                )}>
                                  {report.aiAnalysis.severity} Severity
                                </span>
                              </div>
                              <p className="text-xs text-white/80 leading-relaxed mb-2">
                                {report.aiAnalysis.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {report.aiAnalysis.threats?.map((threat, i) => (
                                  <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition-colors">
                                    {threat}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Satellite vs Ground Comparison ── */}
                      {satImage && (
                        <div className="border-t border-white/5 px-4 pb-4">
                          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 pt-3 flex items-center gap-1">
                            <Satellite size={10} /> Satellite vs Ground Comparison
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-[9px] text-zinc-600 font-mono mb-1">GROUND PHOTO</p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`http://localhost:5000/${report.imagePath}`}
                                alt="Ground" className="w-full h-24 object-cover rounded-lg border border-white/10" />
                            </div>
                            <div>
                              <p className="text-[9px] text-cyan-600 font-mono mb-1">SENTINEL-2 (LATEST)</p>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={satImage} alt="Satellite"
                                className="w-full h-24 object-cover rounded-lg border border-cyan-500/20"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
