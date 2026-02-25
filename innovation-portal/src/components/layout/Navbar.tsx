'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { Role } from '@/types';
import { Button } from '@/components/ui/Button';
import { useTabSession } from '@/components/providers/TabAuthProvider';

export function Navbar() {
  // useTabSession reads from sessionStorage — each browser tab has its own
  // copy, so two tabs can simultaneously display different logged-in users.
  const { user, logout: clearTabSession } = useTabSession();

  if (!user) return null;

  const role = user.role as Role;
  const isAdmin = role === Role.ADMIN;
  const isInspector = role === Role.INSPECTOR;
  const isPrivileged = isAdmin || isInspector;

  const roleLabel =
    role === Role.ADMIN ? 'Administrator' : role === Role.INSPECTOR ? 'Inspector' : 'User';

  const handleLogout = () => {
    // Clear the per-tab sessionStorage token first, then the shared NextAuth
    // cookie so all server-rendered pages are also logged out.
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
                  {isAdmin ? 'Admin Panel' : 'Inspector Panel'}
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Manage Users
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-3">
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

