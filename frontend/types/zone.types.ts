export interface ZoneBBox {
  lng_min: number; // West
  lat_min: number; // South
  lng_max: number; // East
  lat_max: number; // North
}

export interface ZoneCoordinates {
  lat: number;
  lng: number;
}

export interface SentinelConfig {
  resolution: number;
  cloudCoverage: number;
}

export interface Zone {
  _id: string;
  name: string;
  description: string;
  coordinates: ZoneCoordinates;
  bbox: ZoneBBox;
  sentinelConfig: SentinelConfig;
  area_km2: number;
  alertThreshold: number;
  isActive: boolean;
  lastScanned: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateZonePayload {
  name: string;
  description?: string;
  coordinates: ZoneCoordinates;
  bbox: ZoneBBox;
  sentinelConfig?: SentinelConfig;
  alertThreshold?: number;
}

export interface ZonesResponse {
  success: boolean;
  count: number;
  data: Zone[];
}

export interface SingleZoneResponse {
  success: boolean;
  data: Zone;
}
