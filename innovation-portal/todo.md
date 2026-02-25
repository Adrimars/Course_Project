# Innovation Portal — To-Do List

> **Legend**: `[ ]` Not started · `[/]` In progress · `[x]` Done

---

## Phase 0: Bug Fixes 🐛

### 🔴 Critical
- [x] **BUG-1**: Fix race condition in last-admin demotion
  - [x] Wrap count + update in serializable `$transaction` in `src/app/api/users/[id]/route.ts`

### 🟠 High
- [x] **BUG-2**: Fix MIME type validation — use `file-type` magic bytes
  - [x] In `src/app/api/ideas/route.ts`, detect MIME from buffer instead of `file.type`

- [x] **BUG-3**: Make auto-transition idempotent in SSR pages
  - [x] Fix `src/app/ideas/[id]/page.tsx`: use `updateMany` + conditional history create
  - [x] Fix `src/app/admin/[id]/page.tsx`: same pattern

### 🟡 Medium
- [x] **BUG-4**: Fix `.replace('_', ' ')` → `.replace(/_/g, ' ')` in `IdeaCard.tsx`
- [x] **BUG-5**: Admin status filter + pagination preserve query params
  - [x] Update `basePath` in `src/app/admin/page.tsx` to include status filter
- [x] **BUG-6**: Add status transition rules + `INSPECTING` status to validation schema
  - [x] Add `VALID_TRANSITIONS` map in `src/app/api/ideas/[id]/route.ts`
  - [x] Add `INSPECTING` to `IdeaStatusValues` in `src/lib/validations/idea.ts`
- [x] **BUG-7**: Fix pagination URL construction in `IdeaList.tsx`
  - [x] Add separator logic for `?` vs `&`

---

## Phase 1: Core Features 🚀

### 1.1 — Session Rewrite (sessionStorage-based per-tab auth)
- [ ] Replace NextAuth cookie sessions with sessionStorage token-based auth
- [ ] Create custom `useTabSession` hook
- [ ] Update middleware for header-based token reading
- [ ] Manual test: two tabs with different accounts

### 1.2 — RBAC: Inspector Role + Admin Panel
- [x] Add `INSPECTOR` to Prisma `Role` enum + migrate
- [x] Add `INSPECTING` to Prisma `IdeaStatus` enum + migrate
- [x] Update `src/types/index.ts` enums
- [x] Seed inspector user (`inspector@epam.com` / `Inspector123!`)
- [x] Document test credentials in README
- [x] Update role management API to support 3 roles
- [x] Inspector: see all ideas (incl. private), set INSPECTING mode
- [x] INSPECTING mode: hide from users, show in inspector's "My Ideas"
- [x] Admin: all inspector perms + grant/revoke roles
- [x] Update Navbar for role-specific links

### 1.3 — Dashboard Analytics
- [x] Remove individual idea listings from `/dashboard`
- [x] Add status aggregate query (`groupBy`)
- [x] Create `AnalyticsDashboard` component with percentage breakdowns
- [x] Style with progress bars / colored cards

### 1.4 — Notes System
- [x] Add `Note` model (personal + collaborative types) to Prisma schema
- [x] API: `POST/GET /api/ideas/[id]/notes`
- [x] Personal notes: only visible to author
- [x] Collaborative notes: visible to collaborators + inspectors + admins
- [x] UI: `NoteForm` + `NoteList` on idea detail page

### 1.5 — Task Assignment System
- [x] Add `Assignment` model to Prisma schema
- [x] API: `POST /api/ideas/[id]/assignments` (admin only)
- [x] API: `PATCH /api/assignments/[id]` (accept/decline)
- [x] Assigned ideas appear in user's "My Ideas"
- [x] UI: assignment cards + accept/decline buttons

### 1.6 — Project Join Requests
- [x] Add `JoinRequest` model to Prisma schema + migration
- [x] API: `POST /api/ideas/[id]/join-request`
- [x] API: `GET /api/ideas/[id]/join-request` (own status / all pending for owner)
- [x] API: `PATCH /api/join-requests/[id]` (approve/reject by owner or admin)
- [x] "Request to Join" button on idea detail (`JoinRequestButton` component)
- [x] Join requests panel for idea owner / admin (`JoinRequestsPanel` component)
- [x] On approve: auto-creates Assignment so user sees idea in "My Ideas → Assigned"

### 1.7 — "My Ideas" Tab
- [x] Create `/my-ideas` page
- [x] USER: own UNDER_REVIEW ideas + assigned ideas
- [x] INSPECTOR/ADMIN: additionally INSPECTING ideas
- [x] Add "My Ideas" link to Navbar

### 1.8 — Search & Filter
- [x] Add search bar (title + description `ILIKE`)
- [x] Filter dropdowns: status, category, visibility
- [x] Create `SearchAndFilter` component
- [x] Update `GET /api/ideas` with `search`, `status`, `category` params
- [x] Preserve filters in URL query params
- [x] Browsable `/ideas` page with search & filter

---

## Phase 2: Smart Submission Forms 📝
- [x] Dynamic form fields based on category
  - [x] `CATEGORY_FIELDS` config in `src/lib/validations/idea.ts` (6 categories × 2 fields each)
  - [x] Dynamic field rendering in `IdeaSubmitForm` based on `watch('category')`
  - [x] `metadata Json?` column added to `Idea` model + migration `20260225091352_phase2_idea_metadata`
  - [x] `POST /api/ideas` stores metadata JSON; detail page renders category-specific fields
- [x] Auto-suggestions · Form templates
  - [x] `CATEGORY_TEMPLATES` per-category starter templates (title + description boilerplate)
  - [x] "Load template" button appears when a category is selected
- [x] Character count indicators (title: X/200, description: X/5000)
- [x] Auto-save draft to `localStorage` (clears on successful submit, restores on page return)
- [x] Real-time validation feedback (`mode: 'onChange'` in React Hook Form)

## Phase 3: Multi-Media Support 🎬
- [ ] Image/video uploads · Media gallery · Thumbnails

## Phase 4: Draft Management 📋
- [ ] DRAFT status · Auto-save · "My Drafts" section

## Phase 5: Multi-Stage Review 🔄
- [ ] Review stages pipeline · Multi-reviewer · Stage-gate approvals

## Phase 6: Blind Review 🕶️
- [ ] Anonymous submissions · Hidden identities · Post-decision reveal

## Phase 7: Scoring System ⭐
- [ ] Scoring rubric · Multi-dimension scoring · Leaderboard

---

*Last updated: 2026-02-25*
