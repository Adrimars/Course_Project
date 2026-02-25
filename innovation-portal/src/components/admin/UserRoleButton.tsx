'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserRoleButtonProps {
  userId: string;
  currentRole: 'USER' | 'INSPECTOR' | 'ADMIN';
  isSelf: boolean;
}

const ROLE_ORDER: ('USER' | 'INSPECTOR' | 'ADMIN')[] = ['USER', 'INSPECTOR', 'ADMIN'];

const ROLE_LABELS: Record<string, string> = {
  USER: 'User',
  INSPECTOR: 'Inspector',
  ADMIN: 'Admin',
};

export function UserRoleButton({ userId, currentRole, isSelf }: UserRoleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  if (isSelf) {
    return <span className="text-xs text-gray-400 italic">You</span>;
  }

  const handleRoleChange = async (targetRole: string) => {
    if (targetRole === currentRole) return;
    if (!confirm(`Change this user's role to ${ROLE_LABELS[targetRole]}?`)) {
      setMenuOpen(false);
      return;
    }

    setLoading(true);
    setError(null);
    setMenuOpen(false);

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
    <span className="relative inline-flex flex-col items-start gap-0.5">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        disabled={loading}
        className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
      >
        {loading ? '...' : 'Change Role'}
      </button>
      {menuOpen && (
        <div className="absolute top-7 left-0 z-10 rounded border border-gray-200 bg-white shadow-lg">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleChange(role)}
              disabled={role === currentRole}
              className={`block w-full px-4 py-1.5 text-left text-xs transition-colors ${role === currentRole
                  ? 'bg-gray-100 font-bold text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
                }`}
            >
              {ROLE_LABELS[role]}
              {role === currentRole && ' ✓'}
            </button>
          ))}
        </div>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
