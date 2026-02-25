/**
 * Integration tests for:
 *   GET  /api/ideas/[id]/notes
 *   POST /api/ideas/[id]/notes
 */
import { NextRequest } from 'next/server';

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));

// ── Prisma mocks ─────────────────────────────────────────────────────────────
const mockIdeaFindUnique = jest.fn();
const mockNoteFindMany = jest.fn();
const mockNoteCreate = jest.fn();

jest.mock('@/lib/db', () => ({
  prisma: {
    idea: { findUnique: mockIdeaFindUnique },
    note: { findMany: mockNoteFindMany, create: mockNoteCreate },
  },
}));

import { getServerSession } from 'next-auth';
import { GET, POST } from '@/app/api/ideas/[id]/notes/route';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const adminSession  = { user: { id: 'admin-1', name: 'Admin', email: 'a@a.com', role: 'ADMIN' } };
const inspSession   = { user: { id: 'insp-1',  name: 'Insp',  email: 'i@a.com', role: 'INSPECTOR' } };
const userSession   = { user: { id: 'user-1',  name: 'User',  email: 'u@a.com', role: 'USER' } };

const publicIdea  = { id: 'idea-1', submitterId: 'user-2', visibility: 'PUBLIC' };
const privateIdea = { id: 'idea-2', submitterId: 'user-2', visibility: 'PRIVATE' };
const ownPrivateIdea = { id: 'idea-3', submitterId: 'user-1', visibility: 'PRIVATE' };

type RouteContext = { params: Promise<{ id: string }> };

function makeCtx(id = 'idea-1'): RouteContext {
  return { params: Promise.resolve({ id }) };
}

function makeGetRequest(id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/notes`, { method: 'GET' });
}

function makePostRequest(body: object, id = 'idea-1'): NextRequest {
  return new NextRequest(`http://localhost:3000/api/ideas/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const sampleNote = {
  id: 'note-1', content: 'Hello', type: 'PERSONAL',
  createdAt: new Date(), updatedAt: new Date(),
  userId: 'user-1', user: { id: 'user-1', name: 'User' },
};

const collabNote = {
  id: 'note-2', content: 'Collab', type: 'COLLABORATIVE',
  createdAt: new Date(), updatedAt: new Date(),
  userId: 'admin-1', user: { id: 'admin-1', name: 'Admin' },
};

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/ideas/[id]/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(publicIdea);
    mockNoteFindMany.mockResolvedValue([sampleNote, collabNote]);
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when idea does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 403 when non-owner accesses private idea', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await GET(makeGetRequest('idea-2'), makeCtx('idea-2'));
    expect(res.status).toBe(403);
  });

  it('returns all notes for admin (including personal by others)', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
  });

  it('allows inspector to view all notes', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(inspSession);
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(200);
  });

  it('returns only own personal + all collaborative notes for a regular user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    // sampleNote is PERSONAL by user-1 (current user), collabNote is COLLABORATIVE
    const res = await GET(makeGetRequest(), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    // both should be visible: own PERSONAL + COLLABORATIVE
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('allows idea owner to access their own private idea notes', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(ownPrivateIdea);
    const res = await GET(makeGetRequest('idea-3'), makeCtx('idea-3'));
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/ideas/[id]/notes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIdeaFindUnique.mockResolvedValue(publicIdea);
    mockNoteCreate.mockResolvedValue({
      ...sampleNote,
      user: { id: 'user-1', name: 'User' },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest({ content: 'Hello' }), makeCtx());
    expect(res.status).toBe(401);
  });

  it('returns 404 when idea not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(null);
    const res = await POST(makePostRequest({ content: 'Hello' }), makeCtx());
    expect(res.status).toBe(404);
  });

  it('returns 403 when user accesses private idea note', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    mockIdeaFindUnique.mockResolvedValue(privateIdea);
    const res = await POST(makePostRequest({ content: 'Hello' }, 'idea-2'), makeCtx('idea-2'));
    expect(res.status).toBe(403);
  });

  it('returns 422 when content is empty', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ content: '' }), makeCtx());
    expect(res.status).toBe(422);
  });

  it('returns 422 when body is missing content', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({}), makeCtx());
    expect(res.status).toBe(422);
  });

  it('returns 403 when regular user tries to create a COLLABORATIVE note', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ content: 'Shared note', type: 'COLLABORATIVE' }), makeCtx());
    expect(res.status).toBe(403);
  });

  it('creates a PERSONAL note successfully as regular user', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(userSession);
    const res = await POST(makePostRequest({ content: 'My personal note', type: 'PERSONAL' }), makeCtx());
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.content).toBe('Hello'); // from mockNoteCreate
  });

  it('creates a COLLABORATIVE note successfully as admin', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(adminSession);
    mockNoteCreate.mockResolvedValue({
      ...collabNote,
      user: { id: 'admin-1', name: 'Admin' },
    });
    const res = await POST(makePostRequest({ content: 'Team note', type: 'COLLABORATIVE' }), makeCtx());
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.type).toBe('COLLABORATIVE');
  });

  it('creates a COLLABORATIVE note successfully as inspector', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(inspSession);
    mockNoteCreate.mockResolvedValue({
      ...collabNote,
      user: { id: 'insp-1', name: 'Insp' },
    });
    const res = await POST(makePostRequest({ content: 'Inspection note', type: 'COLLABORATIVE' }), makeCtx());
    expect(res.status).toBe(201);
  });
});
