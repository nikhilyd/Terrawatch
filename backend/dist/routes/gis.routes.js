"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gis_controller_1 = require("../controllers/gis.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.get('/zone/:id/geojson', gis_controller_1.getZoneGeoJSON); // Single zone GeoJSON
router.get('/zone/:id/kml', gis_controller_1.getZoneKML); // Single zone KML (Google Earth)
router.get('/all/geojson', gis_controller_1.getAllZonesGeoJSON); // All zones GeoJSON
router.get('/all/kml', gis_controller_1.getAllZonesKML); // All zones KML
exports.default = router;
//# sourceMappingURL=gis.routes.js.map