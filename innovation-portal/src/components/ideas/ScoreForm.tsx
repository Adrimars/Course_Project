'use client';

import { useState } from 'react';

type ScoreFormProps = {
    ideaId: string;
    existingScore?: {
        feasibility: number;
        impact: number;
        novelty: number;
        costEffectiveness: number;
        comment: string | null;
    } | null;
    onScored?: () => void;
};

const DIMENSIONS = [
    { key: 'feasibility', label: 'Feasibility', description: 'How practical and achievable is this idea?' },
    { key: 'impact', label: 'Impact', description: 'What is the potential business or user impact?' },
    { key: 'novelty', label: 'Novelty', description: 'How innovative and original is this idea?' },
    { key: 'costEffectiveness', label: 'Cost-Effectiveness', description: 'How cost-efficient is the proposed solution?' },
] as const;

export function ScoreForm({ ideaId, existingScore, onScored }: ScoreFormProps) {
    const [scores, setScores] = useState({
        feasibility: existingScore?.feasibility ?? 5,
        impact: existingScore?.impact ?? 5,
        novelty: existingScore?.novelty ?? 5,
        costEffectiveness: existingScore?.costEffectiveness ?? 5,
    });
    const [comment, setComment] = useState(existingScore?.comment ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const avgScore = (scores.feasibility + scores.impact + scores.novelty + scores.costEffectiveness) / 4;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = typeof window !== 'undefined' ? sessionStorage.getItem('tab-token') : null;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch(`/api/ideas/${ideaId}/scores`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ ...scores, comment: comment || undefined }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.error || 'Failed to submit score');
                return;
            }

            setSuccess(existingScore ? 'Score updated!' : 'Score submitted!');
            onScored?.();
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                    {existingScore ? '✏️ Update Your Score' : '⭐ Score This Idea'}
                </h3>
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Avg:</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${avgScore >= 7 ? 'bg-green-100 text-green-700' :
                            avgScore >= 4 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                        }`}>
                        {avgScore.toFixed(1)}/10
                    </span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {DIMENSIONS.map((dim) => (
                    <div key={dim.key}>
                        <div className="mb-1 flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">{dim.label}</label>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                                {scores[dim.key]}/10
                            </span>
                        </div>
                        <p className="mb-1.5 text-[11px] text-gray-400">{dim.description}</p>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={scores[dim.key]}
                            onChange={(e) => setScores((prev) => ({ ...prev, [dim.key]: parseInt(e.target.value, 10) }))}
                            className="w-full accent-blue-600"
                        />
                        <div className="mt-0.5 flex justify-between text-[10px] text-gray-300">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>
                ))}

                {/* Comment */}
                <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Comment (optional)</label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        placeholder="Any additional feedback about the scoring..."
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">{comment.length}/2000</p>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {loading ? 'Submitting...' : existingScore ? 'Update Score' : 'Submit Score'}
                </button>
            </form>
        </div>
    );
}
