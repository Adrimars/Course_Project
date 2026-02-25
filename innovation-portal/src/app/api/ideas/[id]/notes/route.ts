import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { z } from 'zod';

type RouteParams = { params: Promise<{ id: string }> };

const noteCreateSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content cannot be empty')
    .max(5000, 'Note must not exceed 5000 characters'),
  type: z.enum(['PERSONAL', 'COLLABORATIVE']).default('PERSONAL'),
});

/**
 * GET /api/ideas/[id]/notes
 * Returns notes visible to the caller:
 *  - PERSONAL notes: only visible to the note's author
 *  - COLLABORATIVE notes: visible to collaborators, inspectors, and admins
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  // Verify idea exists and caller has access
  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, submitterId: true, visibility: true },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  if (idea.visibility === 'PRIVATE' && idea.submitterId !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch notes with visibility rules applied
  const notes = await prisma.note.findMany({
    where: isPrivileged
      ? { ideaId: id }
      : {
          ideaId: id,
          OR: [
            { type: 'COLLABORATIVE' as const },
            { type: 'PERSONAL' as const, userId: session.user.id },
          ],
        },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, name: true } },
    },
  });

  // For non-privileged users: filter PERSONAL notes to only own
  const visibleNotes = isPrivileged
    ? notes
    : notes.filter(
        (n) => n.type === 'COLLABORATIVE' || n.userId === session.user.id
      );

  return NextResponse.json(visibleNotes);
}

/**
 * POST /api/ideas/[id]/notes
 * Create a note on an idea.
 * PERSONAL notes are scoped to the author.
 * COLLABORATIVE notes are visible to inspectors/admins.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const isAdmin = session.user.role === Role.ADMIN;
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, submitterId: true, visibility: true },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  if (idea.visibility === 'PRIVATE' && idea.submitterId !== session.user.id && !isPrivileged) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = noteCreateSchema.safeParse(body);
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

  const { content, type } = parsed.data;

  // Only privileged users can create COLLABORATIVE notes
  if (type === 'COLLABORATIVE' && !isPrivileged) {
    return NextResponse.json(
      { error: 'Only inspectors and admins can create collaborative notes.' },
      { status: 403 }
    );
  }

  const note = await prisma.note.create({
    data: {
      ideaId: id,
      userId: session.user.id,
      content,
      type,
    },
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(note, { status: 201 });
}
