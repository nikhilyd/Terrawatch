export interface PublicStats {
  monitoring: {
    totalZonesMonitored: number;
    totalSatelliteScans: number;
    latestScanDate: string | null;
    averageForestCoverage: string;
  };
  alerts: {
    totalAlertsRaised: number;
    criticalAlerts: number;
    highAlerts: number;
    activeThreats: number;
  };
  environment: {
    co2EstimateTonnes: number;
    co2EstimateLakhsINR: number;
    note: string;
  };
  spotlight: {
    mostDangerousZone: {
      name: string;
      alerts: number;
      maxLoss: number;
    } | null;
  };
  poweredBy: string;
  dataPolicy: string;
}

export interface PublicStatsResponse {
  success: boolean;
  lastUpdated: string;
  data: PublicStats;
}

export interface PublicZone {
  id: string;
  name: string;
  description: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  area_km2: number;
  lastScan: string | null;
  forestPct: number | null;
  severity: string;
  alertCount: number;
}

export interface PublicZonesResponse {
  success: boolean;
  count: number;
  data: PublicZone[];
}

export interface PublicAlert {
  zone: string;
  coordinates: {
    lat: number;
    lng: number;
  } | null;
  severity: string;
  forestLoss: string;
  message: string;
  changeType: string | null;
  probableCause: string | null;
  changedAreas: string[];
  date: string;
}

export interface PublicAlertsResponse {
  success: boolean;
  count: number;
  data: PublicAlert[];
}
