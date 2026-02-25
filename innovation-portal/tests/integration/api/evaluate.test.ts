/**
 * T066 – Integration tests for PATCH /api/ideas/[id] (admin evaluation)
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

const mockIdeaFindUnique = jest.fn();
const mockIdeaUpdate = jest.fn();
const mockHistoryCreate = jest.fn();
const mockTransaction = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea: { findUnique: mockIdeaFindUnique, update: mockIdeaUpdate },
    statusHistory: { create: mockHistoryCreate },
    $transaction: mockTransaction,
  },
}));

import { getServerSession } from 'next-auth';
import { PATCH } from '@/app/api/ideas/[id]/route';

const adminSession = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const userSession = { user: { id: 'user-1', name: 'User', email: 'u@u.com', role: 'USER' } };

const baseIdea = {
  id: 'idea-1',
  title: 'Test Idea',
  submitterId: 'user-1',
  status: 'UNDER_REVIEW',
  visibility: 'PUBLIC',
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
};

type RouteContext = { params: Promise<{ id: string }> };

function makeCtx(id = 'idea-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost:3000/api/ideas/idea-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/ideas/[id] – admin evaluation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(baseIdea);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: 'ACCEPTED', feedback: 'Great'.repeat(3) }), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 403 when a regular user tries to evaluate', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await PATCH(makeRequest({ status: 'ACCEPTED', feedback: 'Great'.repeat(3) }), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 404 when idea does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ status: 'ACCEPTED', feedback: 'Great'.repeat(3) }), makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 422 for invalid status value', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makeRequest({ status: 'PENDING', feedback: 'some feedback here' }), makeCtx());
    expect(res.status).toBe(422);
  });

  it('returns 422 when feedback is too short', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(makeRequest({ status: 'ACCEPTED', feedback: 'short' }), makeCtx());
    expect(res.status).toBe(422);
  });

  it('returns 409 on optimistic lock conflict', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await PATCH(
      makeRequest({
        status: 'ACCEPTED',
        feedback: 'Great idea overall!',
        updatedAt: '2023-01-01T00:00:00.000Z', // stale timestamp
      }),
      makeCtx()
    );
    expect(res.status).toBe(409);
  });

  it('returns 200 on successful evaluation', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const updatedIdea = { ...baseIdea, status: 'ACCEPTED', feedback: 'Great idea overall!' };
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        idea: { update: jest.fn().mockResolvedValue(updatedIdea) },
        statusHistory: { create: jest.fn().mockResolvedValue({}) },
      })
    );

    const res = await PATCH(
      makeRequest({
        status: 'ACCEPTED',
        feedback: 'Great idea overall!',
        updatedAt: '2024-01-01T00:00:00.000Z', // matches baseIdea
      }),
      makeCtx()
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ACCEPTED');
  });
});

describe('PATCH /api/ideas/[id] – visibility toggle (submitter)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(baseIdea);
  });

  it('returns 403 when a non-owner tries to toggle visibility', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'other-user', role: 'USER' } });
    const res = await PATCH(makeRequest({ visibility: 'PRIVATE' }), makeCtx());
    expect(res.status).toBe(403);
  });

  it('returns 200 when owner toggles visibility', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaUpdate.mockResolvedValue({ ...baseIdea, visibility: 'PRIVATE' });
    const res = await PATCH(makeRequest({ visibility: 'PRIVATE' }), makeCtx());
    expect(res.status).toBe(200);
  });
});
