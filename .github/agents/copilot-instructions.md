# InnovatEPAM Portal Development Guidelines

Auto-generated from feature plans. Last updated: 2026-02-24

## Active Technologies

- **Language**: TypeScript 5.x with Node.js 20 LTS
- **Framework**: Next.js 14 (App Router, React server components)
- **Authentication**: NextAuth.js v5 (Auth.js) — Credentials provider, JWT sessions
- **Database**: PostgreSQL 16 with Prisma 5 ORM
- **File Handling**: Multer 1.x (diskStorage, MIME validation)
- **Password Hashing**: bcryptjs (12 rounds)
- **Input Validation**: Zod (API) + React Hook Form + Zod resolver (client)
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
- **Architecture**: Single Next.js service acting as the innovation portal microservice

## Project Structure

```text
innovation-portal/
├── prisma/
│   ├── schema.prisma        # User, Idea, Attachment, StatusHistory, NextAuth models
│   └── migrations/
├── src/
│   ├── app/                 # Next.js 14 App Router
│   │   ├── (auth)/login, register
│   │   ├── dashboard/
│   │   ├── ideas/new, [id]
│   │   ├── admin/, admin/users
│   │   └── api/auth, ideas, users
│   ├── components/ui, forms, ideas, layout
│   ├── lib/db.ts, auth.ts, validations/, upload.ts, utils.ts
│   └── types/
├── tests/unit, integration, e2e
├── uploads/                 # Gitignored runtime file storage
└── .env.local               # DATABASE_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
```

## Commands

```bash
# Install
npm install

# Database
npx prisma migrate dev --name <migration-name>
npx prisma migrate deploy           # production
npx prisma studio                   # GUI

# Development
npm run dev                         # http://localhost:3000

# Build
npm run build && npm start

# Testing
npm test
npm run test:coverage
npx playwright test
npx playwright test --ui

# Code quality
npm run lint
npm run typecheck
```

## Code Style

- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- ESLint enforced (no warnings allowed in CI)
- Zod schemas for all external input validation (API routes + forms)
- Prisma parameterised queries only — no raw SQL strings
- `bcryptjs` for hashing — never store or log plain-text passwords
- Server Components for data fetching; Client Components only when interactivity needed
- All API route handlers: validate session → validate input (Zod) → DB operation → respond

## Key Patterns

### RBAC check in Route Handler
```ts
const session = await auth();
if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
if (session.user.role !== 'ADMIN') return Response.json({ error: 'Admin role required' }, { status: 403 });
```

### First-user admin assignment
```ts
const userCount = await prisma.user.count();
const role = userCount === 0 ? 'ADMIN' : 'USER';
```

### Status auto-transition (SUBMITTED → UNDER_REVIEW)
```ts
if (session.user.role === 'ADMIN' && idea.status === 'SUBMITTED') {
  await prisma.$transaction([
    prisma.idea.update({ where: { id }, data: { status: 'UNDER_REVIEW' } }),
    prisma.statusHistory.create({ data: { ideaId: id, oldStatus: 'SUBMITTED', newStatus: 'UNDER_REVIEW', adminId: session.user.id, feedback: 'Automatically set to Under Review upon admin view' } }),
  ]);
}
```

### Visibility filter (dashboard query)
```ts
// Regular user
where: { OR: [{ visibility: 'PUBLIC' }, { submitterId: session.user.id }] }
// Admin: no filter
```

## Recent Changes

### Feature 1 — Innovation Portal (`1-innovation-portal`) — 2026-02-24
- Added: Next.js 14, NextAuth.js v5, Prisma 5, PostgreSQL, Multer, bcryptjs, Zod, Tailwind CSS, Jest, Playwright
- Entities: User, Idea, Attachment, StatusHistory
- Routes: /api/auth/register, /api/ideas, /api/ideas/[id], /api/ideas/[id]/attachment, /api/users/[id]
- RBAC: USER and ADMIN roles; first registered user = ADMIN
- Status lifecycle: SUBMITTED → UNDER_REVIEW (auto) → ACCEPTED | REJECTED
- Configurable idea visibility: PUBLIC (default) / PRIVATE

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
