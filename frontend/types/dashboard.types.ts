export interface Zone {
  _id: string;
  name: string;
  coordinates: {
    type: string;
    coordinates: number[][][];
  };
}

export interface Hotspot {
  lat: number;
  lng: number;
}

export interface Alert {
  _id: string;
  zoneId: Zone | string;
  scanId: string;
  forestLoss: number;
  bareSoilIncrease: number;
  waterLoss: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "FALSE_ALARM";
  message: string;
  isRead: boolean;
  createdAt: string;
  changeType?: string;
  probableCause?: string;
  hotspot?: Hotspot | null;
  comparisonImagePath?: string;
}

export interface AnalyticsStats {
  _id: string;
  count: number;
}

export interface AnalyticsResponse {
  success: boolean;
  data: {
    labels: string[];
    data: number[];
  };
}

export interface AlertsOverTimeResponse {
  success: boolean;
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  };
}

export interface AlertsResponse {
  success: boolean;
  count: number;
  data: Alert[];
}

export interface GenericResponse {
  success: boolean;
  message?: string;
}
