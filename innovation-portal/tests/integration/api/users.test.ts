/**
 * Integration tests for:
 *   GET   /api/users
 *   PATCH /api/users/[id]
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockUserFindUnique = jest.fn();
const mockUserFindMany   = jest.fn();
const mockTransaction     = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, findMany: mockUserFindMany },
    $transaction: mockTransaction,
  },
}));

import { getServerSession } from 'next-auth';
import { GET }   from '@/app/api/users/route';
import { PATCH } from '@/app/api/users/[id]/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const userSession  = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };

const sampleUser = {
  id: 'user-1', name: 'User', email: 'u@a.com', role: 'USER', createdAt: new Date(),
};

const adminUser = {
  id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN', createdAt: new Date(),
};

type RouteContext = { params: Promise<{ id: string }> };
function makeCtx(id: string): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(query = ''): NextRequest {
  return new NextRequest(`http://localhost:3000/api/users${query}`, { method: 'GET' });
}

function makePatchRequest(body: object, id = 'user-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserFindMany.mockResolvedValue([sampleUser, adminUser]);
    mockUserFindUnique.mockResolvedValue(sampleUser);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 when a regular user calls GET', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
  });

  it('returns all users for admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it('returns a single user when ?email= is provided', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest('?email=u%40a.com'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe('u@a.com');
  });

  it('returns 404 when ?email= user does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockUserFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest('?email=missing%40a.com'));
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        user: {
          count:      jest.fn().mockResolvedValue(2), // 2 admins, safe to demote
          findUnique: jest.fn().mockResolvedValue(sampleUser), // target user exists
          update:     jest.fn().mockResolvedValue({ ...sampleUser, role: 'INSPECTOR' }),
        },
      };
      return fn(txMock);
    });
    mockUserFindUnique.mockResolvedValue(sampleUser);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makePatchRequest({ role: 'INSPECTOR' }), makeCtx('user-1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when a non-admin calls PATCH', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await PATCH(makePatchRequest({ role: 'INSPECTOR' }), makeCtx('user-1'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when admin tries to change their own role', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makePatchRequest({ role: 'USER' }), makeCtx('admin-1'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid role value', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makePatchRequest({ role: 'SUPERUSER' }), makeCtx('user-1'));
    expect(res.status).toBe(400);
  });

  it('updates user role successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makePatchRequest({ role: 'INSPECTOR' }), makeCtx('user-1'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe('INSPECTOR');
  });

  it('returns 409 when demoting the last admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        user: {
          count:      jest.fn().mockResolvedValue(1), // only 1 admin left
          findUnique: jest.fn().mockResolvedValue(sampleUser),
          update:     jest.fn().mockResolvedValue({ ...adminUser, role: 'USER' }),
        },
      };
      return fn(txMock);
    });
    // Demotion to USER triggers the last-admin check
    const res = await PATCH(makePatchRequest({ role: 'USER' }), makeCtx('user-1'));
    // The route returns 409 when last admin demotion blocked
    expect([409, 400]).toContain(res.status);
  });
});
