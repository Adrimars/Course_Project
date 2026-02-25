import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { pipelineCreateSchema } from '@/lib/validations/pipeline';
import { Role } from '@/types';

// ─── GET /api/admin/pipelines — List all pipelines ───────────────────────────

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged =
        session.user.role === Role.ADMIN || session.user.role === Role.INSPECTOR;
    if (!isPrivileged) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const pipelines = await prisma.reviewPipeline.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(pipelines);
}

// ─── POST /api/admin/pipelines — Create a new pipeline ──────────────────────

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
        return NextResponse.json(
            { error: 'Only admins can create pipelines.' },
            { status: 403 }
        );
    }

    const body = await req.json();
    const parsed = pipelineCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
            },
            { status: 400 }
        );
    }

    const { name, description, stages } = parsed.data;

    const pipeline = await prisma.reviewPipeline.create({
        data: {
            name,
            description: description || null,
            stages: {
                create: stages.map((stage, index) => ({
                    name: stage.name,
                    description: stage.description || null,
                    stageOrder: index + 1,
                    reviewerId: stage.reviewerId || null,
                })),
            },
        },
        include: {
            stages: {
                orderBy: { stageOrder: 'asc' },
                include: {
                    reviewer: { select: { id: true, name: true } },
                },
            },
        },
    });

    return NextResponse.json(pipeline, { status: 201 });
}
