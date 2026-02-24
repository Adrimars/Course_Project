# Authentication Contract: Innovation Portal

**Phase**: 1 | **Branch**: `1-innovation-portal` | **Date**: 2026-02-24

---

## Overview

Authentication is provided by **NextAuth.js v5 (Auth.js)** using the **Credentials** provider (email + password). Sessions are managed via JWT stored in an `httpOnly` cookie.

---

## Session Object

Available in Server Components via `auth()`, in Route Handlers via `auth()`, and on the client via `useSession()`.

```ts
interface Session {
  user: {
    id: string;        // User.id (cuid)
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
  };
  expires: string;     // ISO 8601 expiry datetime
}
```

The `role` and `id` fields are injected via NextAuth `jwt` and `session` callbacks:

```ts
// lib/auth.ts (simplified)
callbacks: {
  jwt({ token, user }) {
    if (user) {
      token.id   = user.id;
      token.role = user.role;
    }
    return token;
  },
  session({ session, token }) {
    session.user.id   = token.id as string;
    session.user.role = token.role as 'USER' | 'ADMIN';
    return session;
  },
}
```

---

## Route Protection Rules

| Route Pattern | Auth Required | Role Required | Redirect if Denied |
|---------------|--------------|---------------|--------------------|
| `/login`, `/register` | No | — | Redirect to `/dashboard` if already logged in |
| `/dashboard` | Yes | Any | `/login` |
| `/ideas/new` | Yes | Any | `/login` |
| `/ideas/[id]` | Yes | Any (visibility check in handler) | `/login` or `/dashboard` |
| `/admin/**` | Yes | `ADMIN` | `/dashboard` with error toast |
| `/api/ideas` (GET) | Yes | Any | `401` |
| `/api/ideas` (POST) | Yes | Any | `401` |
| `/api/ideas/[id]` (GET) | Yes | Any | `401` |
| `/api/ideas/[id]` (PATCH) | Yes | `ADMIN` | `403` |
| `/api/users/[id]` (PATCH) | Yes | `ADMIN` | `403` |

**Middleware** (`middleware.ts` at project root) enforces authentication using NextAuth's `auth` export:

```ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ['/((?!api/auth|_next|public|favicon).*)'],
};
```

---

## Credentials Provider Flow

```
User fills login form
  → POST credentials to NextAuth signIn()
  → NextAuth calls authorize(credentials)
    → Lookup User by email in DB
    → bcrypt.compare(password, hashedPassword)
    → If match: return user object { id, email, name, role }
    → If no match: return null (NextAuth shows error)
  → JWT created with { id, email, name, role }
  → httpOnly cookie set
  → Redirect to /dashboard
```

---

## Registration Flow (Custom Route)

Registration is handled by `POST /api/auth/register` (custom route, not NextAuth):

```
User fills register form
  → POST /api/auth/register { email, password, name }
  → Zod validation
  → Check email uniqueness
  → Count existing users → role = userCount === 0 ? 'ADMIN' : 'USER'
  → bcrypt.hash(password, 12)
  → prisma.user.create(...)
  → Return 201 with user data (no password)
  → Client calls signIn() to start session
```

---

## Password Requirements

```
Regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/
```

| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Uppercase letters | At least 1 |
| Lowercase letters | At least 1 |
| Digits | At least 1 |
| Special characters | At least 1 |
| Storage | bcrypt hash, 12 rounds |
| Plain text | Never stored or logged |

---

## Session Expiry

| Setting | Value |
|---------|-------|
| JWT expiry | 30 days (default NextAuth) |
| Session cookie | Session cookie (expires on browser close unless `rememberMe` added) |
| Refresh | Automatic on each authenticated request |

---

## RBAC Enforcement

Two roles exist: `USER` and `ADMIN`.

| Action | `USER` | `ADMIN` |
|--------|--------|---------|
| Register / Login | ✅ | ✅ |
| Submit idea | ✅ | ✅ |
| View public ideas | ✅ | ✅ |
| View own private ideas | ✅ | ✅ |
| View all ideas (incl. private) | ❌ | ✅ |
| Evaluate idea (PATCH status) | ❌ | ✅ |
| Access `/admin/**` pages | ❌ | ✅ |
| Promote users to Admin | ❌ | ✅ |
