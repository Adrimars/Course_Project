import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

export default async function LeaderboardPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    return (
        <>
            <Navbar />
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">🏆 Leaderboard</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Discover the top-scored and most impactful innovation ideas.
                    </p>
                </div>

                {/* Coming Soon Card */}
                <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                        <span className="text-3xl">🏆</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-700">Coming Soon</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                        The leaderboard will rank ideas by weighted scores across multiple
                        criteria like feasibility, impact, and cost. Reviewers will assign
                        scores, and top ideas will rise to the top automatically.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Weighted Scoring
                        </span>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Idea Rankings
                        </span>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                            Auto-Advance Rules
                        </span>
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
                            Score History
                        </span>
                    </div>

                    {/* Mock Leaderboard Preview */}
                    <div className="mx-auto mt-8 max-w-sm">
                        <div className="rounded-lg border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                                Preview
                            </div>
                            {[
                                { rank: '🥇', title: 'AI-Powered Code Review', score: '—' },
                                { rank: '🥈', title: 'Green Office Initiative', score: '—' },
                                { rank: '🥉', title: 'Customer Feedback Loop', score: '—' },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 border-b border-gray-50 px-4 py-3 last:border-0"
                                >
                                    <span className="text-lg">{item.rank}</span>
                                    <span className="flex-1 text-left text-sm text-gray-600">
                                        {item.title}
                                    </span>
                                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                                        {item.score}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}
