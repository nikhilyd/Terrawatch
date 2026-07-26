// Campaign & Historical API Types

// ── Campaign Scan Entry ──────────────────────────────────────────────────────
export interface CampaignScan {
  scheduledDate:     string;
  actualDate:        string | null;
  scanId:            string | null;
  status:            "pending" | "processing" | "done" | "skipped";
  skipReason:        string;
  isBaseline:        boolean;
  ndvi:              number;
  forestPct:         number;
  deltaFromBaseline: number;  // % change from Scan 1
  deltaFromPrevious: number;  // % change from Scan N-1
  lossHectares:      number;
  alertSent:         boolean;
}

// ── Campaign Final Report ────────────────────────────────────────────────────
export interface CampaignReport {
  totalLossPct:     number;
  totalLossHa:      number;
  ratePerYear:      number;
  biggestDropPct:   number;
  biggestDropIndex: number;
  aiVerdict:        string;
  generatedAt:      string;
}

// ── Campaign Document ────────────────────────────────────────────────────────
export interface Campaign {
  _id:            string;
  name:           string;
  zoneId:         { _id: string; name: string; bbox: any; area_km2: number } | string;
  bbox:           number[];
  areaKm2:        number;
  startDate:      string;
  endDate:        string;
  scanDates:      string[];
  scanCount:      number;
  resolution:     number;
  maxCloudCover:  number;
  retryIfCloudy:  boolean;
  alertEmail:     string;
  alertThreshold: number;
  status:         "active" | "paused" | "completed";
  scans:          CampaignScan[];
  currentScanIdx: number;
  finalReport:    CampaignReport | null;
  createdAt:      string;
  updatedAt:      string;
}

// ── Preview Dates Response ────────────────────────────────────────────────────
export interface PreviewDatesResponse {
  success: boolean;
  data?: {
    mode:        "historical" | "monitoring";
    dates:       string[];
    scanCount:   number;
    totalDays:   number;
    gapDays:     number;
    areaWarning: string | null;
    note:        string | null;
  };
  message?: string;
}

// ── Historical Analysis ───────────────────────────────────────────────────────
export interface HistoricalScan {
  date:             string;
  status:           "done" | "skipped";
  skip_reason:      string;
  ndvi_mean:        number;
  forest_pct:       number;
  vegetation_pct:   number;
  water_pct:        number;
  bare_soil_pct:    number;
  cloud_pct:        number;   // % pixels masked out (SCL cloud/shadow)
  threats:          string[];
  severity:         string;
  description:      string;
  image_path:       string;
  heatmap_path:     string;
  delta_from_first: number;
  loss_hectares:    number;
}

export interface HistoricalSummary {
  total_loss_pct:    number;
  total_loss_ha:     number;
  rate_per_year:     number;
  biggest_drop_pct:  number;
  biggest_drop_date: string;
  scans_done:        number;
  scans_skipped:     number;
}

export interface HistoricalResult {
  zone_id:    string;
  scan_count: number;
  scans:      HistoricalScan[];
  summary:    HistoricalSummary;
  ai_verdict: string;
}
