'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InlineStatusControlProps {
  ideaId: string;
  currentStatus: string;
  currentUpdatedAt: string;
  isPrivileged: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  SUBMITTED:    { label: 'Submitted',    badge: 'bg-gray-100 text-gray-700 border-gray-300' },
  UNDER_REVIEW: { label: 'Under Review', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  ACCEPTED:     { label: 'Accepted',     badge: 'bg-green-100 text-green-800 border-green-300' },
  REJECTED:     { label: 'Rejected',     badge: 'bg-red-100 text-red-800 border-red-300' },
  INSPECTING:   { label: 'Inspecting',   badge: 'bg-purple-100 text-purple-800 border-purple-300' },
};

const TRANSITIONS: Record<string, { value: string; label: string; itemColor: string }[]> = {
  SUBMITTED: [
    { value: 'UNDER_REVIEW', label: 'Under Review', itemColor: 'text-amber-800 bg-amber-50 hover:bg-amber-100' },
  ],
  UNDER_REVIEW: [
    { value: 'ACCEPTED',   label: 'Accept',      itemColor: 'text-green-800 bg-green-50 hover:bg-green-100' },
    { value: 'REJECTED',   label: 'Reject',      itemColor: 'text-red-800 bg-red-50 hover:bg-red-100' },
    { value: 'INSPECTING', label: 'Inspecting',  itemColor: 'text-purple-800 bg-purple-50 hover:bg-purple-100' },
  ],
  ACCEPTED: [
    { value: 'UNDER_REVIEW', label: 'Under Review', itemColor: 'text-amber-800 bg-amber-50 hover:bg-amber-100' },
  ],
  REJECTED: [
    { value: 'UNDER_REVIEW', label: 'Under Review', itemColor: 'text-amber-800 bg-amber-50 hover:bg-amber-100' },
  ],
  INSPECTING: [
    { value: 'UNDER_REVIEW', label: 'Under Review', itemColor: 'text-amber-800 bg-amber-50 hover:bg-amber-100' },
    { value: 'ACCEPTED',     label: 'Accept',       itemColor: 'text-green-800 bg-green-50 hover:bg-green-100' },
    { value: 'REJECTED',     label: 'Reject',       itemColor: 'text-red-800 bg-red-50 hover:bg-red-100' },
  ],
};

export function InlineStatusControl({
  ideaId,
  currentStatus,
  currentUpdatedAt,
  isPrivileged,
}: InlineStatusControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const config = STATUS_CONFIG[currentStatus] ?? { label: currentStatus, badge: 'bg-gray-100 text-gray-700 border-gray-300' };
  const options = TRANSITIONS[currentStatus] ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleChange = async (newStatus: string) => {
    setLoading(newStatus);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedAt: currentUpdatedAt }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  };

  // Non-privileged: plain static badge
  if (!isPrivileged) {
    return (
      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${config.badge}`}>
        {config.label}
      </span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setError(null); }}
        title="Click to change status"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer ${config.badge}`}
      >
        {config.label}
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
          <p className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
            Change to
          </p>
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 italic">No transitions available</p>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading !== null}
                onClick={() => handleChange(opt.value)}
                className={`flex w-full items-center px-3 py-2 text-sm font-medium disabled:opacity-50 ${opt.itemColor}`}
              >
                {loading === opt.value ? 'Saving…' : opt.label}
              </button>
            ))
          )}
          {error && (
            <p className="border-t border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
