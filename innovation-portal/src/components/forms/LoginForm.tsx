'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { loginSchema, LoginInput } from '@/lib/validations/user';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useTabSession } from '@/components/providers/TabAuthProvider';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Sanitize callbackUrl — only allow relative paths to prevent open redirect
  const rawCallback = searchParams.get('callbackUrl') ?? '/dashboard';
  const callbackUrl = rawCallback.startsWith('/') ? rawCallback : '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  const { login: storeTabToken } = useTabSession();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);

    // 1️⃣  NextAuth credentials sign-in — sets the shared session cookie used by
    //    server components and middleware for SSR page protection.
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (!result?.ok) {
      setServerError('Invalid email or password. Please try again.');
      return;
    }

    // 2️⃣  Obtain a per-tab JWT from our custom endpoint and store it in
    //    sessionStorage.  This token is NOT shared across browser tabs, so two
    //    tabs can be simultaneously logged in as different users.
    try {
      const tabRes = await fetch('/api/auth/tab-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      if (tabRes.ok) {
        const { token } = (await tabRes.json()) as { token: string };
        storeTabToken(token);
      }
    } catch (err) {
      // Non-fatal: the NextAuth session still works for SSR pages.
      console.warn('[TabAuth] Could not obtain per-tab token:', err);
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    // SECURITY: method="POST" ensures credentials never appear in URL
    // even if JavaScript fails to intercept the form submission
    <form onSubmit={handleSubmit(onSubmit)} method="POST" className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="email" required>
          Email Address
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password" required>
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
