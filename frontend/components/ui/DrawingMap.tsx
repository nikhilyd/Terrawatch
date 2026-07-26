"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, Popup, Polygon, Marker, useMap } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import L from "leaflet";
import { Zone, ZoneBBox, ZoneCoordinates } from "@/types/zone.types";
import { SquareSquare, Search, MapPin, X } from "lucide-react";
import { toast } from "sonner";

interface DrawingMapProps {
  zones: Zone[];
  onZoneDrawn: (bbox: ZoneBBox, center: ZoneCoordinates) => void;
  selectedZone: Zone | null;
}

// ── Deforestation Hotspots ────────────────────────────────────────────────────
const HOTSPOTS = [
  { name: "Amazon Rainforest", country: "Brazil", lat: -3.4653, lng: -62.2159, threat: "🔴 High Deforestation Risk", color: "#ef4444" },
  { name: "Congo Basin", country: "DRC", lat: -0.2280, lng: 23.6874, threat: "🟠 Moderate Risk", color: "#f97316" },
  { name: "Sumatra Rainforest", country: "Indonesia", lat: 0.5897, lng: 101.3431, threat: "🔴 Palm Oil Threat", color: "#ef4444" },
  { name: "Northeast India Forests", country: "India", lat: 26.2006, lng: 92.9376, threat: "🟡 Encroachment Risk", color: "#eab308" },
  { name: "Western Ghats", country: "India", lat: 11.1271, lng: 76.1000, threat: "🟠 Mining Threat", color: "#f97316" },
  { name: "Borneo Rainforest", country: "Malaysia", lat: 1.5533, lng: 110.3592, threat: "🔴 Critical Zone", color: "#ef4444" },
  { name: "Cerrado Savanna", country: "Brazil", lat: -15.7801, lng: -47.9292, threat: "🟠 Agriculture Threat", color: "#f97316" },
  { name: "Sundarbans", country: "India/Bangladesh", lat: 21.9497, lng: 89.1833, threat: "🌊 Climate Threat", color: "#06b6d4" },
];

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom hotspot icon factory
const makeHotspotIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:14px; height:14px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow: 0 0 8px ${color}, 0 0 20px ${color}66;
      animation: pulse 2s infinite;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

// Force area display in km²
if (typeof window !== "undefined") {
  // @ts-ignore
  if (L.GeometryUtil?.readableArea) {
    // @ts-ignore
    L.GeometryUtil.readableArea = (area: number, isMetric: boolean) => {
      if (isMetric) return (area / 1_000_000).toFixed(2) + " km²";
      return area.toFixed(2) + " sq yd";
    };
  }
}

// ── FlyTo controller ──────────────────────────────────────────────────────────
function FlyToZone({ zone }: { zone: Zone | null }) {
  const map = useMap();
  useEffect(() => {
    if (zone) map.flyTo([zone.coordinates.lat, zone.coordinates.lng], 12, { duration: 1.5 });
  }, [zone, map]);
  return null;
}

// ── Search Bar component ──────────────────────────────────────────────────────
function SearchBar() {
  const map = useMap();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        const { lat, lon, display_name } = data[0];
        map.flyTo([parseFloat(lat), parseFloat(lon)], 10, { duration: 1.5 });
        toast.success(`Found: ${display_name.split(",").slice(0, 2).join(",")}`);
      } else {
        toast.error("Location not found. Try a different name.");
      }
    } catch {
      toast.error("Search failed. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[320px]">
      <form onSubmit={handleSearch} className="flex items-center gap-2 bg-black/70 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <Search size={14} className="text-zinc-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search forest, city, region..."
          className="bg-transparent text-white text-xs font-mono flex-1 outline-none placeholder:text-zinc-600"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")}>
            <X size={12} className="text-zinc-500 hover:text-white" />
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
        >
          {loading ? "..." : "Go"}
        </button>
      </form>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DrawingMap({ zones, onZoneDrawn, selectedZone }: DrawingMapProps) {
  const mapRef = useRef<L.Map>(null!);
  const drawnLayerRef = useRef<L.Layer | null>(null);
  const [mounted, setMounted] = useState(false);
  const featureGroupRef = useRef<L.FeatureGroup>(null!);

  useEffect(() => { setMounted(true); }, []);

  // Clear drawn layer when zone drawing is cancelled (drawnBBox reset = selectedZone null & no form)
  useEffect(() => {
    if (!selectedZone && drawnLayerRef.current && featureGroupRef.current) {
      featureGroupRef.current.removeLayer(drawnLayerRef.current);
      drawnLayerRef.current = null;
    }
  }, [selectedZone]);

  const onCreated = (e: any) => {
    const layer = e.layer;
    drawnLayerRef.current = layer; // Track for cleanup

    const bounds = layer.getBounds();
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const areaSqKm = (nw.distanceTo(ne) * nw.distanceTo(sw)) / 1_000_000;

    if (areaSqKm > 100) {
      toast.error(`Zone Area Too Large: ${areaSqKm.toFixed(0)} km²`, {
        description: "Restrict monitoring zones to under 100 km² for optimal ML processing.",
      });
      if (layer._map) layer._map.removeLayer(layer);
      drawnLayerRef.current = null;
      return;
    }

    const bbox: ZoneBBox = {
      lat_min: bounds.getSouth(),
      lat_max: bounds.getNorth(),
      lng_min: bounds.getWest(),
      lng_max: bounds.getEast(),
    };
    const center = bounds.getCenter();
    onZoneDrawn(bbox, { lat: center.lat, lng: center.lng });
  };

  const startDrawing = () => {
    if (mapRef.current) {
      // @ts-ignore
      const rectangle = new L.Draw.Rectangle(mapRef.current, {
        shapeOptions: { color: "#06b6d4", weight: 2 },
        metric: true,
      });
      rectangle.enable();
    }
  };

  const flyToHotspot = (lat: number, lng: number, name: string) => {
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lng], 11, { duration: 1.8 });
      toast.info(`📍 ${name}`, { description: "Draw a zone over this area to start monitoring." });
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        // Default: India center
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "100%", width: "100%", background: "#020617" }}
        zoomControl={false}
        ref={mapRef}
      >
        {/* ── Layer 1: Satellite imagery ── */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, i-cubed, USDA, USGS, AEX, GeoEye"
        />

        {/* ── Layer 2: Place names / labels overlay (hybrid) ── */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          attribution=""
          opacity={0.9}
        />

        {/* FlyTo controller */}
        <FlyToZone zone={selectedZone} />

        {/* Search bar */}
        <SearchBar />

        {/* ── Deforestation Hotspot Markers ── */}
        {HOTSPOTS.map((spot) => (
          <Marker
            key={spot.name}
            position={[spot.lat, spot.lng]}
            icon={makeHotspotIcon(spot.color)}
            eventHandlers={{ click: () => flyToHotspot(spot.lat, spot.lng, spot.name) }}
          >
            <Popup className="hotspot-popup">
              <div className="flex flex-col gap-1 p-1 min-w-[160px]">
                <div className="flex items-center gap-1">
                  <MapPin size={10} className="text-red-400" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-red-400">Deforestation Hotspot</span>
                </div>
                <strong className="text-zinc-800 text-sm">{spot.name}</strong>
                <span className="text-xs text-zinc-500">{spot.country}</span>
                <span className="text-xs font-medium mt-1">{spot.threat}</span>
                <button
                  onClick={() => flyToHotspot(spot.lat, spot.lng, spot.name)}
                  className="mt-2 text-[10px] bg-blue-600 text-white px-3 py-1 rounded font-mono uppercase tracking-widest hover:bg-blue-500 transition-colors"
                >
                  Fly Here & Monitor
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* ── Drawing Feature Group ── */}
        <FeatureGroup ref={featureGroupRef}>
          <div className="hidden">
            <EditControl
              position="topleft"
              onCreated={onCreated}
              draw={{
                rectangle: true,
                polygon: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
              edit={{ edit: false, remove: false }}
            />
          </div>
        </FeatureGroup>

        {/* ── Existing Zones ── */}
        {zones.map((zone) => {
          const bounds: L.LatLngTuple[] = [
            [zone.bbox.lat_max, zone.bbox.lng_min],
            [zone.bbox.lat_max, zone.bbox.lng_max],
            [zone.bbox.lat_min, zone.bbox.lng_max],
            [zone.bbox.lat_min, zone.bbox.lng_min],
          ];
          const isSelected = selectedZone?._id === zone._id;

          return (
            <Polygon
              key={zone._id}
              positions={bounds}
              pathOptions={{
                color: isSelected ? "#ef4444" : "#3b82f6",
                fillColor: isSelected ? "#ef4444" : "#3b82f6",
                fillOpacity: isSelected ? 0.4 : 0.15,
                weight: isSelected ? 3 : 1.5,
              }}
            >
              <Popup className="custom-popup">
                <div className="flex flex-col gap-1 p-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-blue-600">Protected Zone</span>
                  <strong className="text-zinc-800">{zone.name}</strong>
                  <span className="text-xs text-zinc-500">{zone.area_km2?.toFixed(2)} km²</span>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* ── Draw Button ── */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startDrawing(); }}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all font-mono text-xs uppercase font-bold tracking-widest"
        >
          <SquareSquare size={16} />
          Draw Monitoring Zone
        </button>
      </div>

      {/* ── Hotspot Legend ── */}
      <div className="absolute bottom-8 left-4 z-[1000] bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 pointer-events-none">
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">Deforestation Hotspots</p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-[9px] font-mono text-zinc-400">High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
            <span className="text-[9px] font-mono text-zinc-400">Moderate Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_6px_#eab308]" />
            <span className="text-[9px] font-mono text-zinc-400">Watch Zone</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
            <span className="text-[9px] font-mono text-zinc-400">Climate Threat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
