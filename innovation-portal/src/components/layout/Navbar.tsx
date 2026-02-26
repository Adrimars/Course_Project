'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role } from '@/types';
import { Button } from '@/components/ui/Button';
import { useTabSession } from '@/components/providers/TabAuthProvider';
import { useEffect, useState } from 'react';

export function Navbar() {
  // useTabSession reads from sessionStorage — each browser tab has its own
  // copy, so two tabs can simultaneously display different logged-in users.
  const { user: tabUser, isLoading: tabLoading, logout: clearTabSession } = useTabSession();
  // Fall back to NextAuth session when the tab token is absent (e.g. after a
  // hard refresh that clears sessionStorage while the NextAuth cookie is still valid).
  const { data: nextAuthSession, status: nextAuthStatus } = useSession();

  const isLoading = tabLoading || nextAuthStatus === 'loading';

  // Build a unified user from whichever source has data
  const user = tabUser ?? (
    nextAuthSession?.user
      ? {
        id: nextAuthSession.user.id ?? '',
        email: nextAuthSession.user.email ?? '',
        name: nextAuthSession.user.name ?? '',
        role: nextAuthSession.user.role ?? Role.USER,
      }
      : null
  );

  if (isLoading) return null;
  if (!user) return null;

  const role = user.role as Role;
  const isAdmin = role === Role.ADMIN;
  const isInspector = role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  const roleLabel =
    role === Role.ADMIN ? 'Administrator' : role === Role.INSPECTOR ? 'Inspector' : 'User';

  const handleLogout = () => {
    clearTabSession();
    signOut({ callbackUrl: '/login' });
  };

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: App title + nav links */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-blue-600 hover:text-blue-700"
          >
            Innovation Portal
          </Link>
          <div className="hidden items-center gap-4 sm:flex">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Dashboard
            </Link>
            <Link
              href="/my-ideas"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              My Ideas
            </Link>
            <Link
              href="/ideas"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Browse Ideas
            </Link>
            <Link
              href="/ideas/new"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Submit Idea
            </Link>
            {isPrivileged && (
              <>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Admin Panel
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Manage Users
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    href="/admin/pipelines"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Pipelines
                  </Link>
                )}
                {(isAdmin || isInspector) && (
                  <Link
                    href="/my-assignments"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    My Assignments
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Notification bell + User info + logout */}
        <div className="flex items-center gap-3">
          <NotificationBadge />
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log Out
          </Button>
        </div>
      </div>
    </nav>
  );
}

function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('tab-token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/notifications/count', { headers });
        if (res.ok) {
          const data = await res.json();
          setCount(data.unreadCount ?? 0);
        }
      } catch {
        // silent
      }
    };

    fetchCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link href="/notifications" className="relative p-1">
      <span className="text-lg">🔔</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
