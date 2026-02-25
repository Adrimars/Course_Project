import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const joinRequestUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

/**
 * PATCH /api/join-requests/[id]
 * Idea owner or admin: approve or reject a join request.
 * On APPROVED: also creates an Assignment record so the user
 * appears in the idea's "My Ideas" for the assignee.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const joinRequest = await prisma.joinRequest.findUnique({
    where: { id },
    include: { idea: { select: { id: true, submitterId: true } } },
  });

  if (!joinRequest) {
    return NextResponse.json({ error: 'Join request not found' }, { status: 404 });
  }

  const isOwner = joinRequest.idea.submitterId === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: 'Only the idea owner or an admin can approve/reject join requests.' },
      { status: 403 }
    );
  }

  if (joinRequest.status !== 'PENDING') {
    return NextResponse.json(
      { error: `Join request is already ${joinRequest.status.toLowerCase()}.` },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = joinRequestUpdateSchema.safeParse(body);
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

  const { status: newStatus } = parsed.data;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.joinRequest.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true, ideaId: true, message: true, status: true,
        createdAt: true, updatedAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // On approval: automatically create an Assignment so the user
    // can see this idea in their "My Ideas → Assigned" tab
    if (newStatus === 'APPROVED') {
      // Avoid duplicate assignment
      const existingAssignment = await tx.assignment.findFirst({
        where: {
          ideaId: joinRequest.ideaId,
          assigneeId: joinRequest.userId,
          status: { in: ['PENDING', 'ACCEPTED'] },
        },
      });

      if (!existingAssignment) {
        await tx.assignment.create({
          data: {
            ideaId: joinRequest.ideaId,
            assignerId: session.user.id,
            assigneeId: joinRequest.userId,
            status: 'ACCEPTED', // Auto-accept since they asked to join
          },
        });
      }
    }

    return updatedRequest;
  });

  return NextResponse.json(updated);
}
