# Innovation Portal — Architecture

## Tech Stack
| Layer        | Technology                   |
|--------------|------------------------------|
| Framework    | Next.js 14 (App Router)      |
| Language     | TypeScript 5                 |
| Database     | PostgreSQL via Prisma ORM 7  |
| Auth         | NextAuth.js 4 (Credentials)  |
| Styling      | Tailwind CSS 3               |
| Validation   | Zod 4                        |
| Forms        | React Hook Form 7            |
| File Upload  | Multer 2 (disk storage)      |
| Testing      | Jest 30, Playwright, Supertest|
| Package Mgr  | npm                          |

## Directory Structure
```
innovation-portal/
├── prisma/
│   ├── schema.prisma          # DB schema (User, Idea, Attachment, StatusHistory, NextAuth models)
│   ├── seed.ts                # Dev seed data (3 users, 5 ideas)
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/            # Login + Register pages
│   │   ├── admin/             # Admin panel + user management + idea detail
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth route + registration endpoint
│   │   │   ├── ideas/         # CRUD + attachment download
│   │   │   └── users/         # Role management
│   │   ├── dashboard/         # Main idea listing page
│   │   └── ideas/             # Idea detail + new idea form
│   ├── components/
│   │   ├── admin/             # UserRoleButton
│   │   ├── forms/             # LoginForm, RegisterForm, IdeaSubmitForm, EvaluationForm
│   │   ├── ideas/             # IdeaCard, IdeaList, StatusBadge, StatusHistory, VisibilityToggle
│   │   ├── layout/            # Navbar
│   │   └── ui/                # Badge, Button, Input, Label, Spinner, Toast
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── upload.ts          # Multer config
│   │   ├── utils.ts           # Pagination, date formatting, helpers
│   │   └── validations/       # Zod schemas (user.ts, idea.ts)
│   └── types/
│       └── index.ts           # TS types + NextAuth module augmentation
├── tests/
│   ├── unit/                  # Validation, upload, RBAC tests
│   ├── integration/           # API endpoint tests
│   └── e2e/                   # Playwright browser tests
├── uploads/                   # File storage (gitignored, not in public/)
├── middleware.ts               # NextAuth middleware (protects all routes except auth)
├── next.config.mjs
├── jest.config.ts
├── playwright.config.ts
└── package.json
```

## Data Model
```
User ──1:N──> Idea (submitter)
User ──1:N──> StatusHistory (admin who changed status)
Idea ──1:1──> Attachment (optional file)
Idea ──1:N──> StatusHistory (audit trail)
User ──1:N──> Account (NextAuth)
User ──1:N──> Session (NextAuth)
```

### Enums
- **Role**: USER, ADMIN
- **IdeaStatus**: SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED
- **IdeaCategory**: TECHNOLOGY, PROCESS, PRODUCT, COST_SAVING, CUSTOMER_EXPERIENCE, OTHER
- **Visibility**: PUBLIC, PRIVATE

## Key Patterns
- **Prisma singleton**: Hot-reload safe via `globalThis` caching in `db.ts`
- **Auth middleware**: All routes except `/login`, `/register`, `/api/auth/**` require auth
- **Server Components**: Pages fetch data server-side; forms/toggles are client components
- **Pagination**: Server-side, 20 items/page, shared `getPaginationParams` + `buildPaginationMeta`
- **File security**: UUID filenames, files served only via authenticated API route, upload dir outside `public/`
- **Transactions**: Used for registration (serializable), idea creation with attachment, status changes
