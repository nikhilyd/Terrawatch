"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { zonesService, AuthError } from "@/lib/api/zones";
import { Zone, ZoneBBox, ZoneCoordinates } from "@/types/zone.types";
import { Scan } from "@/types/scan.types";
import { ZoneRegistryList } from "@/components/ui/ZoneRegistryList";
import { ParallaxContainer } from "@/components/ui/ParallaxContainer";
import { ThreeGlobe } from "@/components/ui/ThreeGlobe";
import { CreateZoneForm } from "@/components/ui/CreateZoneForm";
import { EditZoneModal } from "@/components/ui/EditZoneModal";
import { ScanJobsPanel } from "@/components/ui/ScanJobsPanel";
import { scansService } from "@/lib/api/scans";
import { toast, Toaster } from "sonner";
import { Scan as ScanIcon } from "lucide-react";
import { io } from "socket.io-client";

// Dynamically import map (ssr: false)
const DrawingMap = dynamic(() => import("@/components/ui/DrawingMap"), { ssr: false });

export default function MissionControlPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  
  // Scans state
  const [zoneScans, setZoneScans] = useState<Scan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [isTriggeringScan, setIsTriggeringScan] = useState(false);

  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnBBox, setDrawnBBox] = useState<ZoneBBox | null>(null);
  const [drawnCenter, setDrawnCenter] = useState<ZoneCoordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [zoneToEdit, setZoneToEdit] = useState<Zone | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const fetchZones = async () => {
    // Check for token before hitting the API
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to continue.");
      window.location.href = "/login";
      return;
    }
    try {
      const res = await zonesService.getZones();
      if (res.success) setZones(res.data);
    } catch (err) {
      if (err instanceof AuthError) {
        toast.error("Session expired. Redirecting to login...");
        localStorage.removeItem("token");
        setTimeout(() => { window.location.href = "/login"; }, 1500);
      }
    }
  };

  useEffect(() => {
    fetchZones();

    // ── Setup Socket.IO for Real-Time Mission Control ──
    const socket = io("http://localhost:5000");

    socket.on("zone_updated", () => {
      // Re-fetch zones to update the map and registry
      fetchZones();
    });

    socket.on("scan_updated", (updatedScan: any) => {
      setZoneScans((prev) => {
        // Only update if the scan belongs to the currently viewed zone
        if (prev.length > 0) {
          const currentZoneId = typeof prev[0].zoneId === 'object' ? (prev[0].zoneId as any)._id : prev[0].zoneId;
          const incomingZoneId = typeof updatedScan.zoneId === 'object' ? updatedScan.zoneId._id : updatedScan.zoneId;
          if (currentZoneId !== incomingZoneId) return prev;
        }

        const exists = prev.find(s => s._id === updatedScan._id);
        if (exists) {
          if (updatedScan.status === 'completed' && exists.status !== 'completed') {
            toast.success(`AI Scan Completed!`, {
              description: `Results ready for ${updatedScan.zoneId?.name || 'Zone'}`,
              icon: '🛰️',
            });
          }
          return prev.map(s => s._id === updatedScan._id ? updatedScan : s);
        }
        return [updatedScan, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch scans when a zone is selected
  useEffect(() => {
    if (selectedZone) {
      fetchScansForZone(selectedZone._id);
    } else {
      setZoneScans([]);
    }
  }, [selectedZone]);

  const fetchScansForZone = async (zoneId: string) => {
    setIsLoadingScans(true);
    const res = await scansService.getScansByZone(zoneId);
    if (res.success) {
      setZoneScans(res.data);
    }
    setIsLoadingScans(false);
  };

  const handleTriggerScan = async (zoneId: string) => {
    setIsTriggeringScan(true);
    const res = await scansService.triggerScan({ zoneId });
    if (res.success) {
      toast.success("AI Scan queued successfully!");
      fetchScansForZone(zoneId); // Refresh scans list
    } else {
      toast.error(res.message || "Failed to trigger scan");
    }
    setIsTriggeringScan(false);
  };

  const handleRetryScan = async (scanId: string) => {
    toast.info("Retrying scan...");
    const res = await scansService.retryScan(scanId);
    if (res.success) {
      toast.success("Scan retried successfully!");
      if (selectedZone) fetchScansForZone(selectedZone._id);
    } else {
      toast.error(res.message || "Failed to retry scan");
    }
  };

  const handleZoneDrawn = (bbox: ZoneBBox, center: ZoneCoordinates) => {
    setDrawnBBox(bbox);
    setDrawnCenter(center);
  };

  const handleCreateZone = async (data: any) => {
    if (!drawnBBox || !drawnCenter) return;
    setIsSubmitting(true);
    
    const payload = {
      name: data.name,
      description: data.description,
      alertThreshold: data.alertThreshold,
      sentinelConfig: { resolution: 10, cloudCoverage: data.cloudCoverage },
      bbox: drawnBBox,
      coordinates: drawnCenter,
    };

    const res = await zonesService.createZone(payload);
    setIsSubmitting(false);

    if (res.success) {
      toast.success("Zone Registered successfully!");
      setDrawnBBox(null);
      setDrawnCenter(null);
      setIsDrawingMode(false);
      fetchZones();
      
      // Cyberpunk Success Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#ffffff']
      });
    } else {
      toast.error("Failed to register zone");
    }
  };

  const handleEditZoneSubmit = async (id: string, payload: Partial<Zone>) => {
    setIsEditSubmitting(true);
    const res = await zonesService.updateZone(id, payload);
    setIsEditSubmitting(false);
    
    if (res.success) {
      toast.success("Zone updated successfully!");
      setZoneToEdit(null);
      // Socket handles UI update
    } else {
      toast.error("Failed to update zone");
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    if (window.confirm(`Are you sure you want to permanently delete ${zone.name}?`)) {
      const res = await zonesService.deleteZone(zone._id);
      if (res.success) {
        toast.success(`${zone.name} deleted successfully!`);
        if (selectedZone?._id === zone._id) setSelectedZone(null);
        // Socket handles UI update
      } else {
        toast.error("Failed to delete zone");
      }
    }
  };

  return (
    <div className="fixed inset-0 pt-20 pb-4 px-4 bg-[#020617] overflow-hidden flex flex-col pointer-events-auto z-10">
      <Toaster position="top-center" theme="dark" />

      {/* Header Bar */}
      <div className="w-full h-10 mb-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500 uppercase">Mission Control</span>
          <span className="text-zinc-700">/</span>
          <span className="text-xs font-mono text-cyan-500 tracking-widest flex items-center gap-2">
            <ScanIcon size={14} className={isDrawingMode ? "animate-spin" : ""} />
            {isDrawingMode ? "Scanning Area..." : "Zone Management"}
          </span>
        </div>
      </div>

      {/* Main Container with Mouse Parallax */}
      <ParallaxContainer>
        <div className="flex-1 w-full h-full flex gap-4 overflow-hidden relative pointer-events-none">
          
          {/* Left Panel: Zone Registry */}
          <motion.div 
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-[320px] h-full z-20 pointer-events-auto"
          >
            <ZoneRegistryList 
              zones={zones} 
              onSelectZone={setSelectedZone} 
              selectedZoneId={selectedZone?._id}
              onEditZone={setZoneToEdit}
              onDeleteZone={handleDeleteZone}
            />
          </motion.div>

          {/* Center Map (Background) */}
          <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden border border-white/5 pointer-events-auto shadow-[0_0_50px_rgba(6,182,212,0.05)]">
            {/* Red Tint Overlay when in drawing mode */}
            <AnimatePresence>
              {isDrawingMode && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-red-900/10 pointer-events-none z-10 mix-blend-overlay"
                />
              )}
            </AnimatePresence>
            
            <DrawingMap 
              zones={zones} 
              onZoneDrawn={handleZoneDrawn} 
              selectedZone={selectedZone}
            />
          </div>

          {/* Top Right: 3D Globe Radar OR ScanJobsPanel */}
          <AnimatePresence mode="wait">
            {!selectedZone ? null : (
              <motion.div
                key="scan-panel"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className="absolute top-4 right-4 bottom-4 w-[350px] z-20 pointer-events-auto"
              >
                <ScanJobsPanel 
                  zone={selectedZone}
                  scans={zoneScans}
                  isLoading={isLoadingScans}
                  isTriggering={isTriggeringScan}
                  onTriggerScan={handleTriggerScan}
                  onRetryScan={handleRetryScan}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form Popup Overlay (When a zone is drawn) */}
          <AnimatePresence>
            {drawnBBox && drawnCenter && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <CreateZoneForm 
                  bbox={drawnBBox} 
                  center={drawnCenter} 
                  onSubmit={handleCreateZone}
                  onCancel={() => {
                    setDrawnBBox(null);
                    setDrawnCenter(null);
                  }}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Zone Modal */}
          <AnimatePresence>
            {zoneToEdit && (
              <EditZoneModal
                zone={zoneToEdit}
                onClose={() => setZoneToEdit(null)}
                onSubmit={handleEditZoneSubmit}
                isSubmitting={isEditSubmitting}
              />
            )}
          </AnimatePresence>

        </div>
      </ParallaxContainer>

      {/* Floating Action Button to Toggle Drawing Instructions */}
      {!drawnBBox && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
        >
          <div className="bg-black/60 backdrop-blur border border-white/20 px-6 py-3 rounded-full text-xs font-mono text-white flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            Use map tools (top right) to draw a polygon or rectangle to register a new monitoring zone.
          </div>
        </motion.div>
      )}
    </div>
  );
}
