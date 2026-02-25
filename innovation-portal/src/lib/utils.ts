// ─── Pagination ───────────────────────────────────────────────────────────────

export const PAGE_SIZE = 20;

/**
 * Calculate Prisma skip/take values for a given page number.
 * Pages are 1-indexed.
 */
export function getPaginationParams(page: number = 1) {
  const safePage = Math.max(1, Math.floor(page));
  return {
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    page: safePage,
  };
}

/**
 * Calculate pagination metadata to return in API responses.
 */
export function buildPaginationMeta(
  page: number,
  totalCount: number
): {
  page: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  return {
    page,
    totalPages,
    totalCount,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Format a date to "MMM DD, YYYY HH:mm"
 * e.g. "Feb 24, 2026 14:30"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format file size in human-readable format.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Type Helpers ─────────────────────────────────────────────────────────────

/**
 * Parse an integer from a query param, falling back to a default.
 */
export function parseIntParam(
  value: string | string[] | undefined,
  defaultValue: number
): number {
  if (!value || Array.isArray(value)) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
