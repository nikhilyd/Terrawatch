"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = __importDefault(require("../config/env"));
const uploadDir = env_1.default.UPLOAD_DIR;
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path_1.default.extname(file.originalname)}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.tif', '.tiff'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext))
        cb(null, true);
    else
        cb(new Error(`Only image files allowed: ${allowed.join(', ')}`));
};
const upload = (0, multer_1.default)({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB
exports.default = upload;
//# sourceMappingURL=upload.middleware.js.map