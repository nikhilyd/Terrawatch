"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ZoneBBox, ZoneCoordinates } from "@/types/zone.types";
import { Save, X } from "lucide-react";
import { useEffect } from "react";

const zoneSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  description: z.string().max(200).optional(),
  alertThreshold: z.number().min(1, "Threshold must be at least 1").max(100),
  cloudCoverage: z.number().min(0).max(100),
});

type ZoneFormData = z.infer<typeof zoneSchema>;

interface CreateZoneFormProps {
  bbox: ZoneBBox;
  center: ZoneCoordinates;
  onSubmit: (data: ZoneFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function CreateZoneForm({ bbox, center, onSubmit, onCancel, isSubmitting }: CreateZoneFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      name: "",
      description: "",
      alertThreshold: 10,
      cloudCoverage: 20,
    },
  });

  // Handle ESC key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="bg-black/90 backdrop-blur-2xl border border-cyan-500/30 p-6 rounded-2xl w-[400px] shadow-[0_0_50px_rgba(6,182,212,0.15)] pointer-events-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-mono uppercase tracking-widest text-cyan-400">Register New Zone</h3>
        <button onClick={onCancel} className="text-zinc-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Zone Name</label>
          <input 
            {...register("name")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            placeholder="e.g. Amazon Sector 7G"
            autoFocus
          />
          {errors.name && <span className="text-[10px] text-red-500 mt-1">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Description (Optional)</label>
          <input 
            {...register("description")}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            placeholder="Focus on illegal logging activity"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Alert Threshold (%)</label>
            <input 
              type="number"
              {...register("alertThreshold", { valueAsNumber: true })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {errors.alertThreshold && <span className="text-[10px] text-red-500 mt-1">{errors.alertThreshold.message}</span>}
          </div>
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Max Cloud Cover (%)</label>
            <input 
              type="number"
              {...register("cloudCoverage", { valueAsNumber: true })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Captured Coordinates</span>
          <span className="text-xs text-blue-400 font-mono">Lat: {center.lat.toFixed(4)}, Lng: {center.lng.toFixed(4)}</span>
        </div>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {isSubmitting ? "Registering..." : "Confirm & Monitor"}
        </button>
      </form>
    </div>
  );
}
