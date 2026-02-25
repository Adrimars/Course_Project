/**
 * Integration tests for GET /api/ideas/[id] (idea detail with auto-transition)
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockIdeaFindUnique = jest.fn();
const mockTransaction     = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea:          { findUnique: mockIdeaFindUnique },
    $transaction: mockTransaction,
  },
}));

import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/ideas/[id]/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const userSession  = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };
const ownerSession = { user: { id: 'owner-1', name: 'Owner', email: 'o@a.com', role: 'USER' } };

const publicIdea = {
  id: 'idea-1', title: 'Test Idea', description: 'desc', status: 'UNDER_REVIEW',
  visibility: 'PUBLIC', submitterId: 'owner-1', category: 'TECHNOLOGY',
  createdAt: new Date(), updatedAt: new Date(),
  submitter: { id: 'owner-1', name: 'Owner', email: 'o@a.com' },
  attachment: null,
  statusHistory: [],
};

const privateIdea = { ...publicIdea, id: 'idea-2', visibility: 'PRIVATE' };
const submittedIdea = { ...publicIdea, id: 'idea-3', status: 'SUBMITTED' };

type RouteContext = { params: Promise<{ id: string }> };
function makeCtx(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}`, { method: 'GET' });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/ideas/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(publicIdea);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when idea does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when non-owner tries to view private idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await GET(makeGetRequest('idea-2'), makeCtx('idea-2'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for a regular user viewing a public idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('idea-1');
  });

  it('allows idea owner to view their own private idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(ownerSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await GET(makeGetRequest('idea-2'), makeCtx('idea-2'));
    expect(res.status).toBe(200);
  });

  it('allows admin to view any private idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await GET(makeGetRequest('idea-2'), makeCtx('idea-2'));
    // Admin viewing private idea - no SUBMITTED status, so no auto-transition
    expect(res.status).toBe(200);
  });

  it('auto-transitions SUBMITTED → UNDER_REVIEW when admin views idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockIdeaFindUnique.mockResolvedValue(submittedIdea);

    // Set up transaction mock that simulates updateMany + statusHistory.create
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        idea: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        statusHistory: {
          create: jest.fn().mockResolvedValue({ id: 'sh-1' }),
        },
      };
      return fn(txMock);
    });

    // After transition, findUnique returns the updated idea
    mockIdeaFindUnique
      .mockResolvedValueOnce(submittedIdea)  // first call returns SUBMITTED
      .mockResolvedValueOnce({ ...submittedIdea, status: 'UNDER_REVIEW', id: 'idea-3' }); // re-fetch

    const res = await GET(makeGetRequest('idea-3'), makeCtx('idea-3'));
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger auto-transition for non-admin viewing SUBMITTED idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(submittedIdea);
    const res = await GET(makeGetRequest('idea-3'), makeCtx('idea-3'));
    expect(res.status).toBe(200);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
