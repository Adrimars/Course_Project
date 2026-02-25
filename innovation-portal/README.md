# Innovation Portal

A Next.js 14 full-stack application for collecting, managing, and evaluating employee innovation ideas.

## Features

- **Authentication** — Register / login with email + password (first user becomes admin)
- **Role-based Access Control** — Three roles: USER, INSPECTOR, ADMIN
- **Idea Submission** — Rich forms with category-specific fields, file attachments (PDF/DOC/DOCX/PNG/JPG ≤ 10 MB), draft auto-save
- **Dashboard Analytics** — Status breakdown with progress bars and stat cards
- **Browse Ideas** — Paginated listing with full-text search and filters (status, category, visibility)
- **My Ideas** — Tabs for submitted, assigned, and inspecting ideas
- **Status Workflow** — SUBMITTED → UNDER_REVIEW → ACCEPTED/REJECTED/INSPECTING with full audit trail
- **Notes** — Personal (author-only) and collaborative (team-visible) notes on ideas
- **Task Assignments** — Admin assigns users; users accept/decline
- **Join Requests** — Users request to join projects; owners approve/reject
- **Admin Panel** — Full evaluation workflow, user management, role promotion

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL in .env.local

# 3. Run migrations
npx prisma migrate deploy

# 4. Seed the database with test users and sample ideas
npm run db:seed

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Test Credentials

| Role       | Email                   | Password        |
|------------|-------------------------|-----------------|
| Admin      | `admin@epam.com`        | `Admin123!`     |
| Inspector  | `inspector@epam.com`    | `Inspector123!` |
| User       | `user1@epam.com`        | `User1234!`     |
| User       | `user2@epam.com`        | `User5678!`     |

---

## Available Scripts

| Script                 | Description                                 |
|------------------------|---------------------------------------------|
| `npm run dev`          | Start development server                    |
| `npm run build`        | Create production build                     |
| `npm run start`        | Start production server                     |
| `npm test`             | Run unit + integration tests (Jest)         |
| `npm run test:coverage`| Run tests with coverage report              |
| `npm run test:e2e`     | Run end-to-end tests (Playwright)           |
| `npm run lint`         | Run ESLint                                  |
| `npm run typecheck`    | Run TypeScript type checker                 |
| `npm run db:seed`      | Seed the database with test data            |

---

## Architecture

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── (auth)/             # Login / Register pages
│   ├── admin/              # Admin panel + evaluation pages
│   ├── api/                # REST API handlers
│   │   ├── auth/           # Register + NextAuth
│   │   ├── ideas/          # CRUD + notes + assignments + join-requests
│   │   ├── assignments/    # Accept/decline assignments
│   │   ├── join-requests/  # Approve/reject join requests
│   │   └── users/          # User management + lookup
│   ├── dashboard/          # Analytics dashboard
│   ├── ideas/              # Browse ideas + idea detail + submission form
│   └── my-ideas/           # Personalised idea tabs
├── components/
│   ├── dashboard/          # AnalyticsDashboard
│   ├── forms/              # Auth forms, idea form, evaluation form
│   ├── ideas/              # IdeaCard, IdeaList, StatusBadge, NoteList,
│   │                       #   AssignmentSection, JoinRequestButton, SearchAndFilter
│   ├── layout/             # Navbar
│   └── ui/                 # Button, Input, Badge, Spinner, Toast
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   ├── db.ts               # Prisma client singleton
│   ├── upload.ts           # Multer + MIME validation
│   ├── utils.ts            # Pagination, date, file-size helpers
│   └── validations/        # Zod schemas
└── types/                  # Shared TypeScript types + NextAuth augmentation
```

---

## Database Schema

Built with Prisma + PostgreSQL. Key models:

- **User** — `id, name, email, hashedPassword, role(USER|INSPECTOR|ADMIN)`
- **Idea** — `id, title, description, category, status, visibility, metadata(JSON)`
- **Attachment** — UUID filename, MIME-verified storage
- **StatusHistory** — Full audit trail of every status transition
- **Note** — Personal (author-only) or Collaborative (team-visible) notes
- **Assignment** — Admin-assigned users; accept/decline workflow
- **JoinRequest** — User-initiated project participation requests

---

## Testing

```bash
# Unit + integration tests
npm test

# With coverage (target: 80%+)
npm run test:coverage

# E2E tests (requires running dev server on port 3000)
npm run test:e2e
```

