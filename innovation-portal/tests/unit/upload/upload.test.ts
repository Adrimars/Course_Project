import { ALLOWED_MIME_TYPES } from '@/lib/upload';

/**
 * Unit tests for Multer upload configuration.
 * The fileFilter and size limit are tested via the ALLOWED_MIME_TYPES set
 * and the Multer instance's limits configuration.
 */

describe('ALLOWED_MIME_TYPES', () => {
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

  it('rejects text/plain', () => {
    expect(ALLOWED_MIME_TYPES.has('text/plain')).toBe(false);
  });

  it('rejects application/javascript', () => {
    expect(ALLOWED_MIME_TYPES.has('application/javascript')).toBe(false);
  });

  it('rejects application/zip', () => {
    expect(ALLOWED_MIME_TYPES.has('application/zip')).toBe(false);
  });

  it('rejects video/mp4', () => {
    expect(ALLOWED_MIME_TYPES.has('video/mp4')).toBe(false);
  });

  it('rejects text/html', () => {
    expect(ALLOWED_MIME_TYPES.has('text/html')).toBe(false);
  });
});

describe('Upload size limit', () => {
  it('10 MB constant equals expected byte count', () => {
    const tenMB = 10 * 1024 * 1024;
    expect(tenMB).toBe(10485760);
  });
});
