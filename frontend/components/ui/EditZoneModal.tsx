"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Zone } from "@/types/zone.types";
import { Save, X } from "lucide-react";

const editZoneSchema = z.object({
  name: z.string().min(3, "Name is too short"),
  description: z.string().optional(),
  alertThreshold: z.number().min(1).max(100),
  cloudCoverage: z.number().min(0).max(100),
});

type EditZoneForm = z.infer<typeof editZoneSchema>;

interface EditZoneModalProps {
  zone: Zone;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<Zone>) => void;
  isSubmitting: boolean;
}

export function EditZoneModal({ zone, onClose, onSubmit, isSubmitting }: EditZoneModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditZoneForm>({
    resolver: zodResolver(editZoneSchema),
    defaultValues: {
      name: zone.name,
      description: zone.description || "",
      alertThreshold: zone.alertThreshold,
      cloudCoverage: zone.sentinelConfig?.cloudCoverage || 20,
    },
  });

  const handleFormSubmit = (data: EditZoneForm) => {
    onSubmit(zone._id, {
      name: data.name,
      description: data.description,
      alertThreshold: data.alertThreshold,
      sentinelConfig: {
        ...zone.sentinelConfig,
        cloudCoverage: data.cloudCoverage,
      } as any,
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[450px] bg-[#020617] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"
      >
        <div className="bg-white/5 border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-mono tracking-widest text-white uppercase">Edit Zone Details</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-5 flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1 block">Zone Name</label>
            <input 
              {...register("name")}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
            {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
          </div>

          <div>
            <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1 block">Description</label>
            <textarea 
              {...register("description")}
              rows={2}
              className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1 block">Alert Threshold (%)</label>
              <input 
                type="number"
                {...register("alertThreshold", { valueAsNumber: true })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {errors.alertThreshold && <span className="text-[10px] text-red-500">{errors.alertThreshold.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1 block">Max Cloud Cover (%)</label>
              <input 
                type="number"
                {...register("cloudCoverage", { valueAsNumber: true })}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {errors.cloudCoverage && <span className="text-[10px] text-red-500">{errors.cloudCoverage.message}</span>}
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-mono uppercase tracking-widest py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold font-mono uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save size={14} /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
