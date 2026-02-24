# Tasks: Innovation Portal

**Input**: Design documents from `/specs/1-innovation-portal/`
**Prerequisites**: [plan.md](./plan.md) · [spec.md](./spec.md) · [research.md](./research.md) · [data-model.md](./data-model.md) · [contracts/api-routes.md](./contracts/api-routes.md) · [contracts/auth-contract.md](./contracts/auth-contract.md)

**Tests**: Not requested — no test tasks included per spec.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable — different files, no dependencies on incomplete tasks in same phase
- **[Story]**: Which user story ([US1]–[US5]) this task belongs to
- All paths are relative to the `innovation-portal/` project root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Next.js project with all tooling, configuration, and directory structure

- [ ] T001 Initialize Next.js 14 project with TypeScript in `innovation-portal/` (Next.js App Router, `npx create-next-app@latest`)
- [ ] T002 Install all runtime dependencies: `prisma @prisma/client next-auth@beta bcryptjs multer uuid zod react-hook-form @hookform/resolvers` in `innovation-portal/package.json`
- [ ] T003 [P] Configure TypeScript strict mode in `innovation-portal/tsconfig.json` (`"strict": true`, path aliases `@/*`)
- [ ] T004 [P] Configure ESLint with Next.js rules in `innovation-portal/.eslintrc.json`
- [ ] T005 [P] Configure Tailwind CSS with custom theme tokens in `innovation-portal/tailwind.config.ts` and `innovation-portal/src/app/globals.css`
- [ ] T006 Create `.env.example` with all required variables (`DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `UPLOAD_DIR`) in `innovation-portal/.env.example`

**Checkpoint**: Running `npm run dev` starts the dev server without errors

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure — database, auth, Multer, shared types, Zod schemas — that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Write full Prisma schema with all entities — `User`, `Idea`, `Attachment`, `StatusHistory`, plus NextAuth models (`Account`, `Session`, `VerificationToken`) — with enums `Role`, `IdeaStatus`, `Visibility` in `innovation-portal/prisma/schema.prisma`
- [ ] T008 Run initial Prisma migration to create PostgreSQL tables (`npx prisma migrate dev --name init`); verify with `npx prisma studio`
- [ ] T009 Create Prisma client singleton (prevents connection pool exhaustion in hot-reload) in `innovation-portal/src/lib/db.ts`
- [ ] T010 Configure NextAuth.js v5 with Credentials provider (email + bcrypt compare), `jwt` callback injecting `id` and `role`, `session` callback exposing them on `session.user` in `innovation-portal/src/lib/auth.ts`
- [ ] T011 Create Next.js middleware using NextAuth `auth` export to protect all routes except `/api/auth/**`, `_next`, `public` in `innovation-portal/middleware.ts`
- [ ] T012 [P] Create shared TypeScript types and enums (`Role`, `IdeaStatus`, `Visibility`, `IdeaWithRelations`, `PaginatedResponse`) in `innovation-portal/src/types/index.ts`
- [ ] T013 [P] Create Zod user validation schemas (`registerSchema`: email, password regex, name; `loginSchema`) in `innovation-portal/src/lib/validations/user.ts`
- [ ] T014 [P] Create Zod idea validation schemas (`ideaSubmitSchema`: title min 10/max 200, description min 50/max 5000, visibility default PUBLIC; `evaluateSchema`: status enum, feedback min 10) in `innovation-portal/src/lib/validations/idea.ts`
- [ ] T015 Configure Multer `diskStorage` with UUID filename, MIME-type `fileFilter` (PDF/DOC/DOCX/PNG/JPG), and 10 MB `fileSize` limit in `innovation-portal/src/lib/upload.ts`
- [ ] T016 Create root `layout.tsx` with HTML shell, Tailwind CSS import, and NextAuth `SessionProvider` wrapper in `innovation-portal/src/app/layout.tsx`
- [ ] T017 [P] Create reusable UI primitive components (`Button`, `Input`, `Label`, `Badge`, `Spinner`) in `innovation-portal/src/components/ui/`

**Checkpoint**: Foundation ready — Prisma connects, NextAuth config is valid, Multer is configured. User story implementation can now begin.

---

## Phase 3: User Story 1 — User Authentication (Priority: P1) 🎯 MVP

**Goal**: Users can register, log in, and log out. First registered user automatically becomes admin. Routes are protected.

**Independent Test**: Register a new account with compliant password → log in → verify `/dashboard` is accessible → log out → verify redirect to `/login` → verify accessing `/dashboard` redirects back to `/login`.

- [ ] T018 [US1] Implement `POST /api/auth/register` route: Zod validation → email uniqueness check → `userCount === 0` first-user-admin logic → `bcryptjs.hash(password, 12)` → `prisma.user.create` in `innovation-portal/src/app/api/auth/register/route.ts`
- [ ] T019 [US1] Configure NextAuth `[...nextauth]` route handler exporting `GET` and `POST` from `auth` in `innovation-portal/src/app/api/auth/[...nextauth]/route.ts`
- [ ] T020 [P] [US1] Create `RegisterForm` component: React Hook Form with Zod resolver, fields for name/email/password, client-side password strength error messages in `innovation-portal/src/components/forms/RegisterForm.tsx`
- [ ] T021 [P] [US1] Create `LoginForm` component: React Hook Form with Zod resolver, email/password fields, error message display in `innovation-portal/src/components/forms/LoginForm.tsx`
- [ ] T022 [US1] Create `/register` page: renders `RegisterForm`, redirects to `/dashboard` on success, redirects to `/login` if already authenticated in `innovation-portal/src/app/(auth)/register/page.tsx`
- [ ] T023 [US1] Create `/login` page: renders `LoginForm` with NextAuth `signIn`, redirects to `/dashboard` on success in `innovation-portal/src/app/(auth)/login/page.tsx`
- [ ] T024 [US1] Create `Navbar` component with app title, logged-in user name/role display, and `signOut` logout button in `innovation-portal/src/components/layout/Navbar.tsx`
- [ ] T025 [US1] Create root `page.tsx` that redirects authenticated users to `/dashboard` and unauthenticated users to `/login` in `innovation-portal/src/app/page.tsx`

**Checkpoint**: US1 fully functional — register, login, logout work independently. First user gets ADMIN role. All protected routes redirect to `/login` when unauthenticated.

---

## Phase 4: User Story 2 — Submit Ideas with Attachments (Priority: P1)

**Goal**: Authenticated users can submit ideas with title, description, optional visibility setting, and optional single file attachment (PDF/DOC/DOCX/PNG/JPG ≤ 10 MB).

**Independent Test**: Log in → navigate to `/ideas/new` → submit a valid idea with a PDF attachment and `PRIVATE` visibility → verify redirect to `/dashboard` → confirm idea appears in list with "Submitted" status.

- [ ] T026 [US2] Implement `POST /api/ideas` route: disable body parser, process multipart form via Multer, Zod validate text fields, save `Idea` + optional `Attachment` to DB in a Prisma transaction, return 201 with created idea in `innovation-portal/src/app/api/ideas/route.ts`
- [ ] T027 [US2] Create `IdeaSubmitForm` component: React Hook Form, title/description textarea, visibility radio (PUBLIC/PRIVATE), file input (client-side type+size pre-check), submission feedback in `innovation-portal/src/components/forms/IdeaSubmitForm.tsx`
- [ ] T028 [US2] Create `/ideas/new` page: server-side auth check, renders `IdeaSubmitForm`, redirects to `/dashboard` after successful submission in `innovation-portal/src/app/ideas/new/page.tsx`
- [ ] T029 [US2] Create `pagination` helper (offset calc) and `formatDate` utility in `innovation-portal/src/lib/utils.ts`

**Checkpoint**: US2 fully functional — idea submission with and without attachment works independently; file upload validation (type + size) returns correct errors.

---

## Phase 5: User Story 3 — View Ideas Dashboard (Priority: P2)

**Goal**: Authenticated users see a paginated, reverse-chronological dashboard of ideas filtered by visibility rules. Clicking an idea shows full details and triggers the SUBMITTED→UNDER_REVIEW auto-transition for admins.

**Independent Test**: Seed public + private ideas with different submitters → log in as regular user → verify only public ideas + own private are visible → log in as admin → verify all ideas visible → click an idea → verify detail page loads with submitter/date/attachment.

- [ ] T030 [US3] Implement `GET /api/ideas` route: auth check, visibility filter (admin = all; user = PUBLIC OR own), `createdAt DESC` ordering, paginated with `skip`/`take`, return `ideas[]` and `pagination` metadata in `innovation-portal/src/app/api/ideas/route.ts`
- [ ] T031 [P] [US3] Create `StatusBadge` component: color-coded pill per status (SUBMITTED=grey, UNDER_REVIEW=blue, ACCEPTED=green, REJECTED=red) in `innovation-portal/src/components/ideas/StatusBadge.tsx`
- [ ] T032 [P] [US3] Create `IdeaCard` component: displays title, submitter name, submission date, `StatusBadge`, visibility indicator, attachment icon if present in `innovation-portal/src/components/ideas/IdeaCard.tsx`
- [ ] T033 [US3] Create `IdeaList` component: maps ideas to `IdeaCard`, pagination controls (prev/next, page indicator), empty-state message when no ideas exist in `innovation-portal/src/components/ideas/IdeaList.tsx`
- [ ] T034 [US3] Create `/dashboard` page: server-side auth + visibility-filtered `GET /api/ideas` fetch, renders `IdeaList` with pagination, "Submit Idea" CTA button in `innovation-portal/src/app/dashboard/page.tsx`
- [ ] T035 [US3] Implement `GET /api/ideas/[id]` route: auth check, access control (public OR own OR admin), auto-transition SUBMITTED→UNDER_REVIEW inside Prisma transaction when admin views idea, return full idea with `statusHistory[]` and `attachment` in `innovation-portal/src/app/api/ideas/[id]/route.ts`
- [ ] T036 [US3] Implement `GET /api/ideas/[id]/attachment` download route: stream file from `uploads/` with `Content-Disposition: attachment` header, same access control as idea detail in `innovation-portal/src/app/api/ideas/[id]/attachment/route.ts`
- [ ] T037 [US3] Create `/ideas/[id]` detail page: displays title, description, submitter name ("Account Deleted" if null), date, visibility, `StatusBadge`, attachment download link in `innovation-portal/src/app/ideas/[id]/page.tsx`

**Checkpoint**: US3 fully functional — dashboard shows correct ideas per user role, pagination works, clicking idea shows details, admin visit triggers UNDER_REVIEW transition.

---

## Phase 6: User Story 4 — Track Idea Status (Priority: P2)

**Goal**: Users see the current status of each idea with color coding on dashboard and full status change history with admin feedback on the detail page.

**Independent Test**: View an idea that has been evaluated (ACCEPTED or REJECTED) → verify status badge is correct color → verify full status history (all transitions, timestamps, admin names, feedback) is visible → verify admin's latest feedback comments appear.

- [ ] T038 [US4] Create `StatusHistory` component: renders ordered list of status changes (old→new, admin name, timestamp, feedback text); handles null admin as "System" in `innovation-portal/src/components/ideas/StatusHistory.tsx`
- [ ] T039 [US4] Update `/ideas/[id]` detail page to render `StatusHistory` component below idea details, showing all entries from `idea.statusHistory[]`, and display latest admin feedback prominently in `innovation-portal/src/app/ideas/[id]/page.tsx`

**Checkpoint**: US4 fully functional — status is visible with colors everywhere, history and feedback are displayed on detail page.

---

## Phase 7: User Story 5 — Admin Evaluation Workflow (Priority: P3)

**Goal**: Admins can review ideas, accept or reject them with required feedback, override previous decisions, and promote users to admin. All changes are audit-trailed in StatusHistory.

**Independent Test**: Log in as admin → navigate to `/admin` → open an idea (verify UNDER_REVIEW auto-transition) → submit Accept decision with feedback → verify status and history update → change to Reject with new feedback → verify full history preserved → navigate to `/admin/users` → promote a user to admin.

- [ ] T040 [US5] Implement `PATCH /api/ideas/[id]` route: admin-only, Zod validate `{ status, feedback }` (feedback min 10 chars), update `Idea.status` + create `StatusHistory` entry in Prisma transaction, return updated idea in `innovation-portal/src/app/api/ideas/[id]/route.ts`
- [ ] T041 [P] [US5] Create `EvaluationForm` component: status selector (ACCEPTED/REJECTED/UNDER_REVIEW), required feedback textarea (min 10 chars), submit with loading state in `innovation-portal/src/components/forms/EvaluationForm.tsx`
- [ ] T042 [US5] Implement `PATCH /api/users/[id]` route: admin-only, validate `{ role }`, update `User.role` in DB, return updated user in `innovation-portal/src/app/api/users/[id]/route.ts`
- [ ] T043 [US5] Create `/admin` page: admin-only guard, fetches all ideas (no visibility filter) with status/pagination, renders ideas list with sort/filter options (by status), links to evaluation page in `innovation-portal/src/app/admin/page.tsx`
- [ ] T044 [US5] Create `/admin/[id]` evaluation page: fetches full idea with history, renders `StatusHistory`, renders `EvaluationForm`, posts to `PATCH /api/ideas/[id]`, refreshes page after save in `innovation-portal/src/app/admin/[id]/page.tsx`
- [ ] T045 [US5] Create `/admin/users` page: admin-only, fetches all users with roles, renders table with "Promote to Admin" button calling `PATCH /api/users/[id]` in `innovation-portal/src/app/admin/users/page.tsx`
- [ ] T046 [US5] Update `Navbar` component to show "Admin Panel" and "Manage Users" links visible only when `session.user.role === 'ADMIN'` in `innovation-portal/src/components/layout/Navbar.tsx`

**Checkpoint**: US5 fully functional — full evaluation workflow works end-to-end; status overrides are possible with audit trail preserved; admin user management works.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Security hardening, error handling, missing edge cases from spec, and production readiness

- [ ] T047 [P] Add global error boundary component and toast/notification system (success/error feedback for all async actions) in `innovation-portal/src/components/ui/Toast.tsx` and `innovation-portal/src/app/layout.tsx`
- [ ] T048 Handle "Account Deleted" submitter case in `IdeaCard` and `/ideas/[id]` page (display "Account Deleted" when `submitter` is null) in `innovation-portal/src/components/ideas/IdeaCard.tsx` and `innovation-portal/src/app/ideas/[id]/page.tsx`
- [ ] T049 [P] Review and harden Multer MIME detection — verify `fileFilter` rejects disguised extensions (validate `file.mimetype` not `file.originalname`) in `innovation-portal/src/lib/upload.ts`
- [ ] T050 [P] Verify all Zod schemas cover spec edge cases: password strength regex test, `feedback` required and min 10 chars for evaluations, visibility defaulting to PUBLIC in `innovation-portal/src/lib/validations/`
- [ ] T051 Add race-condition protection for first-admin registration (Prisma transaction with unique constraint) in `innovation-portal/src/app/api/auth/register/route.ts`
- [ ] T052 [P] Create database seed script with test users (`admin@example.com / Admin123!`, `user1@example.com / User1234!`) and 5 sample ideas in `innovation-portal/prisma/seed.ts`; add `"prisma": { "seed": "ts-node prisma/seed.ts" }` to `innovation-portal/package.json`
- [ ] T053 [P] Add all npm scripts (`dev`, `build`, `start`, `test`, `test:coverage`, `lint`, `typecheck`) to `innovation-portal/package.json`
- [ ] T054 Validate complete end-to-end flow per `quickstart.md`: run seed, verify all 5 user story acceptance scenarios manually, confirm auth redirects, file upload limits, and status transitions

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup          → no dependencies
Phase 2: Foundational   → depends on Phase 1 (BLOCKS all user stories)
Phase 3: US1 Auth       → depends on Phase 2
Phase 4: US2 Submit     → depends on Phase 2 (can run in parallel with Phase 3)
Phase 5: US3 Dashboard  → depends on Phase 2; integrates US1 session, US2 ideas data
Phase 6: US4 Status     → depends on Phase 5 (extends idea detail page)
Phase 7: US5 Admin      → depends on Phase 5; adds PATCH to routes created in US3
Final:   Polish         → depends on all user story phases
```

### User Story Dependencies

| Story | Blocks | Depends On | Independent Test? |
|-------|--------|------------|------------------|
| US1 (P1) | Forms login gate | Phase 2 only | ✅ Yes |
| US2 (P1) | Idea data for US3+ | Phase 2 only | ✅ Yes |
| US3 (P2) | Phase 6, 7 | Phase 2; benefits from US1+US2 data | ✅ Yes (with seeded data) |
| US4 (P2) | — | Phase 5 (extends detail page) | ✅ Yes (with seeded evaluated ideas) |
| US5 (P3) | — | Phase 5 (adds PATCH + admin pages) | ✅ Yes (standalone admin workflow) |

### Within Each Phase

1. Tasks with `[P]` in each phase can be started simultaneously
2. Models/schemas before services; services before route handlers; route handlers before pages
3. Commit after each task group or logical unit

---

## Parallel Opportunities

### Phase 2 — Foundational (after T007, T008, T009 complete)
```
T010 Configure NextAuth auth.ts          ← start when T009 done
T011 Create middleware.ts                ← start when T010 done
T012 [P] Create types/index.ts
T013 [P] Create validations/user.ts
T014 [P] Create validations/idea.ts
T015 Configure upload.ts (Multer)
T016 Create root layout.tsx              ← start when T010 done
T017 [P] Create UI primitive components
```
T012, T013, T014, T017 can all run simultaneously.

### Phase 3 — US1 (after T010, T011 complete)
```
T018 POST /api/auth/register             ← unblocked
T019 [...nextauth] route handler         ← unblocked
T020 [P] RegisterForm component
T021 [P] LoginForm component
```
T018, T019, T020, T021 can all run simultaneously.

### Phase 5 — US3 (after Phase 2 complete)
```
T030 GET /api/ideas route                ← unblocked
T031 [P] StatusBadge component
T032 [P] IdeaCard component
T035 GET /api/ideas/[id] route           ← unblocked
T036 GET /api/ideas/[id]/attachment      ← unblocked
```
T030, T031, T032, T035, T036 can all run simultaneously.

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete **Phase 1**: Setup
2. Complete **Phase 2**: Foundational (CRITICAL — blocks all stories)
3. Complete **Phase 3**: US1 Authentication
4. Complete **Phase 4**: US2 Idea Submission
5. **STOP and VALIDATE**: Users can register, log in, submit ideas — deliverable value
6. Continue to US3 → US4 → US5

### Incremental Delivery

| Milestone | Completed Phases | What's Deliverable |
|-----------|------------------|--------------------|
| MVP | 1 + 2 + 3 + 4 | Register, Login, Submit Idea |
| v0.2 | + 5 | Dashboard, Idea Details, Attachment Download |
| v0.3 | + 6 | Status History & Admin Feedback Visible |
| v1.0 | + 7 + Polish | Full Admin Evaluation Workflow |

### Parallel Team Strategy

With multiple developers — after Phase 2 completes:
- **Dev A**: Phase 3 (US1 Authentication)
- **Dev B**: Phase 4 (US2 Idea Submission)
- Both merge → **Dev A** continues Phase 5, **Dev B** starts Phase 6
- After Phase 5 merges → both work on Phase 7

---

## Task Count Summary

| Phase | Tasks | User Story |
|-------|-------|-----------|
| Phase 1: Setup | 6 | — |
| Phase 2: Foundational | 11 | — |
| Phase 3: US1 Authentication | 8 | US1 (P1) |
| Phase 4: US2 Idea Submission | 4 | US2 (P1) |
| Phase 5: US3 Dashboard | 8 | US3 (P2) |
| Phase 6: US4 Status Tracking | 2 | US4 (P2) |
| Phase 7: US5 Admin Evaluation | 7 | US5 (P3) |
| Final: Polish | 8 | — |
| **Total** | **54** | |

**Parallel opportunities identified**: 18 tasks marked `[P]` across all phases  
**MVP scope**: Phases 1 + 2 + 3 + 4 (29 tasks) — delivers register/login/submit workflow  
**Format validation**: All 54 tasks follow `- [ ] T### [P?] [Story?] Description with file path`
