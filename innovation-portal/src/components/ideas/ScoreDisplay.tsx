'use client';

type ScoreData = {
    id: string;
    feasibility: number;
    impact: number;
    novelty: number;
    costEffectiveness: number;
    comment: string | null;
    createdAt: string;
    scorer: {
        id: string;
        name: string;
    };
};

type ScoreSummaryData = {
    avgScore: number;
    avgFeasibility: number;
    avgImpact: number;
    avgNovelty: number;
    avgCostEffectiveness: number;
    scoreCount: number;
};

type ScoreDisplayProps = {
    scores: ScoreData[];
    summary: ScoreSummaryData | null;
    showIndividual?: boolean; // admin can see individual scores
};

const DIMENSION_META = [
    { key: 'avgFeasibility', label: 'Feasibility', color: 'bg-blue-500', lightColor: 'bg-blue-100' },
    { key: 'avgImpact', label: 'Impact', color: 'bg-green-500', lightColor: 'bg-green-100' },
    { key: 'avgNovelty', label: 'Novelty', color: 'bg-purple-500', lightColor: 'bg-purple-100' },
    { key: 'avgCostEffectiveness', label: 'Cost-Effectiveness', color: 'bg-amber-500', lightColor: 'bg-amber-100' },
] as const;

export function ScoreDisplay({ scores, summary, showIndividual = false }: ScoreDisplayProps) {
    if (!summary || summary.scoreCount === 0) {
        return (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <span className="text-2xl">⭐</span>
                <p className="mt-2 text-sm text-gray-500">No scores yet</p>
                <p className="text-xs text-gray-400">Reviewers can score this idea once it&apos;s submitted.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            {/* Overall Score */}
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">📊 Score Summary</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{summary.scoreCount} review{summary.scoreCount !== 1 ? 's' : ''}</span>
                    <span className={`rounded-full px-3 py-1 text-sm font-bold ${summary.avgScore >= 7 ? 'bg-green-100 text-green-700' :
                            summary.avgScore >= 4 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                        }`}>
                        {summary.avgScore.toFixed(1)}/10
                    </span>
                </div>
            </div>

            {/* Dimension Bars */}
            <div className="space-y-3">
                {DIMENSION_META.map((dim) => {
                    const value = summary[dim.key as keyof ScoreSummaryData] as number;
                    const pct = (value / 10) * 100;
                    return (
                        <div key={dim.key}>
                            <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-600">{dim.label}</span>
                                <span className="text-xs font-bold text-gray-700">{value.toFixed(1)}</span>
                            </div>
                            <div className={`h-2 w-full rounded-full ${dim.lightColor}`}>
                                <div
                                    className={`h-2 rounded-full ${dim.color} transition-all duration-500`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Individual Scores (admin view) */}
            {showIndividual && scores.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4">
                    <h4 className="mb-3 text-xs font-semibold text-gray-500 uppercase">Individual Reviews</h4>
                    <div className="space-y-3">
                        {scores.map((score) => {
                            const avg = (score.feasibility + score.impact + score.novelty + score.costEffectiveness) / 4;
                            return (
                                <div key={score.id} className="rounded-md bg-gray-50 p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">{score.scorer.name}</span>
                                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${avg >= 7 ? 'bg-green-100 text-green-700' :
                                                avg >= 4 ? 'bg-amber-100 text-amber-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {avg.toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="mt-1.5 flex gap-3 text-[10px] text-gray-500">
                                        <span>F:{score.feasibility}</span>
                                        <span>I:{score.impact}</span>
                                        <span>N:{score.novelty}</span>
                                        <span>C:{score.costEffectiveness}</span>
                                    </div>
                                    {score.comment && (
                                        <p className="mt-1.5 text-xs text-gray-600 italic">&quot;{score.comment}&quot;</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
