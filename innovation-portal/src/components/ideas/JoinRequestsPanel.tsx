'use client';

import { useState, useEffect } from 'react';
import { JoinRequestStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface JoinRequestInfo {
  id: string;
  ideaId: string;
  message: string | null;
  status: JoinRequestStatus;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface JoinRequestsPanelProps {
  ideaId: string;
}

export function JoinRequestsPanel({ ideaId }: JoinRequestsPanelProps) {
  const [requests, setRequests] = useState<JoinRequestInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/join-request`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        // Endpoint returns array for owner/admin or null for regular user
        setRequests(Array.isArray(data) ? data : []);
      } catch {
        setError('Could not load join requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [ideaId]);

  const handleRespond = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    setResponding(requestId);
    try {
      const res = await fetch(`/api/join-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to respond');
        return;
      }

      // Remove the responded request from pending list
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setResponding(null);
    }
  };

  if (loading) return null;
  if (error) return (
    <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
  );
  if (requests.length === 0) return null;

  return (
    <section
      aria-labelledby="join-requests-heading"
      className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6"
    >
      <h2
        id="join-requests-heading"
        className="mb-4 text-base font-semibold text-yellow-900"
      >
        Join Requests ({requests.length})
      </h2>
      <ul className="space-y-3">
        {requests.map((req) => (
          <li
            key={req.id}
            className="flex flex-col gap-3 rounded-lg border border-yellow-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{req.user.name}</p>
              <p className="text-xs text-gray-400">{req.user.email}</p>
              {req.message && (
                <p className="mt-2 text-sm italic text-gray-600">
                  &ldquo;{req.message}&rdquo;
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Requested {formatDate(req.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                disabled={responding === req.id}
                onClick={() => handleRespond(req.id, 'APPROVED')}
              >
                {responding === req.id ? '…' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={responding === req.id}
                onClick={() => handleRespond(req.id, 'REJECTED')}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
