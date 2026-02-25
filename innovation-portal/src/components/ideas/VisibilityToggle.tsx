'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VisibilityToggleProps {
  ideaId: string;
  currentVisibility: 'PUBLIC' | 'PRIVATE';
}

export function VisibilityToggle({ ideaId, currentVisibility }: VisibilityToggleProps) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const toggle = async () => {
    setLoading(true);
    setError(null);
    const next = visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';

    try {
      const res = await fetch(`/api/ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      setVisibility(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Visibility:</span>
      <button
        onClick={toggle}
        disabled={loading}
        aria-label={`Set idea to ${visibility === 'PUBLIC' ? 'private' : 'public'}`}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 ${
          visibility === 'PUBLIC'
            ? 'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400'
        }`}
      >
        {loading ? '...' : visibility === 'PUBLIC' ? '🌐 Public — click to make Private' : '🔒 Private — click to make Public'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
