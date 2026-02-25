'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Role } from '@/types';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const { data: session } = useSession();

  if (!session) return null;

  const isAdmin = session.user.role === Role.ADMIN;

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
              href="/ideas/new"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Submit Idea
            </Link>
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Admin Panel
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Manage Users
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-3">
          <div className="text-right text-sm">
            <p className="font-medium text-gray-900">{session.user.name}</p>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Administrator' : 'User'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            Log Out
          </Button>
        </div>
      </div>
    </nav>
  );
}
