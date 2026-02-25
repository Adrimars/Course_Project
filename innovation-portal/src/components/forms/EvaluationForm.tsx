'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IdeaStatus } from '@/types';

interface EvaluationFormProps {
  ideaId: string;
  currentStatus: IdeaStatus;
  currentUpdatedAt: string;
}

const EVALUABLE_STATUSES = [
  { value: IdeaStatus.UNDER_REVIEW, label: 'Under Review' },
  { value: IdeaStatus.ACCEPTED,     label: 'Accepted' },
  { value: IdeaStatus.REJECTED,     label: 'Rejected' },
  { value: IdeaStatus.INSPECTING,   label: 'Inspecting' },
] as const;

export function EvaluationForm({ ideaId, currentStatus, currentUpdatedAt }: EvaluationFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<IdeaStatus>(currentStatus);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (feedback.trim().length < 10) {
      setError('Feedback must be at least 10 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          feedback: feedback.trim(),
          updatedAt: currentUpdatedAt,
        }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to save evaluation.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Status selector */}
      <div>
        <label htmlFor="eval-status" className="block text-sm font-medium text-gray-700">
          New Status
        </label>
        <select
          id="eval-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as IdeaStatus)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {EVALUABLE_STATUSES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Feedback textarea */}
      <div>
        <label htmlFor="eval-feedback" className="block text-sm font-medium text-gray-700">
          Feedback <span className="text-red-500">*</span>
        </label>
        <textarea
          id="eval-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          minLength={10}
          required
          placeholder="Provide detailed feedback for the submitter (min. 10 characters)…"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {feedback.trim().length} / 10 characters minimum
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isLoading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isLoading ? 'Saving…' : 'Save Evaluation'}
      </button>
    </form>
  );
}
