'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface DraftActionsProps {
  ideaId: string;
}

/**
 * Phase 4: Action buttons for DRAFT ideas visible to the owner on the detail page.
 * Provides:
 *  - "Edit Draft"   → navigates to /ideas/[id]/edit
 *  - "Submit Draft" → calls PATCH /api/ideas/[id] with { submitDraft: true }
 *  - "Delete Draft" → calls DELETE /api/ideas/[id]
 */
export function DraftActions({ ideaId }: DraftActionsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmitDraft = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submitDraft: true }),
      });

      if (res.ok) {
        showToast('Idea submitted successfully!', 'success');
        router.push('/dashboard');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Submission failed. Please complete all required fields.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Draft deleted.', 'success');
        router.push('/my-ideas?tab=drafts');
        router.refresh();
      } else {
        const data = await res.json();
        showToast(data.error ?? 'Delete failed.', 'error');
      }
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/ideas/${ideaId}/edit`}
        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        ✏️ Edit Draft
      </Link>

      <Button
        type="button"
        onClick={handleSubmitDraft}
        isLoading={isSubmitting}
        disabled={isDeleting}
        className="bg-green-600 px-3 py-1.5 text-sm hover:bg-green-700"
      >
        🚀 Submit
      </Button>

      {!showDeleteConfirm ? (
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting || isSubmitting}
          className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
        >
          🗑 Delete
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm">
          <span className="text-red-700 font-medium">Delete this draft?</span>
          <button
            onClick={handleDeleteDraft}
            disabled={isDeleting}
            className="font-semibold text-red-700 hover:text-red-900 underline"
          >
            {isDeleting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="ml-1 text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
