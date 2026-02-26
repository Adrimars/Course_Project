import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { IdeaStatus, Role } from '@/types';

const RANK_ICONS = ['🥇', '🥈', '🥉'];

const STATUS_COLORS: Record<string, string> = {
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    INSPECTING: 'bg-purple-100 text-purple-700',
    DRAFT: 'bg-gray-100 text-gray-600',
};

const CATEGORY_LABELS: Record<string, string> = {
    TECHNOLOGY: 'Technology',
    PROCESS: 'Process',
    PRODUCT: 'Product',
    COST_SAVING: 'Cost Saving',
    CUSTOMER_EXPERIENCE: 'Customer Experience',
    OTHER: 'Other',
};

function formatStatus(status: string) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

type ScoredIdea = {
    id: string;
    title: string;
    category: string;
    status: string;
    submitterName: string;
    scoreCount: number;
    avgScore: number;
    avgFeasibility: number;
    avgImpact: number;
    avgNovelty: number;
    avgCostEffectiveness: number;
};

export default async function LeaderboardPage({
    searchParams: searchParamsPromise,
}: {
    searchParams: Promise<{ category?: string; sortBy?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const searchParams = await searchParamsPromise;
    const category = searchParams.category || '';
    const sortBy = searchParams.sortBy || 'score';

    const role = session.user.role as Role;
    const isPrivileged = role === Role.ADMIN || role === Role.INSPECTOR;

    // Visibility filter
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

    const where = {
        ...visibilityFilter,
        scores: { some: {} },
        ...(category ? { category: category as any } : {}),
    };

    const ideas = await prisma.idea.findMany({
        where,
        include: {
            submitter: { select: { name: true } },
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

    // Compute scores
    const scoredIdeas: ScoredIdea[] = ideas.map((idea) => {
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

        const avgF = totals.feasibility / n;
        const avgI = totals.impact / n;
        const avgN = totals.novelty / n;
        const avgC = totals.costEffectiveness / n;
        const avgScore = (avgF + avgI + avgN + avgC) / 4;

        return {
            id: idea.id,
            title: idea.title,
            category: idea.category,
            status: idea.status,
            submitterName: idea.submitter?.name ?? 'Unknown',
            scoreCount: n,
            avgScore: Math.round(avgScore * 100) / 100,
            avgFeasibility: Math.round(avgF * 100) / 100,
            avgImpact: Math.round(avgI * 100) / 100,
            avgNovelty: Math.round(avgN * 100) / 100,
            avgCostEffectiveness: Math.round(avgC * 100) / 100,
        };
    });

    // Sort
    const sortKey = {
        score: 'avgScore',
        feasibility: 'avgFeasibility',
        impact: 'avgImpact',
        novelty: 'avgNovelty',
        cost: 'avgCostEffectiveness',
    }[sortBy] || 'avgScore';

    scoredIdeas.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);

    const categories = ['', 'TECHNOLOGY', 'PROCESS', 'PRODUCT', 'COST_SAVING', 'CUSTOMER_EXPERIENCE', 'OTHER'];
    const sortOptions = [
        { value: 'score', label: 'Overall Score' },
        { value: 'feasibility', label: 'Feasibility' },
        { value: 'impact', label: 'Impact' },
        { value: 'novelty', label: 'Novelty' },
        { value: 'cost', label: 'Cost-Effectiveness' },
    ];

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">🏆 Leaderboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Top-scored innovation ideas ranked by reviewer evaluations.
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                            <Link
                                key={cat}
                                href={`/leaderboard?category=${cat}&sortBy=${sortBy}`}
                                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${category === cat
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat ? CATEGORY_LABELS[cat] || cat : 'All'}
                            </Link>
                        ))}
                    </div>

                    {/* Sort dropdown */}
                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-gray-500">Sort by:</span>
                        <div className="flex gap-1">
                            {sortOptions.map((opt) => (
                                <Link
                                    key={opt.value}
                                    href={`/leaderboard?category=${category}&sortBy=${opt.value}`}
                                    className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${sortBy === opt.value
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-500 hover:bg-gray-100'
                                        }`}
                                >
                                    {opt.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Leaderboard */}
                {scoredIdeas.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
                        <span className="text-3xl">🏆</span>
                        <p className="mt-3 text-sm text-gray-500">
                            No scored ideas yet{category ? ` in ${CATEGORY_LABELS[category] || category}` : ''}.
                        </p>
                        <p className="mt-1 text-xs text-gray-400">Ideas will appear here once reviewers submit scores.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                        {scoredIdeas.map((idea, i) => (
                            <Link
                                key={idea.id}
                                href={`/ideas/${idea.id}`}
                                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
                            >
                                {/* Rank */}
                                <span className="flex-shrink-0 text-center w-8">
                                    {i < 3 ? (
                                        <span className="text-xl">{RANK_ICONS[i]}</span>
                                    ) : (
                                        <span className="text-sm font-bold text-gray-400">#{i + 1}</span>
                                    )}
                                </span>

                                {/* Info */}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-gray-800">{idea.title}</p>
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] text-gray-400">by {idea.submitterName}</span>
                                        <span className="text-[11px] text-gray-300">•</span>
                                        <span className="text-[11px] text-gray-400">{CATEGORY_LABELS[idea.category] || idea.category}</span>
                                        <span className="text-[11px] text-gray-300">•</span>
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[idea.status] || 'bg-gray-100 text-gray-600'}`}>
                                            {formatStatus(idea.status)}
                                        </span>
                                        <span className="text-[11px] text-gray-400">
                                            {idea.scoreCount} review{idea.scoreCount !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Score breakdown */}
                                <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400">F</p>
                                        <p className="text-xs font-bold text-blue-600">{idea.avgFeasibility.toFixed(1)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400">I</p>
                                        <p className="text-xs font-bold text-green-600">{idea.avgImpact.toFixed(1)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400">N</p>
                                        <p className="text-xs font-bold text-purple-600">{idea.avgNovelty.toFixed(1)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-gray-400">C</p>
                                        <p className="text-xs font-bold text-amber-600">{idea.avgCostEffectiveness.toFixed(1)}</p>
                                    </div>
                                </div>

                                {/* Overall score */}
                                <span className={`flex-shrink-0 rounded-full px-3 py-1 text-sm font-bold ${idea.avgScore >= 7 ? 'bg-green-100 text-green-700' :
                                        idea.avgScore >= 4 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {idea.avgScore.toFixed(1)}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </>
    );
}
