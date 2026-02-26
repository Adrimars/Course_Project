import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { scoreSchema } from '@/lib/validations/idea';
import { Role } from '@/types';
import { createNotification } from '@/lib/notifications';

type RouteParams = {
    params: Promise<{ id: string }>;
};

/**
 * Compute weighted average score from individual dimensions.
 * Equal weighting: (feasibility + impact + novelty + costEffectiveness) / 4
 */
function computeAvgScore(scores: { feasibility: number; impact: number; novelty: number; costEffectiveness: number }[]) {
    if (scores.length === 0) return null;

    const totals = scores.reduce(
        (acc, s) => ({
            feasibility: acc.feasibility + s.feasibility,
            impact: acc.impact + s.impact,
            novelty: acc.novelty + s.novelty,
            costEffectiveness: acc.costEffectiveness + s.costEffectiveness,
        }),
        { feasibility: 0, impact: 0, novelty: 0, costEffectiveness: 0 }
    );

    const n = scores.length;
    const avgFeasibility = totals.feasibility / n;
    const avgImpact = totals.impact / n;
    const avgNovelty = totals.novelty / n;
    const avgCostEffectiveness = totals.costEffectiveness / n;
    const avgScore = (avgFeasibility + avgImpact + avgNovelty + avgCostEffectiveness) / 4;

    return {
        avgScore: Math.round(avgScore * 100) / 100,
        avgFeasibility: Math.round(avgFeasibility * 100) / 100,
        avgImpact: Math.round(avgImpact * 100) / 100,
        avgNovelty: Math.round(avgNovelty * 100) / 100,
        avgCostEffectiveness: Math.round(avgCostEffectiveness * 100) / 100,
        scoreCount: n,
    };
}

// ─── GET /api/ideas/[id]/scores — Get scores + summary ────────────────────────
export async function GET(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const idea = await prisma.idea.findUnique({ where: { id }, select: { id: true } });
    if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    const scores = await prisma.ideaScore.findMany({
        where: { ideaId: id },
        include: { scorer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    const summary = computeAvgScore(scores);

    return NextResponse.json({ scores, summary });
}

// ─── POST /api/ideas/[id]/scores — Submit or update a score ───────────────────
export async function POST(req: NextRequest, { params }: RouteParams) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin/inspector can score ideas
    const role = session.user.role as Role;
    if (role !== Role.ADMIN && role !== Role.INSPECTOR) {
        return NextResponse.json({ error: 'Only admins and inspectors can score ideas' }, { status: 403 });
    }

    const { id } = await params;

    const idea = await prisma.idea.findUnique({
        where: { id },
        select: { id: true, title: true, submitterId: true },
    });
    if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 });
    }

    // Parse and validate body
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = scoreSchema.safeParse(body);
    if (!parsed.success) {
        const fieldErrors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
            const key = issue.path.join('.');
            if (!fieldErrors[key]) fieldErrors[key] = [];
            fieldErrors[key].push(issue.message);
        }
        return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
    }

    const { feasibility, impact, novelty, costEffectiveness, comment } = parsed.data;

    // Upsert: create or update score (one score per reviewer per idea)
    const score = await prisma.ideaScore.upsert({
        where: {
            ideaId_scorerId: {
                ideaId: id,
                scorerId: session.user.id,
            },
        },
        update: {
            feasibility,
            impact,
            novelty,
            costEffectiveness,
            comment: comment || null,
        },
        create: {
            ideaId: id,
            scorerId: session.user.id,
            feasibility,
            impact,
            novelty,
            costEffectiveness,
            comment: comment || null,
        },
        include: { scorer: { select: { id: true, name: true } } },
    });

    // Notify idea submitter about the score (fire-and-forget)
    if (idea.submitterId && idea.submitterId !== session.user.id) {
        const avgScore = (feasibility + impact + novelty + costEffectiveness) / 4;
        createNotification({
            userId: idea.submitterId,
            type: 'SCORE_RECEIVED',
            title: 'Your idea was scored',
            message: `${session.user.name} scored "${idea.title}" with an average of ${avgScore.toFixed(1)}/10.`,
            link: `/ideas/${id}`,
        }).catch((err) => console.error('[Notification] failed to send score notification', err));
    }

    return NextResponse.json(score, { status: 201 });
}
