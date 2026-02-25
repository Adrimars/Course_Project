import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { evaluateSchema, visibilityUpdateSchema } from '@/lib/validations/idea';
import { Role } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/ideas/[id] — Idea detail ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === Role.ADMIN;

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, name: true, email: true },
      },
      attachment: {
        select: { id: true, originalName: true, mimeType: true, size: true },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: {
          admin: { select: { name: true } },
        },
      },
    },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // spec FR-007d / CHK008: Private ideas are only accessible by owner or admins
  if (
    idea.visibility === 'PRIVATE' &&
    !isAdmin &&
    idea.submitterId !== session.user.id
  ) {
    return NextResponse.json(
      { error: 'You do not have access to this idea.' },
      { status: 403 }
    );
  }

  // spec FR-008a / CHK012: Auto-transition SUBMITTED → UNDER_REVIEW when an admin first views
  if (isAdmin && idea.status === 'SUBMITTED') {
    await prisma.$transaction(async (tx) => {
      // Idempotent: WHERE status = 'SUBMITTED' prevents duplicate transitions
      const updated = await tx.idea.updateMany({
        where: { id, status: 'SUBMITTED' },
        data: { status: 'UNDER_REVIEW' },
      });

      if (updated.count > 0) {
        await tx.statusHistory.create({
          data: {
            ideaId: id,
            adminId: session.user.id,
            fromStatus: 'SUBMITTED',
            toStatus: 'UNDER_REVIEW',
            feedback: 'Idea opened for review',
          },
        });
      }
    });

    // Re-fetch the updated idea
    const refreshed = await prisma.idea.findUnique({
      where: { id },
      include: {
        submitter: { select: { id: true, name: true, email: true } },
        attachment: {
          select: { id: true, originalName: true, mimeType: true, size: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { admin: { select: { name: true } } },
        },
      },
    });
    return NextResponse.json(refreshed);
  }

  return NextResponse.json(idea);
}

// ─── PATCH /api/ideas/[id] — Admin evaluation or submitter visibility ─────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // ── Path A: Admin evaluation (status + feedback) ──────────────────────────
  if ('status' in body || 'feedback' in body) {
    if (!isPrivileged) {
      return NextResponse.json(
        { error: 'Only admins and inspectors can change idea status.' },
        { status: 403 }
      );
    }

    const parsed = evaluateSchema.safeParse(body);
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

    const { status: newStatus, feedback } = parsed.data;

    // Fetch current idea to get fromStatus
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // BUG-6 FIX: Enforce valid status transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SUBMITTED: ['UNDER_REVIEW'],
      UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'INSPECTING'],
      ACCEPTED: ['UNDER_REVIEW'],
      REJECTED: ['UNDER_REVIEW'],
      INSPECTING: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
    };

    const allowed = VALID_TRANSITIONS[idea.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${idea.status} to ${newStatus}.`,
          allowedTransitions: allowed,
        },
        { status: 422 }
      );
    }

    // spec CHK029: Optimistic locking — check updatedAt if provided
    if (body.updatedAt && new Date(body.updatedAt).getTime() !== idea.updatedAt.getTime()) {
      return NextResponse.json(
        {
          error: 'This idea has been updated by another session. Please refresh.',
          currentUpdatedAt: idea.updatedAt,
        },
        { status: 409 }
      );
    }

    // Update status + create StatusHistory in a transaction (spec CHK048)
    const updated = await prisma.$transaction(async (tx) => {
      const updatedIdea = await tx.idea.update({
        where: { id },
        data: { status: newStatus },
        include: {
          submitter: { select: { id: true, name: true, email: true } },
          attachment: {
            select: { id: true, originalName: true, mimeType: true, size: true },
          },
          statusHistory: {
            orderBy: { createdAt: 'asc' },
            include: { admin: { select: { name: true } } },
          },
        },
      });

      await tx.statusHistory.create({
        data: {
          ideaId: id,
          adminId: session.user.id,
          fromStatus: idea.status,
          toStatus: newStatus,
          feedback,
        },
      });

      return updatedIdea;
    });

    return NextResponse.json(updated);
  }

  // ── Path B: Submitter visibility change ───────────────────────────────────
  if ('visibility' in body) {
    const idea = await prisma.idea.findUnique({ where: { id } });
    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Only the original submitter can change visibility (spec FR-007c)
    if (idea.submitterId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the original submitter can change visibility.' },
        { status: 403 }
      );
    }

    const parsed = visibilityUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid visibility value.' }, { status: 400 });
    }

    const updated = await prisma.idea.update({
      where: { id },
      data: { visibility: parsed.data.visibility },
    });

    return NextResponse.json({ visibility: updated.visibility });
  }

  return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
}
