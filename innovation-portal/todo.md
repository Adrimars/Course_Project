# Innovation Portal — To-Do List

> **Legend**: `[ ]` Not started · `[/]` In progress · `[x]` Done

---

## Phase 0: Bug Fixes 🐛

### 🔴 Critical
- [ ] **BUG-1**: Fix race condition in last-admin demotion
  - [ ] Wrap count + update in serializable `$transaction` in `src/app/api/users/[id]/route.ts`

### 🟠 High
- [ ] **BUG-2**: Fix MIME type validation — use `file-type` magic bytes
  - [ ] In `src/app/api/ideas/route.ts`, detect MIME from buffer instead of `file.type`

- [ ] **BUG-3**: Make auto-transition idempotent in SSR pages
  - [ ] Fix `src/app/ideas/[id]/page.tsx`: use `updateMany` + conditional history create
  - [ ] Fix `src/app/admin/[id]/page.tsx`: same pattern

### 🟡 Medium
- [ ] **BUG-4**: Fix `.replace('_', ' ')` → `.replace(/_/g, ' ')` in `IdeaCard.tsx`
- [ ] **BUG-5**: Admin status filter + pagination preserve query params
  - [ ] Update `basePath` in `src/app/admin/page.tsx` to include status filter
- [ ] **BUG-6**: Add status transition rules + `INSPECTING` status to validation schema
  - [ ] Add `VALID_TRANSITIONS` map in `src/app/api/ideas/[id]/route.ts`
  - [ ] Add `INSPECTING` to `IdeaStatusValues` in `src/lib/validations/idea.ts`
  - [ ] Update test: `tests/unit/validations/idea.test.ts`
- [ ] **BUG-7**: Fix pagination URL construction in `IdeaList.tsx`
  - [ ] Add separator logic for `?` vs `&`

---

## Phase 1: Core Features 🚀

### 1.1 — Session Rewrite (sessionStorage-based per-tab auth)
- [ ] Replace NextAuth cookie sessions with sessionStorage token-based auth
- [ ] Create custom `useTabSession` hook
- [ ] Update middleware for header-based token reading
- [ ] Manual test: two tabs with different accounts

### 1.2 — RBAC: Inspector Role + Admin Panel
- [ ] Add `INSPECTOR` to Prisma `Role` enum + migrate
- [ ] Add `INSPECTING` to Prisma `IdeaStatus` enum + migrate
- [ ] Update `src/types/index.ts` enums
- [ ] Seed inspector user (`inspector@example.com` / `Inspector123!`)
- [ ] Document test credentials in README
- [ ] Update role management API to support 3 roles
- [ ] Inspector: see all ideas (incl. private), edit/delete files, set INSPECTING mode
- [ ] INSPECTING mode: hide from users, show in inspector's "My Ideas"
- [ ] Admin: all inspector perms + grant/revoke roles
- [ ] Update Navbar for role-specific links

### 1.3 — Dashboard Analytics
- [ ] Remove individual idea listings from `/dashboard`
- [ ] Add status aggregate query (`groupBy`)
- [ ] Create `AnalyticsDashboard` component with percentage breakdowns
- [ ] Style with progress bars / colored cards

### 1.4 — Notes System
- [ ] Add `Note` model (personal + collaborative types) to Prisma schema
- [ ] API: `POST/GET /api/ideas/[id]/notes`
- [ ] Personal notes: only visible to author
- [ ] Collaborative notes: visible to collaborators + inspectors + admins
- [ ] UI: `NoteForm` + `NoteList` on idea detail page

### 1.5 — Task Assignment System
- [ ] Add `Assignment` model to Prisma schema
- [ ] API: `POST /api/ideas/[id]/assignments` (admin only)
- [ ] API: `PATCH /api/assignments/[id]` (accept/decline)
- [ ] Assigned ideas appear in user's "My Ideas"
- [ ] UI: assignment cards + accept/decline buttons

### 1.6 — Project Join Requests
- [ ] Add `JoinRequest` model or extend Assignment
- [ ] API: `POST /api/ideas/[id]/join-request`
- [ ] API: `PATCH /api/join-requests/[id]` (approve/reject)
- [ ] "Request to Join" button on idea detail
- [ ] Pending requests in owner's "My Ideas"

### 1.7 — "My Ideas" Tab
- [ ] Create `/my-ideas` page
- [ ] USER: own UNDER_REVIEW ideas + assigned ideas
- [ ] INSPECTOR/ADMIN: additionally INSPECTING ideas
- [ ] Add "My Ideas" link to Navbar

### 1.8 — Search & Filter
- [ ] Add search bar (title + description `ILIKE`)
- [ ] Filter dropdowns: status, category, visibility
- [ ] Create `SearchAndFilter` component
- [ ] Update `GET /api/ideas` with `search`, `status`, `category` params
- [ ] Preserve filters in URL query params

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
