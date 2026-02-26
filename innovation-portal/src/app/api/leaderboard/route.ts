import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { IdeaStatus, Role } from '@/types';

// ─── GET /api/leaderboard — Ranked ideas by weighted average score ────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;
    const category = searchParams.get('category') || undefined;
    const sortBy = searchParams.get('sortBy') || 'score'; // score|feasibility|impact|novelty|cost

    const role = session.user.role as Role;
    const isPrivileged = role === Role.ADMIN || role === Role.INSPECTOR;

    // Base visibility filter (same as idea listing)
    const visibilityFilter = isPrivileged
        ? {}
        : {
            AND: [
                { status: { not: IdeaStatus.INSPECTING as any } },
                { status: { not: IdeaStatus.DRAFT as any } },
                {
                    OR: [
                        { visibility: 'PUBLIC' as const },
                        { submitterId: session.user.id },
                    ],
                },
            ],
        };

    // Only include ideas that have at least one score
    const where = {
        ...visibilityFilter,
        scores: { some: {} },
        ...(category ? { category: category as any } : {}),
    };

    // Fetch all scored ideas with their scores
    const ideas = await prisma.idea.findMany({
        where,
        include: {
            submitter: { select: { id: true, name: true } },
            scores: {
                select: {
                    feasibility: true,
                    impact: true,
                    novelty: true,
                    costEffectiveness: true,
                },
            },
        },
    });

    // Compute average scores for each idea
    const scoredIdeas = ideas.map((idea) => {
        const n = idea.scores.length;
        const totals = idea.scores.reduce(
            (acc, s) => ({
                feasibility: acc.feasibility + s.feasibility,
                impact: acc.impact + s.impact,
                novelty: acc.novelty + s.novelty,
                costEffectiveness: acc.costEffectiveness + s.costEffectiveness,
            }),
            { feasibility: 0, impact: 0, novelty: 0, costEffectiveness: 0 }
        );

        const avgFeasibility = totals.feasibility / n;
        const avgImpact = totals.impact / n;
        const avgNovelty = totals.novelty / n;
        const avgCostEffectiveness = totals.costEffectiveness / n;
        const avgScore = (avgFeasibility + avgImpact + avgNovelty + avgCostEffectiveness) / 4;

        return {
            id: idea.id,
            title: idea.title,
            category: idea.category,
            status: idea.status,
            submitterName: idea.submitter?.name ?? 'Unknown',
            scoreCount: n,
            avgScore: Math.round(avgScore * 100) / 100,
            avgFeasibility: Math.round(avgFeasibility * 100) / 100,
            avgImpact: Math.round(avgImpact * 100) / 100,
            avgNovelty: Math.round(avgNovelty * 100) / 100,
            avgCostEffectiveness: Math.round(avgCostEffectiveness * 100) / 100,
        };
    });

    // Sort by the requested dimension
    const sortKey = {
        score: 'avgScore',
        feasibility: 'avgFeasibility',
        impact: 'avgImpact',
        novelty: 'avgNovelty',
        cost: 'avgCostEffectiveness',
    }[sortBy] || 'avgScore';

    scoredIdeas.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);

    // Paginate
    const totalCount = scoredIdeas.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedItems = scoredIdeas.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
        data: paginatedItems,
        pagination: {
            page,
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}
