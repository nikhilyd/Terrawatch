"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Alert } from "@/types/dashboard.types";

interface MapProps {
  alerts: Alert[];
  focusCoords: [number, number] | null;
}

function MapController({ focusCoords }: { focusCoords: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (focusCoords) {
      map.flyTo(focusCoords, 10, { duration: 1.5 });
    }
  }, [focusCoords, map]);

  return null;
}

export default function InteractiveMap({ alerts, focusCoords }: MapProps) {
  // Leaflet default icon fix for Next.js
  const customIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  // A red pulsating icon for high/critical threats
  const dangerIcon = new L.DivIcon({
    className: "bg-transparent",
    html: `<div class="relative flex h-6 w-6 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const warningIcon = new L.DivIcon({
    className: "bg-transparent",
    html: `<div class="relative flex h-6 w-6 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter alerts that have hotspots
  const validAlerts = alerts.filter(a => a.hotspot && a.status !== 'RESOLVED');

  if (!mounted) {
    return <div className="w-full h-full bg-[#020617]" />;
  }

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[20, 0]} 
        zoom={3} 
        style={{ height: "100%", width: "100%", background: "#020617" }}
        zoomControl={false}
      >
        {/* Dark theme tile layer */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        {validAlerts.map((alert) => {
          if (!alert.hotspot) return null;
          
          const icon = alert.severity === 'CRITICAL' || alert.severity === 'HIGH' 
            ? dangerIcon 
            : warningIcon;

          return (
            <Marker 
              key={alert._id} 
              position={[alert.hotspot.lat, alert.hotspot.lng]}
              icon={icon}
            >
              <Popup className="custom-popup">
                <div className="flex flex-col gap-1 p-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-blue-500">Threat Detected</span>
                  <strong className="text-zinc-800">{alert.message}</strong>
                  <span className="text-xs text-zinc-500">Severity: {alert.severity}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapController focusCoords={focusCoords} />
      </MapContainer>
    </div>
  );
}
