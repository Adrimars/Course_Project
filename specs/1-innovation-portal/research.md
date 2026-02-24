# Research: Innovation Portal

**Phase**: 0 | **Branch**: `1-innovation-portal` | **Date**: 2026-02-24

> Resolves all NEEDS CLARIFICATION items from Technical Context and documents key technology decisions.

---

## 1. NextAuth.js Version: v4 vs v5 (Auth.js)

**Unknown**: Spec says "NextAuth.js" — which major version?

**Decision**: NextAuth.js **v5 (Auth.js)** with Next.js 14 App Router.

**Rationale**:
- v5 is purpose-built for Next.js App Router (use in Server Components, Route Handlers, Middleware)
- v4 requires the legacy `pages/api/auth/[...nextauth].ts` pattern which conflicts with App Router
- v5 `auth()` helper can be called in Server Components, making RBAC checks seamless

**Alternatives considered**:
- NextAuth v4: Rejected — requires `/pages/` directory adapter; not idiomatic with App Router
- Lucia Auth: Rejected — not mandated by constitution; adds learning overhead
- Clerk: Rejected — paid service; constitution mandates NextAuth.js

**Configuration notes**:
- Use Credentials provider (email/password) with bcrypt compare
- `callbacks.session` injects `role` and `id` into the JWT/session
- Middleware-based route protection via `auth.ts` `authorized` callback

---

## 2. Multer Integration with Next.js App Router

**Unknown**: How to use Multer (Node.js middleware) in Next.js Route Handlers (which use Web API `Request`, not Node `req`)?

**Decision**: Use `multer` via a **custom Node.js adapter** in Route Handlers by converting the Web API `Request` to a Node.js-compatible stream, or use the `formidable` library as an alternative. Given the spec **explicitly mandates Multer**, use a thin adapter.

**Implementation pattern**:
```ts
// lib/upload.ts — Multer configured with diskStorage
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (_, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png', 'image/jpeg'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// In Route Handler: disable Next.js body parser, use multer via promisify
export const config = { api: { bodyParser: false } };
```

**Rationale**: Multer is mandated by spec/constitution. Using `diskStorage` keeps implementation simple for the initial iteration. The `uploads/` directory is gitignored and served via a dedicated `/api/ideas/[id]/attachment` download route.

**Alternatives considered**:
- `formidable`: Better native Next.js support, but not mandated; rejected to comply with spec
- AWS S3 / Vercel Blob: Better for production scale; out of scope and adds external dependency
- `sharp` for image processing: Not required by spec; out of scope

**Security**: MIME type is validated server-side via Multer's `fileFilter` (checks `file.mimetype`). File extension alone is insufficient (per edge case in spec).

---

## 3. Password Hashing: bcrypt Configuration

**Decision**: Use `bcryptjs` (pure-JS, no native bindings) with **12 rounds** (exceedsspec minimum of 10).

**Rationale**:
- `bcryptjs` avoids native build issues in CI/Docker environments
- 12 rounds = ~250ms hash time on modern hardware; balances security vs user experience
- 10 rounds is minimum per spec; 12 chosen for defence-in-depth

**Alternatives considered**:
- `bcrypt` (native): Faster but requires node-gyp / native build in Docker; `bcryptjs` preferred for portability
- Argon2: Superior algorithm but spec explicitly mandates bcrypt; rejected

---

## 4. First Admin Assignment & Role Promotion

**Decision from spec clarification**: First registered user automatically receives `ADMIN` role. Admins promote others via admin panel (`PATCH /api/users/[id]`).

**Implementation**:
```ts
// During user creation in POST /api/auth/register
const userCount = await prisma.user.count();
const role = userCount === 0 ? 'ADMIN' : 'USER';
await prisma.user.create({ data: { email, hashedPassword, name, role } });
```

**Edge case**: Race condition if two users register simultaneously when count = 0. Mitigation: wrap in a Prisma transaction with a unique constraint check; first committed transaction wins.

---

## 5. Status Auto-Transition: Submitted → Under Review

**Decision from spec clarification**: Status automatically changes to `UNDER_REVIEW` when an admin **first opens** the idea detail page.

**Implementation**:
```ts
// In GET /api/ideas/[id] handler (or Server Component loader)
if (session.user.role === 'ADMIN' && idea.status === 'SUBMITTED') {
  await prisma.$transaction([
    prisma.idea.update({ where: { id }, data: { status: 'UNDER_REVIEW' } }),
    prisma.statusHistory.create({
      data: {
        ideaId: id,
        oldStatus: 'SUBMITTED',
        newStatus: 'UNDER_REVIEW',
        adminId: session.user.id,
        feedback: 'Automatically set to Under Review upon admin view',
      },
    }),
  ]);
}
```

**Rationale**: Auto-transition is logged in `StatusHistory` maintaining the full audit trail required by FR-009.

---

## 6. Idea Visibility Rules

**Decision**: `visibility` field on `Idea` defaults to `PUBLIC`. Prisma query filtering:

```ts
// Regular user query
where: {
  OR: [
    { visibility: 'PUBLIC' },
    { submitterId: session.user.id },
  ]
}

// Admin query — no filter needed
where: {}
```

---

## 7. Pagination Strategy

**Decision**: Cursor-based pagination using Prisma `cursor` + `take` for performance, with a fallback to offset (`skip` + `take`) for simplicity given the 20/page requirement and moderate scale (hundreds of ideas).

**Chosen**: **Offset pagination** (`skip` + `take: 20`) — simpler for dashboard sorting by `createdAt DESC`; adequate for hundreds of records.

**Alternatives considered**:
- Cursor-based: Better performance at scale but complicates sort/filter UI; rejected at current scale
- Infinite scroll: Out of scope; spec implies numbered pages

---

## 8. Input Validation: Zod Schema Strategy

**Decision**: Zod for all API route input validation and React Hook Form + Zod resolver for client-side forms.

**Key schemas**:
| Schema | Rules |
|--------|-------|
| `registerSchema` | email (valid format), password (min 8, regex: uppercase + lowercase + digit + special char), name (min 2) |
| `ideaSubmitSchema` | title (min 10, max 200), description (min 50, max 5000), category (`IdeaCategory` enum, required), visibility (PUBLIC\|PRIVATE, default PUBLIC) |
| `evaluateSchema` | status (ACCEPTED\|REJECTED), feedback (min 10, required — per edge case in spec) |

---

## 9. Database: PostgreSQL + Prisma

**Decision**: PostgreSQL 16 with Prisma 5 (ORM). Prisma parameterised queries prevent SQL injection by default.

**Migration strategy**: `prisma migrate dev` during development; `prisma migrate deploy` in CI/CD.

**Connection**: Single `PrismaClient` singleton in `lib/db.ts` (required for Next.js to avoid connection pool exhaustion in dev with hot-reload).

---

## 10. Testing Stack

**Decision**:
| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Jest + React Testing Library | Zod schemas, utility functions, component rendering |
| Integration | Jest + Prisma (test DB) | API route handlers with isolated PostgreSQL test database |
| E2E | Playwright | Auth flows, idea submission, admin evaluation, status transitions |

**Coverage gate**: 80% statements/branches enforced via `jest --coverage` in CI.

**E2E setup**: Playwright uses a seeded test database with known fixtures (users, ideas) reset between test suites.

---

## Resolved Clarifications Summary

| # | Unknown | Resolution |
|---|---------|-----------|
| 1 | NextAuth.js version | v5 (Auth.js) — App Router compatible |
| 2 | Multer + App Router | Custom adapter; diskStorage in `./uploads/` |
| 3 | bcrypt rounds | 12 (exceeds minimum of 10) using `bcryptjs` |
| 4 | First admin creation | `userCount === 0` check at registration |
| 5 | Status auto-transition | Logged in StatusHistory on admin first-view |
| 6 | Visibility filtering | Prisma `OR` clause; admin bypasses filter |
| 7 | Pagination | Offset-based, 20/page, `createdAt DESC` |
| 8 | Input validation | Zod (API) + React Hook Form + Zod resolver (client) |
| 9 | ORM/DB | Prisma 5 + PostgreSQL 16 |
| 10 | Testing | Jest (unit/integration) + Playwright (E2E) |
