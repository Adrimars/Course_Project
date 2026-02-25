import {
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_IDEA,
  MAX_AGGREGATE_SIZE,
  MAX_SINGLE_FILE_SIZE,
} from '@/lib/upload';

/**
 * Unit tests for Multer upload configuration.
 * The fileFilter and size limit are tested via the ALLOWED_MIME_TYPES set
 * and the exported constant values.
 */

describe('ALLOWED_MIME_TYPES – Phase 1 types', () => {
  it('accepts PDF', () => {
    expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
  });

  it('accepts DOC (Word 97-2003)', () => {
    expect(ALLOWED_MIME_TYPES.has('application/msword')).toBe(true);
  });

  it('accepts DOCX (Word 2007+)', () => {
    expect(
      ALLOWED_MIME_TYPES.has(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
    ).toBe(true);
  });

  it('accepts PNG', () => {
    expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
  });

  it('accepts JPEG', () => {
    expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true);
  });
});

describe('ALLOWED_MIME_TYPES – Phase 3 expanded types', () => {
  it('accepts PPT (PowerPoint 97-2003)', () => {
    expect(ALLOWED_MIME_TYPES.has('application/vnd.ms-powerpoint')).toBe(true);
  });

  it('accepts PPTX (PowerPoint 2007+)', () => {
    expect(
      ALLOWED_MIME_TYPES.has(
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      )
    ).toBe(true);
  });

  it('accepts XLS (Excel 97-2003)', () => {
    expect(ALLOWED_MIME_TYPES.has('application/vnd.ms-excel')).toBe(true);
  });

  it('accepts XLSX (Excel 2007+)', () => {
    expect(
      ALLOWED_MIME_TYPES.has(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
    ).toBe(true);
  });

  it('accepts MP4 video', () => {
    expect(ALLOWED_MIME_TYPES.has('video/mp4')).toBe(true);
  });
});

describe('ALLOWED_MIME_TYPES – rejected types', () => {
  it('rejects text/plain', () => {
    expect(ALLOWED_MIME_TYPES.has('text/plain')).toBe(false);
  });

  it('rejects application/javascript', () => {
    expect(ALLOWED_MIME_TYPES.has('application/javascript')).toBe(false);
  });

  it('rejects application/zip', () => {
    expect(ALLOWED_MIME_TYPES.has('application/zip')).toBe(false);
  });

  it('rejects text/html', () => {
    expect(ALLOWED_MIME_TYPES.has('text/html')).toBe(false);
  });

  it('rejects video/avi', () => {
    expect(ALLOWED_MIME_TYPES.has('video/avi')).toBe(false);
  });

  it('rejects video/webm', () => {
    expect(ALLOWED_MIME_TYPES.has('video/webm')).toBe(false);
  });
});

describe('Upload limit constants – Phase 3', () => {
  it('MAX_SINGLE_FILE_SIZE is 10 MB', () => {
    expect(MAX_SINGLE_FILE_SIZE).toBe(10 * 1024 * 1024);
  });

  it('MAX_AGGREGATE_SIZE is 50 MB', () => {
    expect(MAX_AGGREGATE_SIZE).toBe(50 * 1024 * 1024);
  });

  it('MAX_FILES_PER_IDEA is 5', () => {
    expect(MAX_FILES_PER_IDEA).toBe(5);
  });

  it('aggregate limit is 5x the per-file limit', () => {
    expect(MAX_AGGREGATE_SIZE).toBe(MAX_FILES_PER_IDEA * MAX_SINGLE_FILE_SIZE);
  });
});
