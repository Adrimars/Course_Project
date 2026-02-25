'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { evaluateSchema } from '@/lib/validations/idea';
import { Button } from '@/components/ui/Button';

interface EvaluationFormProps {
  ideaId: string;
  currentStatus: string;
  updatedAt: string;
}

const STATUS_OPTIONS = [
  { value: 'ACCEPTED', label: 'Accept' },
  { value: 'REJECTED', label: 'Reject' },
  { value: 'UNDER_REVIEW', label: 'Keep Under Review' },
  { value: 'INSPECTING', label: 'Set to Inspecting' },
] as const;

import { z } from 'zod';

type FormData = z.infer<typeof evaluateSchema>;

export function EvaluationForm({ ideaId, currentStatus, updatedAt }: EvaluationFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(evaluateSchema),
    defaultValues: {
      status: currentStatus === 'SUBMITTED' ? 'UNDER_REVIEW' : currentStatus,
      feedback: '',
    },
  });

  // Filter options based on current status — only show valid transitions
  const VALID_TRANSITIONS: Record<string, string[]> = {
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['ACCEPTED', 'REJECTED', 'INSPECTING'],
    ACCEPTED: ['UNDER_REVIEW'],
    REJECTED: ['UNDER_REVIEW'],
    INSPECTING: ['UNDER_REVIEW', 'ACCEPTED', 'REJECTED'],
  };

  const allowedStatuses = VALID_TRANSITIONS[currentStatus] ?? [];
  const filteredOptions = STATUS_OPTIONS.filter((opt) =>
    allowedStatuses.includes(opt.value)
  );

  const onSubmit = async (data: FormData) => {
    setServerError(null);

    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: data.status,
          feedback: data.feedback,
          updatedAt,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }

      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  if (filteredOptions.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No available status transitions from current state.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Evaluate Idea</h3>

      {serverError && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label htmlFor="eval-status" className="block text-sm font-medium text-gray-700">
          New Status
        </label>
        <select
          id="eval-status"
          {...register('status')}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {filteredOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.status && (
          <p className="mt-1 text-xs text-red-500">{errors.status.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="eval-feedback" className="block text-sm font-medium text-gray-700">
          Feedback
        </label>
        <textarea
          id="eval-feedback"
          rows={4}
          {...register('feedback')}
          placeholder="Provide feedback (min 10 characters)..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.feedback && (
          <p className="mt-1 text-xs text-red-500">{errors.feedback.message}</p>
        )}
      </div>

      <Button type="submit" isLoading={isSubmitting}>
        Submit Evaluation
      </Button>
    </form>
  );
}
