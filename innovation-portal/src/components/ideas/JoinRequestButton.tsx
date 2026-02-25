'use client';

import { useState, useEffect } from 'react';
import { JoinRequestStatus } from '@/types';
import { Button } from '@/components/ui/Button';

interface JoinRequest {
  id: string;
  ideaId: string;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
}

interface JoinRequestButtonProps {
  ideaId: string;
  isOwner: boolean;
}

const STATUS_INFO: Record<
  JoinRequestStatus,
  { label: string; color: string }
> = {
  [JoinRequestStatus.PENDING]: {
    label: 'Request Pending',
    color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  },
  [JoinRequestStatus.APPROVED]: {
    label: 'Request Approved ✓',
    color: 'text-green-700 bg-green-50 border-green-200',
  },
  [JoinRequestStatus.REJECTED]: {
    label: 'Request Rejected',
    color: 'text-red-700 bg-red-50 border-red-200',
  },
};

export function JoinRequestButton({ ideaId, isOwner }: JoinRequestButtonProps) {
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Don't show for the idea owner
    if (isOwner) {
      setLoading(false);
      return;
    }

    const fetchMyRequest = async () => {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/join-request`);
        if (res.ok) {
          setMyRequest(await res.json());
        }
      } catch {
        // Silently ignore — user just won't see existing request
      } finally {
        setLoading(false);
      }
    };
    fetchMyRequest();
  }, [ideaId, isOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/ideas/${ideaId}/join-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send join request');
        return;
      }

      setMyRequest(data);
      setShowForm(false);
      setMessage('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Owners don't see the join request button
  if (isOwner) return null;
  if (loading) return null;

  // Show current request status
  if (myRequest) {
    const info = STATUS_INFO[myRequest.status];
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${info.color}`}
      >
        {info.label}
        {myRequest.status === JoinRequestStatus.REJECTED && (
          <button
            className="ml-2 text-xs underline hover:text-red-900"
            onClick={() => {
              setMyRequest(null);
              setShowForm(true);
            }}
          >
            Request again
          </button>
        )}
      </div>
    );
  }

  // Show join form or button
  return (
    <div>
      {!showForm ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowForm(true)}
        >
          Request to Join
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Send a join request</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional: introduce yourself or explain why you'd like to join…"
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
          <p className="text-right text-xs text-gray-400">{message.length}/500</p>
          {error && (
            <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Request'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => { setShowForm(false); setError(''); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
