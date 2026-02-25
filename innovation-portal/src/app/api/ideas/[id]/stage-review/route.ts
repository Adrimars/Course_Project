import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { stageReviewSchema } from '@/lib/validations/pipeline';
import { Role } from '@/types';

type RouteParams = { params: Promise<{ id: string }> };

// ─── POST /api/ideas/[id]/stage-review — Submit a stage review ──────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPrivileged =
        session.user.role === Role.ADMIN || session.user.role === Role.INSPECTOR;
    if (!isPrivileged) {
        return NextResponse.json(
            { error: 'Only admins and inspectors can submit stage reviews.' },
            { status: 403 }
        );
    }

    const { id: ideaId } = await params;

    const body = await req.json();
    const parsed = stageReviewSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
            { status: 400 }
        );
    }

    const { decision, feedback } = parsed.data;

    // Fetch idea with pipeline and stages
    const idea = await prisma.idea.findUnique({
        where: { id: ideaId },
        include: {
            pipeline: {
                include: {
                    stages: { orderBy: { stageOrder: 'asc' } },
                },
            },
        },
    });

    if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    if (!idea.pipeline) {
        return NextResponse.json(
            { error: 'This idea is not assigned to a review pipeline.' },
            { status: 422 }
        );
    }

    if (idea.status !== 'UNDER_REVIEW') {
        return NextResponse.json(
            { error: 'Stage reviews can only be submitted for ideas in UNDER_REVIEW status.' },
            { status: 422 }
        );
    }

    // Find the current stage
    const currentStage = idea.pipeline.stages.find(
        (s) => s.stageOrder === idea.currentStageOrder
    );

    if (!currentStage) {
        return NextResponse.json(
            { error: 'Current stage not found in pipeline.' },
            { status: 500 }
        );
    }

    // Check reviewer permission: assigned reviewer OR any admin
    if (
        currentStage.reviewerId &&
        currentStage.reviewerId !== session.user.id &&
        session.user.role !== Role.ADMIN
    ) {
        return NextResponse.json(
            { error: 'You are not the assigned reviewer for this stage.' },
            { status: 403 }
        );
    }

    const totalStages = idea.pipeline.stages.length;

    const result = await prisma.$transaction(async (tx) => {
        // Create the stage review record
        await tx.stageReview.create({
            data: {
                ideaId,
                stageId: currentStage.id,
                reviewerId: session.user.id,
                decision,
                feedback,
            },
        });

        let newStatus = idea.status;
        let newStageOrder = idea.currentStageOrder;
        let historyFeedback = '';

        switch (decision) {
            case 'APPROVED': {
                if (idea.currentStageOrder >= totalStages) {
                    // Last stage approved → idea is ACCEPTED
                    newStatus = 'ACCEPTED';
                    historyFeedback = `Stage "${currentStage.name}" approved (final stage). Idea accepted. Feedback: ${feedback}`;
                } else {
                    // Advance to next stage
                    newStageOrder = idea.currentStageOrder + 1;
                    const nextStage = idea.pipeline!.stages.find(
                        (s) => s.stageOrder === newStageOrder
                    );
                    historyFeedback = `Stage "${currentStage.name}" approved. Advancing to "${nextStage?.name ?? `Stage ${newStageOrder}`}". Feedback: ${feedback}`;
                }
                break;
            }
            case 'REJECTED': {
                newStatus = 'REJECTED';
                historyFeedback = `Rejected at stage "${currentStage.name}". Feedback: ${feedback}`;
                break;
            }
            case 'RETURNED': {
                if (idea.currentStageOrder > 1) {
                    newStageOrder = idea.currentStageOrder - 1;
                    const prevStage = idea.pipeline!.stages.find(
                        (s) => s.stageOrder === newStageOrder
                    );
                    historyFeedback = `Returned from stage "${currentStage.name}" to "${prevStage?.name ?? `Stage ${newStageOrder}`}". Feedback: ${feedback}`;
                } else {
                    historyFeedback = `Returned at stage "${currentStage.name}" (already at first stage). Feedback: ${feedback}`;
                }
                break;
            }
        }

        // Update idea
        const updatedIdea = await tx.idea.update({
            where: { id: ideaId },
            data: {
                status: newStatus as never,
                currentStageOrder: newStageOrder,
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
                stageReviews: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        stage: { select: { name: true, stageOrder: true } },
                        reviewer: { select: { id: true, name: true } },
                    },
                },
                statusHistory: {
                    orderBy: { createdAt: 'asc' },
                    include: { admin: { select: { name: true } } },
                },
                attachments: {
                    select: {
                        id: true,
                        originalName: true,
                        mimeType: true,
                        size: true,
                        displayOrder: true,
                    },
                    orderBy: { displayOrder: 'asc' },
                },
            },
        });

        // Create status history entry
        await tx.statusHistory.create({
            data: {
                ideaId,
                adminId: session.user.id,
                fromStatus: idea.status,
                toStatus: newStatus as never,
                feedback: historyFeedback,
            },
        });

        return updatedIdea;
    });

    return NextResponse.json(result);
}
