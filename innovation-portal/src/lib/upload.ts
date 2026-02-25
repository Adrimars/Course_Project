import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

// ─── Upload Directory ─────────────────────────────────────────────────────────

const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

// Ensure the directory exists at startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Allowed MIME Types ───────────────────────────────────────────────────────
// spec CHK017: MIME type validated server-side, not by extension

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]);

// ─── Disk Storage Configuration ───────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, _file, cb) => {
    // spec CHK018: UUID v4 filenames — original filename never used as path
    cb(null, uuidv4());
  },
});

// ─── File Filter ──────────────────────────────────────────────────────────────

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new multer.MulterError(
        'LIMIT_UNEXPECTED_FILE',
        `File type not allowed. Allowed types: PDF, DOC, DOCX, PNG, JPEG`
      )
    );
  }
};

// ─── Multer Instance ──────────────────────────────────────────────────────────

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    // spec CHK021: 10 MB file size limit enforced at both layers
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

export { uploadDir, ALLOWED_MIME_TYPES };
