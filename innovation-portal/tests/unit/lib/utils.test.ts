/**
 * Unit tests for src/lib/utils.ts
 */
import {
  getPaginationParams,
  buildPaginationMeta,
  formatDate,
  formatFileSize,
  parseIntParam,
  PAGE_SIZE,
} from '@/lib/utils';

describe('getPaginationParams', () => {
  it('returns correct skip/take for page 1', () => {
    const result = getPaginationParams(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(PAGE_SIZE);
    expect(result.page).toBe(1);
  });

  it('returns correct skip/take for page 2', () => {
    const result = getPaginationParams(2);
    expect(result.skip).toBe(PAGE_SIZE);
    expect(result.take).toBe(PAGE_SIZE);
    expect(result.page).toBe(2);
  });

  it('clamps page to 1 for values less than 1', () => {
    expect(getPaginationParams(0).skip).toBe(0);
    expect(getPaginationParams(-5).skip).toBe(0);
  });

  it('uses default page 1 when no argument provided', () => {
    const result = getPaginationParams();
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
  });

  it('floors fractional page numbers', () => {
    const result = getPaginationParams(2.9);
    expect(result.page).toBe(2);
    expect(result.skip).toBe(PAGE_SIZE);
  });
});

describe('buildPaginationMeta', () => {
  it('returns correct meta for page 1 with 100 items', () => {
    const meta = buildPaginationMeta(1, 100);
    expect(meta.page).toBe(1);
    expect(meta.totalCount).toBe(100);
    expect(meta.totalPages).toBe(Math.ceil(100 / PAGE_SIZE));
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(true);
  });

  it('hasNext is false on the last page', () => {
    const totalPages = Math.ceil(100 / PAGE_SIZE);
    const meta = buildPaginationMeta(totalPages, 100);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('returns totalPages 0 for empty result set', () => {
    const meta = buildPaginationMeta(1, 0);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it('hasNext and hasPrev both false for single page result', () => {
    const meta = buildPaginationMeta(1, 3); // 3 items < PAGE_SIZE
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats a Date object to a readable string', () => {
    const date = new Date('2026-02-24T14:30:00.000Z');
    const result = formatDate(date);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // Should contain year and recognizable month
    expect(result).toMatch(/2026/);
  });

  it('accepts a string date', () => {
    const result = formatDate('2026-02-24T14:30:00.000Z');
    expect(typeof result).toBe('string');
    expect(result).toMatch(/2026/);
  });
});

describe('formatFileSize', () => {
  it('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('parseIntParam', () => {
  it('parses a valid numeric string', () => {
    expect(parseIntParam('5', 1)).toBe(5);
    expect(parseIntParam('42', 0)).toBe(42);
  });

  it('returns the default for undefined input', () => {
    expect(parseIntParam(undefined, 10)).toBe(10);
  });

  it('returns the default for an array input', () => {
    expect(parseIntParam(['1', '2'], 3)).toBe(3);
  });

  it('returns the default for a non-numeric string', () => {
    expect(parseIntParam('abc', 7)).toBe(7);
  });

  it('returns the default for an empty string', () => {
    // parseInt('') returns NaN
    expect(parseIntParam('', 5)).toBe(5);
  });
});
