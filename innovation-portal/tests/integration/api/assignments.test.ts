/**
 * Integration tests for:
 *   GET  /api/ideas/[id]/assignments
 *   POST /api/ideas/[id]/assignments
 *   PATCH /api/assignments/[id]
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockIdeaFindUnique    = jest.fn();
const mockAssignmentFindMany = jest.fn();
const mockAssignmentFindFirst = jest.fn();
const mockAssignmentCreate  = jest.fn();
const mockAssignmentFindUnique = jest.fn();
const mockAssignmentUpdate  = jest.fn();
const mockUserFindUnique    = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea:       { findUnique: mockIdeaFindUnique },
    user:       { findUnique: mockUserFindUnique },
    assignment: {
      findMany:   mockAssignmentFindMany,
      findFirst:  mockAssignmentFindFirst,
      findUnique: mockAssignmentFindUnique,
      create:     mockAssignmentCreate,
      update:     mockAssignmentUpdate,
    },
  },
}));

import { getServerSession } from 'next-auth';
import { GET, POST }  from '@/app/api/ideas/[id]/assignments/route';
import { PATCH }      from '@/app/api/assignments/[id]/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const inspSession  = { user: { id: 'insp-1',  name: 'Insp',  email: 'i@a.com', role: 'INSPECTOR' } };
const userSession  = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };

const baseIdea = { id: 'idea-1' };

const baseAssignment = {
  id: 'assign-1',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  assigner: { id: 'admin-1', name: 'Admin' },
  assignee: { id: 'user-1', name: 'User', email: 'u@a.com' },
};

type RouteContext = { params: Promise<{ id: string }> };

function makeCtx(id = 'idea-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/assignments`, { method: 'GET' });
}

function makePostRequest(body: object, id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makePatchRequest(body: object, id = 'assign-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/assignments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/ideas/[id]/assignments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(baseIdea);
    mockAssignmentFindMany.mockResolvedValue([baseAssignment]);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 when a regular user calls GET', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 404 when idea not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns assignments for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
  });

  it('returns assignments for inspector', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(inspSession);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas/[id]/assignments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(baseIdea);
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', name: 'User', email: 'u@a.com' });
    mockAssignmentFindFirst.mockResolvedValue(null);
    mockAssignmentCreate.mockResolvedValue({
      ...baseAssignment,
      ideasId: 'idea-1',
      assignerId: 'admin-1',
      assigneeId: 'user-1',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin calls POST', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 403 when an inspector calls POST', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(inspSession);
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 404 when idea not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 422 when assigneeId is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await POST(makePostRequest({}), makeCtx());
    expect(res.status).toBe(422);
  });

  it('returns 409 when active assignment already exists', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockAssignmentFindFirst.mockResolvedValue({ id: 'existing-assign', status: 'PENDING' });
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(409);
  });

  it('creates an assignment successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await POST(makePostRequest({ assigneeId: 'user-1' }), makeCtx());
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe('PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/assignments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssignmentFindUnique.mockResolvedValue({
      id: 'assign-1', assigneeId: 'user-1', status: 'PENDING', ideaId: 'idea-1',
    });
    mockAssignmentUpdate.mockResolvedValue({
      ...baseAssignment,
      status: 'ACCEPTED',
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: 'ACCEPTED' }), makeCtx('assign-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when assignment not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockAssignmentFindUnique.mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ status: 'ACCEPTED' }), makeCtx('assign-1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when caller is not the assignee', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makePatchRequest({ status: 'ACCEPTED' }), makeCtx('assign-1'));
    expect(res.status).toBe(403);
  });

  it('returns 409 when assignment is not PENDING', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockAssignmentFindUnique.mockResolvedValue({
      id: 'assign-1', assigneeId: 'user-1', status: 'ACCEPTED', ideaId: 'idea-1',
    });
    const res = await PATCH(makePatchRequest({ status: 'DECLINED' }), makeCtx('assign-1'));
    expect(res.status).toBe(409);
  });

  it('returns 422 for invalid status value', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await PATCH(makePatchRequest({ status: 'PENDING' }), makeCtx('assign-1'));
    expect(res.status).toBe(422);
  });

  it('accepts the assignment successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await PATCH(makePatchRequest({ status: 'ACCEPTED' }), makeCtx('assign-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ACCEPTED');
  });

  it('declines the assignment successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockAssignmentUpdate.mockResolvedValue({ ...baseAssignment, status: 'DECLINED' });
    const res = await PATCH(makePatchRequest({ status: 'DECLINED' }), makeCtx('assign-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('DECLINED');
  });
});
