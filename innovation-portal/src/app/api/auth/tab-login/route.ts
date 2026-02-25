/**
 * POST /api/auth/tab-login
 *
 * Issues a per-tab JWT that the client stores in sessionStorage.  Unlike the
 * NextAuth cookie session (shared across all browser tabs), each tab holds its
 * own token, enabling "two tabs with different accounts" isolation.
 *
 * Flow:
 * 1. Client submits { email, password }.
 * 2. Server validates credentials against the DB (bcrypt compare).
 * 3. On success, returns a signed JWT — no Set-Cookie header is emitted.
 * 4. The client stores the JWT in sessionStorage('tab-auth-token') and uses it
 *    as `Authorization: Bearer <token>` on subsequent API requests.
 *
 * The endpoint is intentionally unauthenticated so the login page can call it
 * without an existing session.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/validations/user';
import { signTabToken } from '@/lib/tab-auth';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate input shape with the existing loginSchema (same rules as NextAuth)
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid email or password format' },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;

  // Lookup user — use a generic error to avoid email-enumeration attacks
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = await signTabToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
