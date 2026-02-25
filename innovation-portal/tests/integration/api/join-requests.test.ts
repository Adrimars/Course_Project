/**
 * Integration tests for:
 *   POST /api/ideas/[id]/join-request
 *   GET  /api/ideas/[id]/join-request
 *   PATCH /api/join-requests/[id]
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockIdeaFindUnique       = jest.fn();
const mockJoinRequestFindUnique = jest.fn();
const mockJoinRequestFindFirst  = jest.fn();
const mockJoinRequestCreate    = jest.fn();
const mockJoinRequestUpdate    = jest.fn();
const mockTransaction           = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea:        { findUnique: mockIdeaFindUnique },
    joinRequest: {
      findUnique: mockJoinRequestFindUnique,
      findFirst:  mockJoinRequestFindFirst,
      create:     mockJoinRequestCreate,
      update:     mockJoinRequestUpdate,
    },
    $transaction: mockTransaction,
  },
}));

import { getServerSession } from 'next-auth';
import { POST, GET }  from '@/app/api/ideas/[id]/join-request/route';
import { PATCH }      from '@/app/api/join-requests/[id]/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const userSession  = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };
const ownerSession = { user: { id: 'owner-1', name: 'Owner', email: 'o@a.com', role: 'USER' } };

const publicIdea  = { id: 'idea-1', submitterId: 'owner-1', visibility: 'PUBLIC', status: 'UNDER_REVIEW' };
const privateIdea = { id: 'idea-2', submitterId: 'owner-1', visibility: 'PRIVATE', status: 'UNDER_REVIEW' };
const ownIdea     = { id: 'idea-3', submitterId: 'user-1',  visibility: 'PUBLIC', status: 'UNDER_REVIEW' };

const pendingRequest = {
  id: 'jr-1', ideaId: 'idea-1', userId: 'user-1', message: null,
  status: 'PENDING', createdAt: new Date(), updatedAt: new Date(),
  user: { id: 'user-1', name: 'User', email: 'u@a.com' },
};

const rejectedRequest = {
  ...pendingRequest, id: 'jr-2', status: 'REJECTED',
};

type RouteContext = { params: Promise<{ id: string }> };
function makeCtx(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makePostRequest(body: object, id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/join-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/join-request`, { method: 'GET' });
}

function makePatchRequest(body: object, id = 'jr-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/join-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas/[id]/join-request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(publicIdea);
    mockJoinRequestFindUnique.mockResolvedValue(null);
    mockJoinRequestCreate.mockResolvedValue({
      ...pendingRequest,
      user: { id: 'user-1', name: 'User', email: 'u@a.com' },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest({}), makeCtx('idea-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when idea not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await POST(makePostRequest({}), makeCtx('idea-1'));
    expect(res.status).toBe(404);
  });

  it('returns 400 when user tries to join their own idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(ownIdea);
    const res = await POST(makePostRequest({}), makeCtx('idea-3'));
    expect(res.status).toBe(400);
  });

  it('returns 403 when idea is private', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await POST(makePostRequest({}), makeCtx('idea-2'));
    expect(res.status).toBe(403);
  });

  it('returns 409 when user already has a PENDING request', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockJoinRequestFindUnique.mockResolvedValue(pendingRequest);
    const res = await POST(makePostRequest({}), makeCtx('idea-1'));
    expect(res.status).toBe(409);
  });

  it('re-opens a REJECTED request by updating to PENDING', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockJoinRequestFindUnique.mockResolvedValue(rejectedRequest);
    mockJoinRequestUpdate.mockResolvedValue({
      ...rejectedRequest, status: 'PENDING',
      user: { id: 'user-1', name: 'User', email: 'u@a.com' },
    });
    const res = await POST(makePostRequest({}), makeCtx('idea-1'));
    expect(res.status).toBe(200);
  });

  it('creates a new join request successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ message: 'I want to join!' }), makeCtx('idea-1'));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('PENDING');
  });

  it('returns 422 when message exceeds 500 chars', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ message: 'x'.repeat(501) }), makeCtx('idea-1'));
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/ideas/[id]/join-request', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(publicIdea);
    mockJoinRequestFindUnique.mockResolvedValue(pendingRequest);
    mockJoinRequestFindFirst.mockResolvedValue(pendingRequest);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when idea not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(404);
  });

  it('returns own join request for a regular user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest(), makeCtx('idea-1'));
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/join-requests/[id]', () => {
  const joinRequestWithIdea = {
    ...pendingRequest,
    idea: { id: 'idea-1', submitterId: 'owner-1' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJoinRequestFindUnique.mockResolvedValue(joinRequestWithIdea);
    // Default transaction: resolve with the updated request
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        joinRequest: {
          update: jest.fn().mockResolvedValue({
            ...pendingRequest, status: 'APPROVED',
            user: { id: 'user-1', name: 'User', email: 'u@a.com' },
          }),
        },
        assignment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'assign-new' }),
        },
      };
      return fn(txMock);
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: 'APPROVED' }), makeCtx('jr-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when join request not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(ownerSession);
    mockJoinRequestFindUnique.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: 'APPROVED' }), makeCtx('jr-1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is neither owner nor admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession); // user-1 is requester, not owner
    const res = await PATCH(makePatchRequest({ status: 'APPROVED' }), makeCtx('jr-1'));
    expect(res.status).toBe(403);
  });

  it('returns 409 when request is not PENDING', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(ownerSession);
    mockJoinRequestFindUnique.mockResolvedValue({
      ...joinRequestWithIdea, status: 'APPROVED',
    });
    const res = await PATCH(makePatchRequest({ status: 'REJECTED' }), makeCtx('jr-1'));
    expect(res.status).toBe(409);
  });

  it('returns 422 for invalid status value', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(ownerSession);
    const res = await PATCH(makePatchRequest({ status: 'PENDING' }), makeCtx('jr-1'));
    expect(res.status).toBe(422);
  });

  it('approves a join request successfully (owner)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(ownerSession);
    const res = await PATCH(makePatchRequest({ status: 'APPROVED' }), makeCtx('jr-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('APPROVED');
  });

  it('rejects a join request successfully (admin)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        joinRequest: {
          update: jest.fn().mockResolvedValue({
            ...pendingRequest, status: 'REJECTED',
            user: { id: 'user-1', name: 'User', email: 'u@a.com' },
          }),
        },
        assignment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'assign-new' }),
        },
      };
      return fn(txMock);
    });
    const res = await PATCH(makePatchRequest({ status: 'REJECTED' }), makeCtx('jr-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('REJECTED');
  });
});
