'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StageDecision } from '@/types';

interface StageReviewFormProps {
    ideaId: string;
    stageName: string;
    stageOrder: number;
}

const DECISIONS = [
    { value: StageDecision.APPROVED, label: 'Approve — Advance to Next Stage', color: 'text-green-700' },
    { value: StageDecision.REJECTED, label: 'Reject — End Review', color: 'text-red-700' },
    { value: StageDecision.RETURNED, label: 'Return — Send Back to Previous Stage', color: 'text-amber-700' },
] as const;

export function StageReviewForm({ ideaId, stageName, stageOrder }: StageReviewFormProps) {
    const router = useRouter();
    const [decision, setDecision] = useState<StageDecision>(StageDecision.APPROVED);
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (feedback.trim().length < 10) {
            setError('Feedback must be at least 10 characters.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/ideas/${ideaId}/stage-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    decision,
                    feedback: feedback.trim(),
                }),
            });

            if (res.ok) {
                setSuccess(true);
                setFeedback('');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error ?? 'Failed to submit stage review.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-blue-50 px-3 py-2">
                <p className="text-sm text-blue-800">
                    <span className="font-semibold">Stage {stageOrder}:</span> {stageName}
                </p>
            </div>

            {/* Decision selector */}
            <div>
                <label className="block text-sm font-medium text-gray-700">Decision</label>
                <div className="mt-2 space-y-2">
                    {DECISIONS.map(({ value, label, color }) => (
                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="decision"
                                value={value}
                                checked={decision === value}
                                onChange={() => setDecision(value)}
                                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className={`text-sm font-medium ${color}`}>{label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Feedback textarea */}
            <div>
                <label htmlFor="stage-feedback" className="block text-sm font-medium text-gray-700">
                    Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                    id="stage-feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    minLength={10}
                    required
                    placeholder="Provide detailed feedback for this stage (min. 10 characters)…"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                    {feedback.trim().length} / 10 characters minimum
                </p>
            </div>

            {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {success && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                    Stage review submitted successfully!
                </p>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {isLoading && (
                    <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                )}
                {isLoading ? 'Submitting…' : 'Submit Stage Review'}
            </button>
        </form>
    );
}
