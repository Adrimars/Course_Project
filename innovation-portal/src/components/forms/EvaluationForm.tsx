'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { evaluateSchema, EvaluateInput } from '@/lib/validations/idea';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

interface EvaluationFormProps {
  ideaId: string;
  currentStatus: string;
  currentUpdatedAt: string;
}

const STATUS_OPTIONS = [
  { value: 'ACCEPTED', label: 'Accept' },
  { value: 'REJECTED', label: 'Reject' },
  { value: 'UNDER_REVIEW', label: 'Keep Under Review' },
] as const;

/**
 * T041 / spec FR-009, FR-010, CHK016:
 * Admin evaluation form — status + required feedback (min 10 chars).
 */
export function EvaluationForm({
  ideaId,
  currentStatus,
  currentUpdatedAt,
}: EvaluationFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EvaluateInput>({
    resolver: zodResolver(evaluateSchema),
    defaultValues: {
      status: currentStatus as EvaluateInput['status'],
    },
  });

  const onSubmit = async (data: EvaluateInput) => {
    setServerError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, updatedAt: currentUpdatedAt }),
      });

      if (res.ok) {
        showToast('Evaluation submitted successfully.', 'success');
        router.refresh();
      } else if (res.status === 409) {
        const body = await res.json();
        setServerError(body.error ?? 'Conflict. Please refresh and try again.');
      } else {
        const body = await res.json();
        setServerError(body.error ?? 'Failed to submit evaluation.');
      }
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      {/* Status selector */}
      <div className="space-y-1">
        <Label htmlFor="status" required>
          Decision
        </Label>
        <select
          id="status"
          aria-describedby={errors.status ? 'status-error' : undefined}
          aria-invalid={!!errors.status}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...register('status')}
        >
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.status && (
          <p id="status-error" className="text-xs text-red-600">
            {errors.status.message}
          </p>
        )}
      </div>

      {/* Feedback textarea */}
      <div className="space-y-1">
        <Label htmlFor="feedback" required>
          Feedback (required, 10–2000 characters)
        </Label>
        <textarea
          id="feedback"
          rows={5}
          aria-describedby={errors.feedback ? 'feedback-error' : undefined}
          aria-invalid={!!errors.feedback}
          placeholder="Provide detailed feedback for the submitter..."
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.feedback
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
          {...register('feedback')}
        />
        {errors.feedback && (
          <p id="feedback-error" className="text-xs text-red-600">
            {errors.feedback.message}
          </p>
        )}
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Submit Evaluation
      </Button>
    </form>
  );
}
