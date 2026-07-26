import { Router } from 'express';
import { getZoneGeoJSON, getAllZonesGeoJSON, getZoneKML, getAllZonesKML } from '../controllers/gis.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
router.use(protect);

router.get('/zone/:id/geojson',  getZoneGeoJSON);    // Single zone GeoJSON
router.get('/zone/:id/kml',      getZoneKML);         // Single zone KML (Google Earth)
router.get('/all/geojson',       getAllZonesGeoJSON); // All zones GeoJSON
router.get('/all/kml',           getAllZonesKML);     // All zones KML

export default router;
