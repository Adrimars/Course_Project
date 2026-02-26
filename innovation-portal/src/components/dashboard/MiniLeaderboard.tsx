'use client';

import Link from 'next/link';

type LeaderboardItem = {
    id: string;
    title: string;
    submitterName: string;
    status: string;
    category: string;
    avgScore: number;
    scoreCount: number;
};

const RANK_ICONS = ['🥇', '🥈', '🥉'];

function formatCategory(cat: string) {
    return cat.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function MiniLeaderboard({ items }: { items: LeaderboardItem[] }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <h3 className="text-sm font-semibold text-gray-900">Top Ideas</h3>
                </div>
                <Link
                    href="/leaderboard"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                    Full board →
                </Link>
            </div>

            {/* Items */}
            {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                    <p className="text-sm text-gray-400">No ideas scored yet</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-50">
                    {items.map((item, i) => (
                        <Link
                            key={item.id}
                            href={`/ideas/${item.id}`}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                            {/* Rank */}
                            <span className="flex-shrink-0 text-lg w-7 text-center">
                                {i < 3 ? RANK_ICONS[i] : (
                                    <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                                )}
                            </span>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-800">
                                    {item.title}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400">
                                        by {item.submitterName}
                                    </span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] text-gray-400">
                                        {formatCategory(item.category)}
                                    </span>
                                    <span className="text-[10px] text-gray-300">•</span>
                                    <span className="text-[10px] text-gray-400">
                                        {item.scoreCount} review{item.scoreCount !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Score badge */}
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${item.avgScore >= 7 ? 'bg-green-100 text-green-700' :
                                    item.avgScore >= 4 ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                }`}>
                                {item.avgScore.toFixed(1)}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
