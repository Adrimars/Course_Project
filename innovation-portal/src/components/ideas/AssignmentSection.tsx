'use client';

import { useState, useEffect } from 'react';
import { AssignmentStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface AssignmentInfo {
  id: string;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
  assigner: { id: string; name: string };
  assignee: { id: string; name: string; email: string };
}

interface AssignmentSectionProps {
  ideaId: string;
  currentUserId: string;
  isAdmin: boolean;
}

export function AssignmentSection({ ideaId, currentUserId, isAdmin }: AssignmentSectionProps) {
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigneeEmail, setAssigneeEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`/api/ideas/${ideaId}/assignments`);
        if (res.status === 403) {
          // Not privileged to see assignments
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        setAssignments(await res.json());
      } catch {
        setError('Could not load assignments.');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [ideaId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeEmail.trim()) return;

    setAssigning(true);
    setAssignError('');

    try {
      // First look up the user by email
      const userRes = await fetch(`/api/users?email=${encodeURIComponent(assigneeEmail.trim())}`);
      if (!userRes.ok) {
        setAssignError('User not found with that email.');
        return;
      }
      const user = await userRes.json();

      const res = await fetch(`/api/ideas/${ideaId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigneeId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setAssignError(data.error || 'Failed to assign user');
        return;
      }

      const newAssignment: AssignmentInfo = await res.json();
      setAssignments((prev) => [newAssignment, ...prev]);
      setAssigneeEmail('');
    } catch {
      setAssignError('Network error. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const handleRespond = async (assignmentId: string, status: 'ACCEPTED' | 'DECLINED') => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to update assignment');
        return;
      }
      const updated: AssignmentInfo = await res.json();
      setAssignments((prev) => prev.map((a) => (a.id === assignmentId ? updated : a)));
    } catch {
      alert('Network error. Please try again.');
    }
  };

  const STATUS_STYLE: Record<AssignmentStatus, string> = {
    [AssignmentStatus.PENDING]: 'bg-yellow-100 text-yellow-700',
    [AssignmentStatus.ACCEPTED]: 'bg-green-100 text-green-700',
    [AssignmentStatus.DECLINED]: 'bg-red-100 text-red-700',
  };

  const pendingForMe = assignments.filter(
    (a) => a.assignee.id === currentUserId && a.status === AssignmentStatus.PENDING
  );

  return (
    <section aria-labelledby="assignments-heading" className="mt-8">
      <h2 id="assignments-heading" className="mb-4 text-base font-semibold text-gray-900">
        Assignments
        {assignments.length > 0 && (
          <span className="ml-1 text-sm font-normal text-gray-400">({assignments.length})</span>
        )}
      </h2>

      {/* Pending assignments that need a response from the current user */}
      {pendingForMe.length > 0 && (
        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="mb-3 text-sm font-medium text-yellow-800">
            You have {pendingForMe.length} pending assignment{pendingForMe.length > 1 ? 's' : ''}:
          </p>
          {pendingForMe.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3">
              <p className="text-sm text-yellow-700">
                Assigned by <strong>{a.assigner.name}</strong> on{' '}
                {formatDate(a.createdAt)}
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleRespond(a.id, 'ACCEPTED')}>
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleRespond(a.id, 'DECLINED')}
                >
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assignment list */}
      {loading && <p className="text-sm text-gray-400">Loading assignments…</p>}
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && assignments.length === 0 && (
        <p className="text-sm text-gray-400">No assignments yet.</p>
      )}

      {assignments.length > 0 && (
        <ul className="mb-4 space-y-2">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{a.assignee.name}</p>
                <p className="text-xs text-gray-400">{a.assignee.email}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Assigned by {a.assigner.name} · {formatDate(a.createdAt)}
                </p>
              </div>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[a.status]}`}
              >
                {a.status.charAt(0) + a.status.slice(1).toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Admin: assign user form */}
      {isAdmin && (
        <form onSubmit={handleAssign} className="flex gap-2">
          <input
            type="email"
            value={assigneeEmail}
            onChange={(e) => setAssigneeEmail(e.target.value)}
            placeholder="Enter user email to assign…"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="Assignee email"
          />
          <Button type="submit" size="sm" disabled={assigning || !assigneeEmail.trim()}>
            {assigning ? 'Assigning…' : 'Assign'}
          </Button>
        </form>
      )}
      {assignError && (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{assignError}</p>
      )}
    </section>
  );
}
