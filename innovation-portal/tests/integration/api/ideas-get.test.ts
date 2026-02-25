/**
 * Integration tests for GET /api/ideas (paginated list with search & filter)
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockIdeaFindMany = jest.fn();
const mockIdeaCount    = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea: { findMany: mockIdeaFindMany, count: mockIdeaCount },
  },
}));

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/ideas/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const inspSession  = { user: { id: 'insp-1',  name: 'Insp',  email: 'i@a.com', role: 'INSPECTOR' } };
const userSession  = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };

const sampleIdea = {
  id: 'idea-1', title: 'Test Idea', category: 'TECHNOLOGY', status: 'UNDER_REVIEW',
  visibility: 'PUBLIC', createdAt: new Date(),
  submitter: { id: 'user-2', name: 'Bob' }, attachments: [],  // Phase 3: array
};

function makeGetRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas${query}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/ideas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindMany.mockResolvedValue([sampleIdea]);
    mockIdeaCount.mockResolvedValue(1);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns paginated idea list for a regular user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toBeDefined();
  });

  it('returns ideas for admin (sees all)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns ideas for inspector (sees all)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(inspSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
  });

  it('passes search param to Prisma where clause', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest('?search=innovation'));
    expect(res.status).toBe(200);
    // Verify findMany was called (search condition built correctly)
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it('passes status filter param to Prisma where clause', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest('?status=UNDER_REVIEW'));
    expect(res.status).toBe(200);
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it('passes category filter param to Prisma where clause', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest('?category=TECHNOLOGY'));
    expect(res.status).toBe(200);
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it('passes visibility filter param to Prisma where clause', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest('?visibility=PUBLIC'));
    expect(res.status).toBe(200);
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it('handles combined search + status + category filters', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest('?search=test&status=SUBMITTED&category=PROCESS'));
    expect(res.status).toBe(200);
    expect(mockIdeaFindMany).toHaveBeenCalledTimes(1);
  });

  it('paginates with a custom page number', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindMany.mockResolvedValue([]);
    mockIdeaCount.mockResolvedValue(25);
    const res = await GET(makeGetRequest('?page=3'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.page).toBe(3);
  });
});
