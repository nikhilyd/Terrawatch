"use client";

import { Zone } from "@/types/zone.types";
import { Virtuoso } from "react-virtuoso";
import { Crosshair, Map, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

interface ZoneRegistryListProps {
  zones: Zone[];
  onSelectZone: (zone: Zone) => void;
  selectedZoneId?: string;
  onEditZone?: (zone: Zone) => void;
  onDeleteZone?: (zone: Zone) => void;
}

export function ZoneRegistryList({ zones, onSelectZone, selectedZoneId, onEditZone, onDeleteZone }: ZoneRegistryListProps) {
  return (
    <div className="w-full h-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
        <Map className="text-cyan-400" size={18} />
        <h2 className="text-xs font-mono tracking-widest uppercase text-white">Protected Zones</h2>
        <span className="ml-auto text-[10px] font-mono text-zinc-500 bg-white/5 px-2 py-1 rounded">
          {zones.length} Total
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <TooltipProvider delayDuration={200}>
          <Virtuoso
            style={{ height: "100%" }}
            data={zones}
            className="scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pr-2"
            itemContent={(_, zone) => (
              <div 
                className={`group flex items-center justify-between p-3 mb-2 rounded-xl border transition-all cursor-pointer ${
                  selectedZoneId === zone._id 
                    ? "bg-cyan-500/10 border-cyan-500/30" 
                    : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"
                }`}
                onClick={() => onSelectZone(zone)}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">
                    {zone.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Added {formatDistanceToNow(new Date(zone.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1">
                  {onEditZone && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditZone(zone); }}
                          className="p-1.5 text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white">
                        Edit Zone
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {onDeleteZone && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteZone(zone); }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white">
                        Delete Zone
                      </TooltipContent>
                    </Tooltip>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1.5 text-zinc-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors ml-1 border-l border-white/5 pl-2">
                        <Crosshair size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-black/90 border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-white animate-in fade-in zoom-in duration-200">
                      Fly to {zone.name}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
          />
        </TooltipProvider>
      </div>
    </div>
  );
}
