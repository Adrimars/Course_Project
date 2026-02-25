import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { visibilityUpdateSchema, ideaSubmitSchema, draftSaveSchema } from '@/lib/validations/idea';
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
  const isInspector = session.user.role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  const idea = await prisma.idea.findUnique({
    where: { id },
    include: {
      submitter: {
        select: { id: true, name: true, email: true },
      },
      attachments: {
        select: { id: true, originalName: true, mimeType: true, size: true, displayOrder: true },
        orderBy: { displayOrder: 'asc' },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        include: {
          admin: { select: { name: true } },
        },
      },
      pipeline: {
        include: {
          stages: {
            orderBy: { stageOrder: 'asc' },
            include: { reviewer: { select: { id: true, name: true } } },
          },
        },
      },
      stageReviews: {
        orderBy: { createdAt: 'asc' },
        include: {
          stage: { select: { name: true, stageOrder: true } },
          reviewer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // Phase 4: DRAFT ideas are only accessible by the owner (not admins/inspectors)
  if (idea.status === 'DRAFT') {
    if (idea.submitterId !== session.user.id) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }
    return NextResponse.json(idea);
  }

  // spec FR-007d / CHK008: Private ideas are only accessible by owner or privileged
  if (
    idea.visibility === 'PRIVATE' &&
    !isPrivileged &&
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
        attachments: {
          select: { id: true, originalName: true, mimeType: true, size: true, displayOrder: true },
          orderBy: { displayOrder: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { admin: { select: { name: true } } },
        },
        pipeline: {
          include: {
            stages: {
              orderBy: { stageOrder: 'asc' },
              include: { reviewer: { select: { id: true, name: true } } },
            },
          },
        },
        stageReviews: {
          orderBy: { createdAt: 'asc' },
          include: {
            stage: { select: { name: true, stageOrder: true } },
            reviewer: { select: { id: true, name: true } },
          },
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
  const idea = await prisma.idea.findUnique({ where: { id } });
  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // ── Phase 4: Draft paths (owner only) ─────────────────────────
  if (idea.status === 'DRAFT') {
    if (idea.submitterId !== session.user.id) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Path D: Submit draft — DRAFT → SUBMITTED (full validation)
    if (body.submitDraft === true) {
      const validationData = {
        title: body.title ?? idea.title,
        description: body.description ?? idea.description,
        category: body.category ?? idea.category,
        visibility: body.visibility ?? idea.visibility,
        metadata: body.metadata ?? (idea.metadata as Record<string, string> | undefined),
        videoLinks: body.videoLinks ??
          (idea.videoLinks as Array<{ url: string; title?: string }> | undefined) ?? [],
      };
      const validation = ideaSubmitSchema.safeParse(validationData);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: 'Cannot submit — please complete required fields first.',
            details: validation.error.issues.reduce<Record<string, string[]>>(
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
      const submitted = await prisma.idea.update({
        where: { id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: {
          status: 'SUBMITTED',
          title: validation.data.title,
          description: validation.data.description,
          category: validation.data.category as never,
          visibility: validation.data.visibility as never,
          metadata: validation.data.metadata ?? undefined,
          videoLinks:
            validation.data.videoLinks && validation.data.videoLinks.length > 0
              ? validation.data.videoLinks
              : undefined,
        } as never,
        include: {
          submitter: { select: { id: true, name: true, email: true } },
          attachments: {
            select: { id: true, originalName: true, mimeType: true, size: true, displayOrder: true },
            orderBy: { displayOrder: 'asc' },
          },
          statusHistory: { orderBy: { createdAt: 'asc' }, include: { admin: { select: { name: true } } } },
        },
      });
      return NextResponse.json(submitted);
    }

    // Path C: Update draft fields
    if ('draft' in body) {
      const draftFields = body.draft as Record<string, unknown>;
      const parsed = draftSaveSchema.safeParse(draftFields);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid draft fields.', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }
      const updated = await prisma.idea.update({
        where: { id },
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category as never,
          visibility: parsed.data.visibility as never,
          metadata: parsed.data.metadata ?? undefined,
          videoLinks:
            parsed.data.videoLinks && parsed.data.videoLinks.length > 0
              ? parsed.data.videoLinks
              : undefined,
        } as never,
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }
  // ── Path A: Admin/Inspector evaluation (status + feedback) ──────────────────
  if ('status' in body || 'feedback' in body) {
    if (!isPrivileged) {
      return NextResponse.json(
        { error: 'Only admins and inspectors can change idea status.' },
        { status: 403 }
      );
    }

    const newStatus = body.status as never;
    const feedback: string | undefined = body.feedback;

    // Validate status value exists in schema
    const allStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'INSPECTING'];
    if (!allStatuses.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status value.' }, { status: 422 });
    }

    // BUG-6 FIX: Enforce valid status transitions
    const VALID_TRANSITIONS: Record<string, string[]> = {
      SUBMITTED: ['UNDER_REVIEW'],
      UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'INSPECTING'],
      ACCEPTED: ['UNDER_REVIEW'],
      REJECTED: ['UNDER_REVIEW'],
      INSPECTING: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
    };

    // Phase 5: Block direct Accept/Reject if idea has a pipeline
    if (idea.pipelineId && (newStatus === 'ACCEPTED' || newStatus === 'REJECTED')) {
      return NextResponse.json(
        {
          error: 'This idea is in multi-stage review. Use the stage review workflow instead.',
        },
        { status: 422 }
      );
    }

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
          attachments: {
            select: { id: true, originalName: true, mimeType: true, size: true, displayOrder: true },
            orderBy: { displayOrder: 'asc' as const },
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
          feedback: feedback ?? null,
        },
      });

      return updatedIdea;
    });

    return NextResponse.json(updated);
  }

  // ── Path B: Submitter visibility change ───────────────────────────────────
  if ('visibility' in body) {

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

// ─── DELETE /api/ideas/[id] — Delete a DRAFT idea (owner only) ──────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const idea = await prisma.idea.findUnique({
    where: { id },
    select: { id: true, status: true, submitterId: true },
  });

  if (!idea) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  // Only DRAFT ideas can be deleted
  if (idea.status !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Only draft ideas can be deleted.' },
      { status: 403 }
    );
  }

  // Only the owner can delete their draft
  if (idea.submitterId !== session.user.id) {
    return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
  }

  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
