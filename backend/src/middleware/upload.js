import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import ApiError from '../utils/ApiError.js';

const uploadDir = path.resolve('uploads/designs');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED.has(ext)) {
    cb(ApiError.badRequest('Only image files (png, jpg, jpeg, webp, svg) are allowed.'));
    return;
  }
  cb(null, true);
}

export const uploadDesignImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('image');

const ALLOWED_SPREADSHEET = new Set(['.xlsx', '.csv']);

function spreadsheetFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_SPREADSHEET.has(ext)) {
    cb(ApiError.badRequest('Only .xlsx or .csv files are allowed.'));
    return;
  }
  cb(null, true);
}

export const uploadSpreadsheetFile = multer({
  storage: multer.memoryStorage(),
  fileFilter: spreadsheetFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('file');

export default uploadDesignImage;
