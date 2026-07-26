"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Alert } from "@/types/dashboard.types";
import { X, BrainCircuit, Activity, ChevronRight, TriangleAlert } from "lucide-react";
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThreatDetailsModalProps {
  alert: Alert | null;
  onClose: () => void;
}

export function ThreatDetailsModal({ alert, onClose }: ThreatDetailsModalProps) {
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Typewriter effect for AI Analysis
  useEffect(() => {
    if ((alert as any)?.changeDescription) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTypedText("");
      setIsTyping(true);
      let i = 0;
      const text = (alert as any).changeDescription;
      
      const interval = setInterval(() => {
        setTypedText(prev => prev + text.charAt(i));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 30); // 30ms per character

      return () => clearInterval(interval);
    }
  }, [alert]);

  if (!alert) return null;

  // Placeholder logic for Before/After images
  const afterImage = alert.comparisonImagePath || "https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1000&auto=format&fit=crop"; 
  const beforeImage = "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1000&auto=format&fit=crop"; // Generic lush forest

  return (
    <AnimatePresence>
      {alert && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8"
          >
            {/* Modal Container */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl h-[85vh] bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
            >
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/50">
                <div className="flex items-center gap-3">
                  <TriangleAlert className={cn("animate-pulse", 
                    alert.severity === 'CRITICAL' ? "text-red-500" : 
                    alert.severity === 'HIGH' ? "text-amber-500" : "text-blue-500"
                  )} size={20} />
                  <h2 className="text-sm font-mono tracking-widest text-white uppercase">
                    Threat Analysis Report: <span className="text-zinc-500">ID-{alert._id.slice(-6)}</span>
                  </h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Col: Imagery (Takes 2 columns) */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-zinc-500 tracking-widest flex items-center gap-2">
                      <Activity size={14} className="text-cyan-500" /> Sentinel-2 Multispectral Comparison
                    </span>
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono text-blue-400">
                      LIVE FEED
                    </span>
                  </div>
                  
                  {/* React Compare Slider */}
                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 relative bg-black">
                    <ReactCompareSlider
                      itemOne={<ReactCompareSliderImage src={beforeImage} alt="Before" className="object-cover" />}
                      itemTwo={<ReactCompareSliderImage src={afterImage} alt="After" className="object-cover" />}
                      className="w-full h-full"
                    />
                    {/* Overlay Labels */}
                    <div className="absolute top-4 left-4 px-2 py-1 bg-black/60 backdrop-blur border border-white/20 text-[10px] font-mono text-white rounded pointer-events-none z-10">T-7 DAYS</div>
                    <div className="absolute top-4 right-4 px-2 py-1 bg-black/60 backdrop-blur border border-red-500/50 text-[10px] font-mono text-red-400 rounded pointer-events-none z-10">CURRENT</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Change Type</span>
                      <span className="text-sm font-medium text-white">{alert.changeType || 'Vegetation Loss'}</span>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Probable Cause</span>
                      <span className="text-sm font-medium text-white">{alert.probableCause || 'Illegal Activity'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Col: AI Analysis & Metrics */}
                <div className="flex flex-col gap-6">
                  
                  {/* GPT-4o Vision Typing Terminal */}
                  <div className="flex-1 rounded-xl bg-black/60 border border-cyan-500/20 p-5 flex flex-col relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-50" />
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <BrainCircuit size={16} className="text-cyan-400" />
                      <span className="text-xs font-mono tracking-widest uppercase text-cyan-400">GPT-4o Vision Reasoning</span>
                    </div>
                    
                    <div className="flex-1 bg-black/50 rounded-lg border border-white/5 p-4 relative z-10 overflow-y-auto">
                      <p className="text-sm font-mono text-blue-400 leading-relaxed whitespace-pre-wrap">
                        <span className="text-zinc-500 select-none">{"> "}</span>
                        {typedText}
                        {isTyping && <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1 align-middle" />}
                      </p>
                    </div>
                  </div>

                  {/* Radial Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-3">
                      <div className="w-20 h-20">
                        <CircularProgressbar 
                          value={alert.forestLoss || 0} 
                          text={`${alert.forestLoss || 0}%`}
                          styles={buildStyles({
                            pathColor: '#ef4444',
                            textColor: '#fff',
                            trailColor: 'rgba(255,255,255,0.1)',
                            textSize: '24px'
                          })}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Forest Loss</span>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center gap-3">
                      <div className="w-20 h-20">
                        <CircularProgressbar 
                          value={94.5} 
                          text="94.5%"
                          styles={buildStyles({
                            pathColor: '#06b6d4',
                            textColor: '#fff',
                            trailColor: 'rgba(255,255,255,0.1)',
                            textSize: '24px'
                          })}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center">AI Confidence</span>
                    </div>
                  </div>

                </div>
              </div>

            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
