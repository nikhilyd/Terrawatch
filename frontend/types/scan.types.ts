export interface ScanResults {
  forestPercentage: number;
  vegetationPercentage: number;
  bareSoilPercentage: number;
  waterPercentage: number;
  ndviMean: number;
  ndviMin: number;
  ndviMax: number;
  threats: string[];
  severity: "none" | "low" | "medium" | "high" | "critical";
  description: string;
  affectedAreas: string[];
  forestVisible: boolean;
  vlConfidence: "low" | "medium" | "high";
  deforestationDetected: boolean;
  heatmapPath: string;
}

export interface Scan {
  _id: string;
  zoneId: string;
  jobId: string;
  scanDate: string;
  imagePath: string;
  results: ScanResults;
  status: "pending" | "processing" | "completed" | "failed";
  failedAt: string | null;
  failReason: string;
  createdAt: string;
}

export interface TriggerScanPayload {
  zoneId: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ScansResponse {
  success: boolean;
  count: number;
  data: Scan[];
}

export interface SingleScanResponse {
  success: boolean;
  data: Scan;
}

export interface TriggerScanResponse {
  success: boolean;
  message: string;
  data?: {
    scanId: string;
    jobId: string;
    dateFrom: string;
    dateTo: string;
  };
}
