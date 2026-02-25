'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { registerSchema, RegisterInput } from '@/lib/validations/user';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { useToast } from '@/components/ui/Toast';

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.status === 201) {
        showToast('Account created successfully! Please log in.', 'success');
        router.push('/login');
        return;
      }

      const body = await res.json();
      if (res.status === 409) {
        setServerError('An account with this email already exists.');
      } else {
        setServerError(body.error ?? 'Registration failed. Please try again.');
      }
    } catch {
      setServerError('Network error. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="name" required>
          Full Name
        </Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...register('name')}
        />
      </div>

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
          autoComplete="new-password"
          placeholder="Min 8 chars, uppercase, digit, special char"
          error={errors.password?.message}
          {...register('password')}
        />
        <p className="text-xs text-gray-500" aria-describedby="password">
          Must contain uppercase, lowercase, a digit, and a special character.
        </p>
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Create Account
      </Button>
    </form>
  );
}
