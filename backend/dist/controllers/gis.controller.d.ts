/**
 * GIS Controller
 * ---------------
 * Feature 1: KML Export  — GET /api/gis/zone/:id/kml      (Google Earth)
 * Feature 2: GeoJSON     — GET /api/gis/zone/:id/geojson  (ArcGIS/QGIS)
 * Feature 3: All Zones   — GET /api/gis/all/geojson       (Full map)
 */
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare const getZoneGeoJSON: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllZonesGeoJSON: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getZoneKML: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getAllZonesKML: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=gis.controller.d.ts.map