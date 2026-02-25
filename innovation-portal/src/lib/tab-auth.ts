/**
 * tab-auth.ts
 *
 * Lightweight JWT utilities for the per-tab sessionStorage auth layer.
 *
 * Design goals
 * ─────────────
 * 1. Sign/verify using the same NEXTAUTH_SECRET so a single key protects both
 *    the NextAuth cookie session and the tab-token issued by /api/auth/tab-login.
 * 2. `getTabSession(request)` lets API route handlers accept
 *    `Authorization: Bearer <token>` in addition to the existing NextAuth cookie,
 *    enabling per-tab isolation when two tabs hold different session tokens.
 * 3. All JOSE operations are async and edge-runtime compatible.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { NextRequest } from 'next/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TabUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set');
  return new TextEncoder().encode(secret);
}

// ── Sign ──────────────────────────────────────────────────────────────────────

/** Issue a signed 8-hour JWT carrying the tab user payload. */
export async function signTabToken(user: TabUser): Promise<string> {
  return new SignJWT({ ...user } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

// ── Verify ────────────────────────────────────────────────────────────────────

/**
 * Verify a tab token and return the decoded user, or `null` if invalid /
 * expired.  Safe to call server-side AND in the browser (jose works in both
 * environments).
 */
export async function verifyTabToken(token: string): Promise<TabUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { id, email, name, role } = payload as JWTPayload & TabUser;
    if (!id || !email || !name || !role) return null;
    return { id, email, name, role };
  } catch {
    return null;
  }
}

// ── Request helper ────────────────────────────────────────────────────────────

/**
 * Extract and verify the Bearer token from an HTTP request's `Authorization`
 * header.  Returns the decoded `TabUser` or `null` if no valid token is found.
 *
 * Usage in API routes:
 * ```ts
 * const tabUser = await getTabSession(request);
 * if (!tabUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * ```
 */
export async function getTabSession(
  request: NextRequest | Request,
): Promise<TabUser | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length).trim();
  return verifyTabToken(token);
}
