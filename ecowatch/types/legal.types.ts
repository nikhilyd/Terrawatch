// ── Carbon & Economic Loss ────────────────────────────────────────────────────
export interface CarbonImpact {
  treesLost:      number;
  co2TonnesLost:  number;
  economicDamage: {
    usd:      number;
    inr:      number;
    inrLakhs: number;
    basis:    string;
  };
}

export interface DeforestationMetrics {
  forestLossPct: number;
  deforestedKm2: number;
  deforestedHa:  number;
}

export interface CarbonLossData {
  zone: {
    id:       string;
    name:     string;
    area_km2: number;
  };
  dataSource: "historical_analysis" | "campaign_scan"; // which model was used
  period: {
    from:    string;
    to:      string;
    scans:   number;
    skipped: number;  // cloud-masked / skipped scans
  };
  deforestation: DeforestationMetrics;
  carbonImpact:  CarbonImpact;
  note:          string;
}

export interface CarbonLossResponse {
  success:  boolean;
  message?: string;
  data:     CarbonLossData | null;
}

// ── Global Risk Leaderboard ───────────────────────────────────────────────────
export interface ZoneRiskData {
  zoneId:    string;
  zoneName:  string;
  area_km2:  number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  forestPct: number | null;
  ndviLoss:  number;
  alerts3mo: number;
  lastScan:  string | null;
  scansDone: number;           // completed historical scans count
  hasData:   boolean;          // true if ≥2 done scans available
}

export interface AllRiskScoresResponse {
  success: boolean;
  count:   number;
  data:    ZoneRiskData[];
}

// ── Single Zone Risk Detail ───────────────────────────────────────────────────
export interface SingleZoneRiskData {
  zone: {
    id:       string;
    name:     string;
    area_km2: number;
  };
  dataSource: "historical_analysis" | "no_data";
  riskScore:  number;
  riskLevel:  "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    ndviLoss:     number;
    alerts3mo:    number;
    latestThreat: string;
    threats:      string[];      // full threats array from latest scan
    ndviMean:     number;        // latest scan NDVI mean
    forestPct:    number;        // latest scan forest %
    scansDone:    number;        // completed scans
    scansSkipped: number;        // cloud-masked skipped scans
    lastScanDate: string | null; // latest scan date
    totalLossHa:  number;        // total hectares lost
  };
  recommendation: string;
  lastScan:       string | null;
}

export interface SingleZoneRiskResponse {
  success: boolean;
  data:    SingleZoneRiskData;
}
