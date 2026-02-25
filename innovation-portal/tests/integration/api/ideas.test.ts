/**
 * T063 – Integration tests for POST /api/ideas
 *
 * NOTE: These tests rely on the Next.js route handler being importable.
 * They mock next-auth getServerSession and @prisma/client to avoid a live DB.
 */

import { NextRequest } from 'next/server';

// ── Mock next-auth ───────────────────────────────────────────────────────────
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// ── Mock Prisma ──────────────────────────────────────────────────────────────
const mockCreate = jest.fn();
const mockFindUnique = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea: { create: mockCreate, findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}));

// ── Mock fs/promises (file writes) ───────────────────────────────────────────
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock uuid ────────────────────────────────────────────────────────────────
jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/ideas/route';

const mockSession = {
  user: { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'USER' },
};

/** Build a request with text fields and zero or more file attachments. */
function makeFormDataRequest(
  fields: Record<string, string>,
  files?: Array<{ name: string; type: string; content: string }>,
  videoLinks?: Array<{ url: string; title?: string }>
): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (files) {
    // Phase 3: field name is 'attachments' (plural)
    for (const f of files) {
      fd.append('attachments', new Blob([f.content], { type: f.type }), f.name);
    }
  }
  if (videoLinks) {
    fd.append('videoLinks', JSON.stringify(videoLinks));
  }
  return new NextRequest('http://localhost:3000/api/ideas', { method: 'POST', body: fd });
}

// ── Default mock transaction setup ───────────────────────────────────────────
function setupSuccessfulTransaction() {
  const createdIdea = { id: 'idea-1', title: 'A Valid Long Title Here', status: 'SUBMITTED' };
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      idea: { create: jest.fn().mockResolvedValue(createdIdea) },
      attachment: { create: jest.fn() },
    })
  );
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas – authentication & validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const req = makeFormDataRequest({ title: 'Test Idea 1234567890', description: 'A'.repeat(50), category: 'TECHNOLOGY' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 422 for a title that is too short', async () => {
    const req = makeFormDataRequest({ title: 'Short', description: 'A'.repeat(50), category: 'TECHNOLOGY' });
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns 422 for a description that is too short', async () => {
    const req = makeFormDataRequest({ title: 'A Valid Long Title Here', description: 'Too short', category: 'TECHNOLOGY' });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 422 for a missing category', async () => {
    const req = makeFormDataRequest({ title: 'A Valid Long Title Here', description: 'A'.repeat(50) });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 201 for a valid text-only submission', async () => {
    setupSuccessfulTransaction();
    const req = makeFormDataRequest({
      title: 'A Valid Long Title Here',
      description: 'A'.repeat(50),
      category: 'TECHNOLOGY',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBe('idea-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas – Phase 1 file validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns 413 when a single file exceeds 10 MB', async () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11 MB
    const req = makeFormDataRequest(
      { title: 'A Valid Long Title Here', description: 'A'.repeat(50), category: 'TECHNOLOGY' },
      [{ name: 'big.pdf', type: 'application/pdf', content: largeContent }]
    );
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('returns 422 for a disallowed MIME type', async () => {
    const req = makeFormDataRequest(
      { title: 'A Valid Long Title Here', description: 'A'.repeat(50), category: 'TECHNOLOGY' },
      [{ name: 'script.sh', type: 'application/x-sh', content: '#!/bin/sh' }]
    );
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas – Phase 3: multi-file validation', () => {
  const baseFields = {
    title: 'A Valid Long Title Here',
    description: 'A'.repeat(50),
    category: 'TECHNOLOGY',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns 422 when more than 5 files are attached', async () => {
    const files = Array.from({ length: 6 }, (_, i) => ({
      name: `file${i}.pdf`,
      type: 'application/pdf',
      content: 'pdf-content',
    }));
    const req = makeFormDataRequest(baseFields, files);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toMatch(/at most 5/i);
  });

  it('returns 413 when total size of multiple files exceeds 50 MB', async () => {
    // 3 files × 18 MB = 54 MB > 50 MB
    const bigContent = 'x'.repeat(18 * 1024 * 1024);
    const files = Array.from({ length: 3 }, (_, i) => ({
      name: `file${i}.pdf`,
      type: 'application/pdf',
      content: bigContent,
    }));
    const req = makeFormDataRequest(baseFields, files);
    const res = await POST(req);
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/50 MB/i);
  });

  it('returns 422 for an MP4 file with wrong declared MIME type', async () => {
    const req = makeFormDataRequest(
      baseFields,
      [{ name: 'video.mp4', type: 'video/avi', content: 'fake-avi' }]
    );
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 201 with exactly 5 small valid files', async () => {
    setupSuccessfulTransaction();
    // Content starts with %PDF magic bytes so the file-type mock detects application/pdf
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `doc${i}.pdf`,
      type: 'application/pdf',
      content: '%PDF-placeholder',    // 0x25 0x50 0x44 triggers PDF detection in __mocks__/file-type.js
    }));
    const req = makeFormDataRequest(baseFields, files);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas – Phase 3: video link validation', () => {
  const baseFields = {
    title: 'A Valid Long Title Here',
    description: 'A'.repeat(50),
    category: 'TECHNOLOGY',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns 422 when a video link URL is not YouTube or Vimeo', async () => {
    const req = makeFormDataRequest(baseFields, undefined, [
      { url: 'https://dailymotion.com/video/12345', title: 'Some Video' },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.details?.['videoLinks.0.url'] ?? body.error).toBeDefined();
  });

  it('returns 422 when more than 3 video links are submitted', async () => {
    const links = Array.from({ length: 4 }, (_, i) => ({
      url: `https://www.youtube.com/watch?v=dQw4w9WgXc${i}`,
      title: `Video ${i}`,
    }));
    const req = makeFormDataRequest(baseFields, undefined, links);
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 201 with a valid YouTube link', async () => {
    setupSuccessfulTransaction();
    const req = makeFormDataRequest(baseFields, undefined, [
      { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Demo' },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 201 with a valid Vimeo link', async () => {
    setupSuccessfulTransaction();
    const req = makeFormDataRequest(baseFields, undefined, [
      { url: 'https://vimeo.com/123456789', title: 'Vimeo Demo' },
    ]);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 201 with no video links supplied', async () => {
    setupSuccessfulTransaction();
    const req = makeFormDataRequest(baseFields);
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

