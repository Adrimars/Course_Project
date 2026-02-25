/**
 * middleware.ts
 *
 * Custom auth middleware that supports two authentication mechanisms:
 *
 * 1. **NextAuth JWT cookie** (existing behaviour)
 *    Used by browser navigation to server-rendered pages.  The cookie is shared
 *    across all browser tabs within the same profile.
 *
 * 2. **Authorization: Bearer <tab-token>** (new per-tab mechanism)
 *    Used by client-side `fetch()` calls when the tab has a sessionStorage
 *    token issued by POST /api/auth/tab-login.  Because sessionStorage is
 *    scoped to a single tab, two tabs can simultaneously hold tokens for
 *    *different* users — enabling the "two tabs, two accounts" demo.
 *
 * Route-type handling
 * ─────────────────────────────────────────────────────────────────────────────
 * • /api/auth/**          → always allowed (NextAuth + tab-login endpoints)
 * • /api/**               → allow if EITHER cookie-session OR Bearer token is
 *                           valid; otherwise 401 JSON (not a redirect, so that
 *                           fetch() callers get a machine-readable response)
 * • page routes           → allow if NextAuth cookie is valid; redirect to
 *                           /login otherwise (preserves existing behaviour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { jwtVerify } from 'jose';

const PUBLIC_PAGE_PATHS = ['/login', '/register'];
const API_AUTH_PREFIX = '/api/auth';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? '');
}

async function hasValidBearerToken(request: NextRequest): Promise<boolean> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice('Bearer '.length).trim();
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow NextAuth internal endpoints and the tab-login route
  if (pathname.startsWith(API_AUTH_PREFIX)) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/sitemap.xml') ||
    pathname.startsWith('/robots.txt')
  ) {
    return NextResponse.next();
  }

  // ── API routes (/api/** except /api/auth/**) ──────────────────────────────
  if (pathname.startsWith('/api/')) {
    // Accept either a NextAuth cookie-session or a per-tab Bearer token
    const [nextAuthToken, bearerOk] = await Promise.all([
      getToken({ req: request, secret: process.env.NEXTAUTH_SECRET }),
      hasValidBearerToken(request),
    ]);

    if (nextAuthToken || bearerOk) {
      return NextResponse.next();
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Public page routes ────────────────────────────────────────────────────
  if (PUBLIC_PAGE_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ── Protected page routes ─────────────────────────────────────────────────
  // Require a valid NextAuth session cookie for SSR pages.
  const nextAuthToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!nextAuthToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT Next.js internals and static metadata.
     * The middleware function itself decides what to allow / deny.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
