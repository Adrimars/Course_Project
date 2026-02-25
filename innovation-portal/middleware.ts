export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /api/auth/** (NextAuth endpoints)
     * - /login, /register (public auth pages)
     * - /_next/** (Next.js internals)
     * - /favicon.ico, /sitemap.xml, /robots.txt (static metadata)
     */
    '/((?!api/auth|login|register|_next/static|_next/image|favicon.ico).*)',
  ],
};
