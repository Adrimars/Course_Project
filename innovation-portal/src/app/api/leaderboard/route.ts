import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types';
import { Prisma } from '@prisma/client';

// ─── GET /api/leaderboard — Ranked ideas by weighted average score ────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;
    const category = searchParams.get('category') || null;
    const sortBy = searchParams.get('sortBy') || 'score';

    const role = session.user.role as Role;
    const isPrivileged = role === Role.ADMIN || role === Role.INSPECTOR;

    // Map sortBy param to a SQL ORDER BY expression
    const SORT_COLUMNS: Record<string, string> = {
        score: 'avg_score',
        feasibility: 'avg_feasibility',
        impact: 'avg_impact',
        novelty: 'avg_novelty',
        cost: 'avg_cost_effectiveness',
    };
    const sortColumn = SORT_COLUMNS[sortBy] || 'avg_score';

    // Build visibility WHERE clause fragments
    const visibilityClause = isPrivileged
        ? Prisma.sql`AND i.status != 'DRAFT'`
        : Prisma.sql`AND i.status NOT IN ('INSPECTING', 'DRAFT')
                      AND (i.visibility = 'PUBLIC' OR i."submitterId" = ${session.user.id})`;

    const categoryClause = category
        ? Prisma.sql`AND i.category::text = ${category}`
        : Prisma.empty;

    const offset = (page - 1) * limit;

    // Count total matching ideas (for pagination)
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT i.id)::bigint AS count
        FROM ideas i
        JOIN idea_scores s ON s."ideaId" = i.id
        WHERE 1=1
        ${visibilityClause}
        ${categoryClause}
    `;
    const totalCount = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch aggregated + sorted + paginated leaderboard using raw SQL
    // This avoids loading ALL ideas + scores into memory (O(N·M) → O(page_size))
    const rows = await prisma.$queryRaw<Array<{
        id: string;
        title: string;
        category: string;
        status: string;
        submitterName: string | null;
        scoreCount: number;
        avg_score: number;
        avg_feasibility: number;
        avg_impact: number;
        avg_novelty: number;
        avg_cost_effectiveness: number;
    }>>`
        SELECT
            i.id,
            i.title,
            i.category::text AS category,
            i.status::text AS status,
            u.name AS "submitterName",
            COUNT(s.id)::int AS "scoreCount",
            ROUND(AVG(s.feasibility)::numeric, 2)::float8 AS avg_feasibility,
            ROUND(AVG(s.impact)::numeric, 2)::float8 AS avg_impact,
            ROUND(AVG(s.novelty)::numeric, 2)::float8 AS avg_novelty,
            ROUND(AVG(s."costEffectiveness")::numeric, 2)::float8 AS avg_cost_effectiveness,
            ROUND(AVG((s.feasibility + s.impact + s.novelty + s."costEffectiveness") / 4.0)::numeric, 2)::float8 AS avg_score
        FROM ideas i
        JOIN idea_scores s ON s."ideaId" = i.id
        LEFT JOIN users u ON u.id = i."submitterId"
        WHERE 1=1
        ${visibilityClause}
        ${categoryClause}
        GROUP BY i.id, u.name
        ORDER BY
            CASE ${sortColumn}
                WHEN 'avg_feasibility' THEN AVG(s.feasibility)
                WHEN 'avg_impact' THEN AVG(s.impact)
                WHEN 'avg_novelty' THEN AVG(s.novelty)
                WHEN 'avg_cost_effectiveness' THEN AVG(s."costEffectiveness")
                ELSE AVG((s.feasibility + s.impact + s.novelty + s."costEffectiveness") / 4.0)
            END DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const data = rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        submitterName: r.submitterName ?? 'Unknown',
        scoreCount: r.scoreCount,
        avgScore: r.avg_score,
        avgFeasibility: r.avg_feasibility,
        avgImpact: r.avg_impact,
        avgNovelty: r.avg_novelty,
        avgCostEffectiveness: r.avg_cost_effectiveness,
    }));

    return NextResponse.json({
        data,
        pagination: {
            page,
            totalPages,
            totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
}
