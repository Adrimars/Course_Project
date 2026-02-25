import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const joinRequestSchema = z.object({
  message: z
    .string()
    .max(500, 'Message must not exceed 500 characters')
    .optional(),
});

/**
 * POST /api/ideas/[id]/join-request
 * Authenticated users can request to join an idea's project.
 * One active request per user per idea (unique constraint).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Verify idea exists and is accessible
  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, submitterId: true, visibility: true, status: true },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // Cannot request to join own idea
  if (idea.submitterId === session.user.id) {
    return NextResponse.json(
      { error: 'You cannot request to join your own idea.' },
      { status: 400 }
    );
  }

  // Cannot request on private ideas the user can't see
  if (idea.visibility === 'PRIVATE') {
    return NextResponse.json(
      { error: 'You cannot join a private idea.' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const parsed = joinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: parsed.error.issues.reduce<Record<string, string[]>>(
          (acc, issue) => {
            const key = issue.path.join('.') || 'root';
            if (!acc[key]) acc[key] = [];
            acc[key].push(issue.message);
            return acc;
          },
          {}
        ),
      },
      { status: 422 }
    );
  }

  // Check for existing request
  const existing = await prisma.joinRequest.findUnique({
    where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
  });

  if (existing) {
    if (existing.status === 'PENDING') {
      return NextResponse.json(
        { error: 'You already have a pending join request for this idea.' },
        { status: 409 }
      );
    }
    // Re-open a previously rejected request by updating it to PENDING
    if (existing.status === 'REJECTED') {
      const updated = await prisma.joinRequest.update({
        where: { id: existing.id },
        data: { status: 'PENDING', message: parsed.data.message ?? null },
        select: {
          id: true, ideaId: true, message: true, status: true,
          createdAt: true, updatedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json(updated, { status: 200 });
    }
  }

  const joinRequest = await prisma.joinRequest.create({
    data: {
      ideaId: id,
      userId: session.user.id,
      message: parsed.data.message ?? null,
    },
    select: {
      id: true,
      ideaId: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(joinRequest, { status: 201 });
}

/**
 * GET /api/ideas/[id]/join-request
 * Returns the current user's join request status for this idea,
 * OR all requests if the caller is the idea owner/admin.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, submitterId: true },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  const isOwner = idea.submitterId === session.user.id;
  const isAdmin = ['ADMIN', 'INSPECTOR'].includes(session.user.role);

  if (isOwner || isAdmin) {
    // Return all pending requests
    const requests = await prisma.joinRequest.findMany({
      where: { ideaId: id, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, ideaId: true, message: true, status: true,
        createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(requests);
  }

  // Return only the caller's own request
  const myRequest = await prisma.joinRequest.findUnique({
    where: { ideaId_userId: { ideaId: id, userId: session.user.id } },
    select: {
      id: true, ideaId: true, message: true, status: true,
      createdAt: true, updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(myRequest ?? null);
}
