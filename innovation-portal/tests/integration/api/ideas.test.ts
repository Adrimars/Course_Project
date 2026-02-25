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

function makeFormDataRequest(fields: Record<string, string>, file?: { name: string; type: string; content: string }): NextRequest {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) {
    fd.append('attachment', new Blob([file.content], { type: file.type }), file.name);
  }
  return new NextRequest('http://localhost:3000/api/ideas', { method: 'POST', body: fd });
}

describe('POST /api/ideas', () => {
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
    const createdIdea = { id: 'idea-1', title: 'A Valid Long Title Here', status: 'SUBMITTED' };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        idea: { create: jest.fn().mockResolvedValue(createdIdea) },
        attachment: { create: jest.fn() },
      })
    );

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

  it('returns 413 when attached file exceeds 10 MB', async () => {
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11 MB
    const req = makeFormDataRequest(
      { title: 'A Valid Long Title Here', description: 'A'.repeat(50), category: 'TECHNOLOGY' },
      { name: 'big.pdf', type: 'application/pdf', content: largeContent }
    );
    const res = await POST(req);
    expect(res.status).toBe(413);
  });

  it('returns 422 for a disallowed MIME type', async () => {
    const req = makeFormDataRequest(
      { title: 'A Valid Long Title Here', description: 'A'.repeat(50), category: 'TECHNOLOGY' },
      { name: 'script.sh', type: 'application/x-sh', content: '#!/bin/sh' }
    );
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
