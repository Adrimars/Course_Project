import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const assignmentUpdateSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED']),
});

/**
 * PATCH /api/assignments/[id]
 * Assignee only: accept or decline an assignment.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      assigneeId: true,
      status: true,
      ideaId: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
  }

  // Only the assignee can accept/decline
  if (assignment.assigneeId !== session.user.id) {
    return NextResponse.json(
      { error: 'Only the assigned user can accept or decline this assignment.' },
      { status: 403 }
    );
  }

  if (assignment.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Assignment is already ${assignment.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = assignmentUpdateSchema.safeParse(body);
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

  const updated = await prisma.assignment.update({
    where: { id },
    data: { status: parsed.data.status },
    select: {
      id: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      assigner: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
