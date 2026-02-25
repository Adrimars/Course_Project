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
// Phase 3: expanded to include PPTX, XLSX, and MP4

const ALLOWED_MIME_TYPES = new Set([
  // Documents (Phase 1)
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Images (Phase 1)
  'image/png',
  'image/jpeg',
  // Presentations (Phase 3)
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Spreadsheets (Phase 3)
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Video (Phase 3)
  'video/mp4',
]);

// Phase 3: per-idea limits
export const MAX_FILES_PER_IDEA = 5;
export const MAX_AGGREGATE_SIZE = 50 * 1024 * 1024; // 50 MB total
export const MAX_SINGLE_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file

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
    // Phase 3: 10 MB per individual file; aggregate cap enforced at API level
    fileSize: 10 * 1024 * 1024,
    files: MAX_FILES_PER_IDEA,
  },
});

export { uploadDir, ALLOWED_MIME_TYPES };
