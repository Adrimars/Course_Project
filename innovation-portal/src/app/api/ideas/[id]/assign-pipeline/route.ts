import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { assignPipelineSchema } from '@/lib/validations/pipeline';
import { Role } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST /api/ideas/[id]/assign-pipeline — Assign pipeline to idea ─────────

export async function POST(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
        return NextResponse.json(
            { error: 'Only admins can assign pipelines.' },
            { status: 403 }
        );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = assignPipelineSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const idea = await prisma.idea.findUnique({
        where: { id },
        select: { id: true, status: true, pipelineId: true },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (idea.status !== 'UNDER_REVIEW') {
        return NextResponse.json(
            { error: 'Pipeline can only be assigned to ideas in UNDER_REVIEW status.' },
            { status: 422 }
        );
    }

    const pipeline = await prisma.reviewPipeline.findUnique({
        where: { id: parsed.data.pipelineId, isActive: true },
        include: {
            stages: { orderBy: { stageOrder: 'asc' } },
        },
    });

    if (!pipeline) {
        return NextResponse.json(
            { error: 'Pipeline not found or inactive.' },
            { status: 404 }
        );
    }

    if (pipeline.stages.length === 0) {
        return NextResponse.json(
            { error: 'Pipeline has no stages configured.' },
            { status: 422 }
        );
    }

    const updated = await prisma.$transaction(async (tx) => {
        const updatedIdea = await tx.idea.update({
            where: { id },
            data: {
                pipelineId: pipeline.id,
                currentStageOrder: 1,
            },
            include: {
                submitter: { select: { id: true, name: true, email: true } },
                pipeline: {
                    include: {
                        stages: {
                            orderBy: { stageOrder: 'asc' },
                            include: { reviewer: { select: { id: true, name: true } } },
                        },
                    },
                },
            },
        });

        // Record in status history
        await tx.statusHistory.create({
            data: {
                ideaId: id,
                adminId: session.user.id,
                fromStatus: idea.status,
                toStatus: idea.status, // status doesn't change, just pipeline assignment
                feedback: `Assigned to multi-stage review pipeline: "${pipeline.name}"`,
            },
        });

        return updatedIdea;
    });

    return NextResponse.json(updated);
}

// ─── DELETE /api/ideas/[id]/assign-pipeline — Remove pipeline from idea ─────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
        return NextResponse.json(
            { error: 'Only admins can remove pipeline assignments.' },
            { status: 403 }
        );
    }

    const { id } = await params;

    const idea = await prisma.idea.findUnique({
        where: { id },
        select: { id: true, pipelineId: true, status: true },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (!idea.pipelineId) {
        return NextResponse.json(
            { error: 'This idea has no pipeline assigned.' },
            { status: 400 }
        );
    }

    await prisma.$transaction(async (tx) => {
        await tx.idea.update({
            where: { id },
            data: {
                pipelineId: null,
                currentStageOrder: 1,
            },
        });

        await tx.statusHistory.create({
            data: {
                ideaId: id,
                adminId: session.user.id,
                fromStatus: idea.status,
                toStatus: idea.status,
                feedback: 'Removed from multi-stage review pipeline — returned to simple evaluation.',
            },
        });
    });

    return NextResponse.json({ success: true });
}
