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
- [x] Replace NextAuth cookie sessions with sessionStorage token-based auth
- [x] Create custom `useTabSession` hook
- [x] Update middleware for header-based token reading
- [x] Manual test: two tabs with different accounts

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
- [x] Multiple file attachments per idea (up to 5 files)
  - [x] Remove `@unique` on `Attachment.ideaId`; add `displayOrder Int @default(0)`
  - [x] Add `videoLinks Json?` to `Idea` model
  - [x] Migration `20260225102703_phase3_multi_media` applied
  - [x] `MAX_FILES_PER_IDEA = 5`, `MAX_AGGREGATE_SIZE = 50 MB`, `MAX_SINGLE_FILE_SIZE = 10 MB` exports in `upload.ts`
  - [x] `POST /api/ideas`: multi-file via `formData.getAll('attachments')`, per-file + aggregate size checks, magic-byte MIME validation per file
  - [x] All Prisma queries updated: `attachment` → `attachments` (list pages, detail pages, API routes)
  - [x] Backward-compat shim: `GET /api/ideas/[id]/attachment` returns first attachment
  - [x] New per-attachment route: `GET /api/ideas/[id]/attachments/[attachmentId]`
- [x] Video links (YouTube / Vimeo embed)
  - [x] `videoLinkSchema` + `VideoLinkInput` in `src/lib/validations/idea.ts` (max 3 links)
  - [x] `VideoEmbed` component with `getEmbedUrl()` for both YouTube and Vimeo
  - [x] `POST /api/ideas` parses and stores `videoLinks` JSON
- [x] Image gallery preview
  - [x] `MediaGallery` component: responsive grid, click-to-lightbox, lazy loading
- [x] Expanded MIME types: PPTX, XLSX, MP4
  - [x] `ALLOWED_MIME_TYPES` updated in `upload.ts`
- [x] `AttachmentList` component: non-image files with MIME icons + download links
- [x] `IdeaSubmitForm` rewritten: multi-file input, video link manager, aggregate size display
- [x] `IdeaCard` updated: shows attachment count badge
- [x] TypeScript clean — zero `tsc --noEmit` errors after `prisma generate`
- [x] Unit tests: expanded MIME types + limit constants (`tests/unit/upload/upload.test.ts`)
- [x] Integration tests: multi-file validation, aggregate size, video link validation (`tests/integration/api/ideas.test.ts`)
- [x] All 188 tests passing

## Phase 4: Draft Management 📋 ✅
- [x] Add `DRAFT` to `IdeaStatus` Prisma enum + `20260225120000_phase4_draft_status` migration
- [x] Update `src/types/index.ts` and `src/lib/validations/idea.ts` (add `draftSaveSchema`)
- [x] `GET /api/ideas` excludes DRAFTs from all listings (owners must use `/ideas/[id]` directly)
- [x] `POST /api/ideas` supports `isDraft=true` flag (relaxed validation, status → DRAFT)
- [x] `GET /api/ideas/[id]` — DRAFT only accessible by owner (404 for everyone else)
- [x] `PATCH /api/ideas/[id]` — Path C: draft field update; Path D: submit draft with full validation
- [x] `DELETE /api/ideas/[id]` — owner can delete their own DRAFTs
- [x] `StatusBadge` — DRAFT shows yellow badge
- [x] `Badge.tsx` — extended to support named color variants
- [x] `IdeaSubmitForm` — "Save as Draft" + "Submit Idea" dual-action buttons; edit mode via `draftId` prop
- [x] `src/app/my-ideas/page.tsx` — "My Drafts" tab (status=DRAFT filter)
- [x] `src/app/ideas/[id]/page.tsx` — DRAFT access control + yellow banner with `DraftActions`
- [x] `src/components/ideas/DraftActions.tsx` — Edit / Submit / Delete actions for draft owner
- [x] `src/app/ideas/[id]/edit/page.tsx` — Draft edit page (server component, loads draft into form)
- [x] `src/components/forms/EvaluationForm.tsx` — Admin evaluation form (pre-existing missing component)
- [x] `AnalyticsDashboard` — DRAFT added to `STATUS_META` record

## Phase 5: Multi-Stage Review 🔄
- [ ] Review stages pipeline · Multi-reviewer · Stage-gate approvals

## Phase 6: Blind Review 🕶️
- [ ] Anonymous submissions · Hidden identities · Post-decision reveal

## Phase 7: Scoring System ⭐
- [ ] Scoring rubric · Multi-dimension scoring · Leaderboard

---

*Last updated: 2026-02-25 — Phase 4 complete*
