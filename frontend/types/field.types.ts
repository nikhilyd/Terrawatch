export interface FieldReport {
  _id: string;
  zoneId: {
    _id: string;
    name: string;
  };
  reporterName: string;
  imagePath: string;
  gps: {
    lat: number;
    lng: number;
  };
  notes: string;
  status: 'pending' | 'analyzed';
  aiAnalysis?: {
    threats: string[];
    severity: string;
    description: string;
    confidence: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FieldReportResponse {
  success: boolean;
  data: FieldReport;
}

export interface FieldReportsListResponse {
  success: boolean;
  count: number;
  data: FieldReport[];
}
