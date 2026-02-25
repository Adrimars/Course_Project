import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const assignmentCreateSchema = z.object({
  assigneeId: z.string().min(1, 'Assignee ID is required'),
});

/**
 * GET /api/ideas/[id]/assignments
 * Returns all assignments for the idea (admin/inspector only).
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  if (!isAdmin && !isInspector) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  const idea = await prisma.idea.findUnique({ where: { id }, select: { id: true } });
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  const assignments = await prisma.assignment.findMany({
    where: { ideaId: id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assigner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(assignments);
}

/**
 * POST /api/ideas/[id]/assignments
 * Admin only: assign a user to an idea.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: 'Only admins can assign users to ideas.' },
      { status: 403 }
    );
  }

  const { id } = await params;

  const idea = await prisma.idea.findUnique({ where: { id }, select: { id: true } });
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = assignmentCreateSchema.safeParse(body);
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

  const { assigneeId } = parsed.data;

  // Verify assignee exists
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, name: true, email: true },
  });
  if (!assignee) {
    return NextResponse.json({ error: 'Assignee user not found' }, { status: 404 });
  }

  // Prevent duplicate active assignment
  const existing = await prisma.assignment.findFirst({
    where: { ideaId: id, assigneeId, status: { in: ['PENDING', 'ACCEPTED'] } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'This user is already assigned to this idea.' },
      { status: 409 }
    );
  }

  const assignment = await prisma.assignment.create({
    data: {
      ideaId: id,
      assignerId: session.user.id,
      assigneeId,
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assigner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(assignment, { status: 201 });
}
