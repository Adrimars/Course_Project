import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { pipelineUpdateSchema } from '@/lib/validations/pipeline';
import { Role } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// ─── GET /api/admin/pipelines/[id] — Get pipeline detail ────────────────────

export async function GET(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged =
        session.user.role === Role.ADMIN || session.user.role === Role.INSPECTOR;
    if (!isPrivileged) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;

    const pipeline = await prisma.reviewPipeline.findUnique({
        where: { id },
        include: {
            stages: {
                orderBy: { stageOrder: 'asc' },
                include: {
                    reviewer: { select: { id: true, name: true } },
                },
            },
            _count: { select: { ideas: true } },
        },
    });

    if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    return NextResponse.json(pipeline);
}

// ─── PATCH /api/admin/pipelines/[id] — Update pipeline ──────────────────────

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
        return NextResponse.json(
            { error: 'Only admins can update pipelines.' },
            { status: 403 }
        );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = pipelineUpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
            },
            { status: 400 }
        );
    }

    const existing = await prisma.reviewPipeline.findUnique({ where: { id } });
    if (!existing) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    const { name, description, stages } = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
        // Update pipeline fields
        await tx.reviewPipeline.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description: description || null }),
            },
        });

        // If stages are provided, replace them
        if (stages) {
            await tx.reviewStage.deleteMany({ where: { pipelineId: id } });
            await Promise.all(
                stages.map((stage, index) =>
                    tx.reviewStage.create({
                        data: {
                            pipelineId: id,
                            name: stage.name,
                            description: stage.description || null,
                            stageOrder: index + 1,
                            reviewerId: stage.reviewerId || null,
                        },
                    })
                )
            );
        }

        return tx.reviewPipeline.findUnique({
            where: { id },
            include: {
                stages: {
                    orderBy: { stageOrder: 'asc' },
                    include: {
                        reviewer: { select: { id: true, name: true } },
                    },
                },
                _count: { select: { ideas: true } },
            },
        });
    });

    return NextResponse.json(updated);
}

// ─── DELETE /api/admin/pipelines/[id] — Deactivate pipeline ─────────────────

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
        return NextResponse.json(
            { error: 'Only admins can delete pipelines.' },
            { status: 403 }
        );
    }

    const { id } = await params;

    const pipeline = await prisma.reviewPipeline.findUnique({
        where: { id },
        include: { _count: { select: { ideas: true } } },
    });

    if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    if (pipeline._count.ideas > 0) {
        return NextResponse.json(
            {
                error:
                    'Cannot delete this pipeline — it is currently assigned to ideas. Remove it from all ideas first.',
            },
            { status: 409 }
        );
    }

    await prisma.reviewPipeline.update({
        where: { id },
        data: { isActive: false },
    });

    return NextResponse.json({ success: true });
}
