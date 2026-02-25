'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRoleButtonProps {
  userId: string;
  currentRole: 'USER' | 'ADMIN';
  isSelf: boolean;
}

export function UserRoleButton({ userId, currentRole, isSelf }: UserRoleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (isSelf) {
    return <span className="text-xs text-gray-400 italic">You</span>;
  }

  const isAdmin = currentRole === 'ADMIN';
  const targetRole = isAdmin ? 'USER' : 'ADMIN';
  const label = isAdmin ? 'Demote to User' : 'Promote to Admin';

  const handleClick = async () => {
    if (!confirm(`Are you sure you want to ${isAdmin ? 'demote' : 'promote'} this user?`)) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed: ${res.status}`);
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`rounded px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          isAdmin
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
        }`}
      >
        {loading ? '...' : label}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
