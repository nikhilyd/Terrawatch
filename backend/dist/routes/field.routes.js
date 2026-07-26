"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const field_controller_1 = require("../controllers/field.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/field/'),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `field_${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        cb(null, allowed.test(file.mimetype));
    },
});
const router = (0, express_1.Router)();
router.use(auth_middleware_1.protect);
router.post('/report', upload.single('photo'), field_controller_1.submitFieldReport);
router.get('/reports', field_controller_1.getFieldReports); // ?zone=<id>
exports.default = router;
//# sourceMappingURL=field.routes.js.map