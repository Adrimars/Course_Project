import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/LoginForm';
import Link from 'next/link';
import { Suspense } from 'react';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Sign In
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Innovation Portal
            </p>
          </div>
          {/* Suspense required for useSearchParams inside LoginForm */}
          <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-gray-100" />}>
            <LoginForm />
          </Suspense>
          <p className="mt-4 text-center text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
