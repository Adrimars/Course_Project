# Specification Quality Checklist: Innovation Portal

**Purpose**: Full spec quality audit (completeness, clarity, consistency) + measurable success criteria validation + mandatory gating checks for RBAC, visibility, status transitions, and file security + constitution compliance
**Created**: 2026-02-24
**Feature**: [spec.md](../spec.md)
**Depth**: Standard | **Audience**: Reviewer (PR/planning gate) | **Run**: 2026-02-24 session

---

> **Legend**:
> 🔴 **GATE** — Mandatory gating check; fail = block planning/implementation
> ⚠️ **RISK** — High-impact item; strongly recommended to resolve before planning
> `[Spec §X]` — References existing requirement; checking its quality
> `[Gap]` — Requirement is missing entirely
> `[Ambiguity]` — Requirement exists but is unclear or unmeasurable
> `[Conflict]` — Two requirements contradict each other
> `[Assumption]` — Decision assumed, not explicitly stated

---

## 🔴 GATE 1: RBAC & Admin Promotion Rules

*Fail any item = block planning until resolved*

- [x] CHK001 — **Resolved**: First-user-becomes-admin applies to the very first registered user globally (first row in the `User` table). Race condition is handled by an atomic Prisma `$transaction` with serializable isolation that checks `COUNT(*) = 0` before inserting; only one concurrent registration wins `ADMIN`, the rest default to `USER`. See `spec.md §Resolved Specification Gaps → GATE 1 CHK001`.
- [x] CHK002 — **Resolved**: Any `ADMIN` user can promote any `USER`-role account. UI flow: `/admin/users` → "Promote to Admin" button → confirmation dialog → immediate role update with success toast. Action is reversible (admins can demote other admins) subject to the last-admin safeguard. Admins cannot demote themselves. See `spec.md §GATE 1 CHK002`.
- [x] CHK003 — **Resolved**: FR-011a added — before any demotion or account deletion, the system verifies at least one other active `ADMIN` will remain. If target is the only admin, operation is rejected with HTTP 409 and message "Cannot remove the last administrator." See `spec.md §GATE 1 CHK003`.
- [x] CHK004 — **Resolved**: Full authorization matrix defined — status change (`PATCH /api/ideas/[id]`), user role change (`PATCH /api/admin/users/[id]/role`), user list (`GET /api/admin/users`), and all `/admin/**` routes all require `ADMIN` role; regular users receive 403. See `spec.md §GATE 1 CHK004`.
- [x] CHK005 — **Resolved**: Admin panel enumerated as three dedicated routes under `/admin`: overview (`/admin`), user management (`/admin/users`), all ideas (`/admin/ideas`). All protected by Next.js `middleware.ts` checking `session.user.role === 'ADMIN'`. See `spec.md §GATE 1 CHK005`.

---

## 🔴 GATE 2: Visibility & Access Control Rules

*Fail any item = block planning until resolved*

- [x] CHK006 — **Resolved**: FR-007b added — visibility is an enum `PUBLIC | PRIVATE`; default is `PUBLIC`, set at database level (`@default(PUBLIC)`) and enforced in the API layer when field is omitted. Explicitly stated in spec, not left to implementation. See `spec.md §GATE 2 CHK006`.
- [x] CHK007 — **Resolved**: FR-007c added — submitter MAY change visibility at any time via a toggle on the idea detail page; only the original submitter can change it (matched by `submitterId`); admins cannot change others' visibility; effect is synchronous (DB update completes before API response returns). See `spec.md §GATE 2 CHK007`.
- [x] CHK008 — **Resolved**: FR-007d added — direct URL access to a private idea the user doesn't own returns HTTP 403; Next.js page redirects to `/dashboard` with flash message "You do not have access to this idea." Applies to both the page route and the `GET /api/ideas/[id]` endpoint. See `spec.md §GATE 2 CHK008`.
- [x] CHK009 — **Resolved**: FR-005a added — files are served exclusively via authenticated API route `GET /api/ideas/[id]/attachment`; upload directory is NOT a static asset; API applies same visibility + ownership check as FR-007d before streaming; storage path (UUID) is never exposed in API responses. See `spec.md §GATE 2 CHK009`.
- [x] CHK010 — **Resolved**: FR-007a and US3 are confirmed consistent — both apply the same rule (PUBLIC + own PRIVATE for users; all for admins) via the same Prisma `WHERE` clause logic. US3 scenario 2 (admin sees all) bypasses the filter when `role === 'ADMIN'`. No contradiction. See `spec.md §GATE 2 CHK010`.

---

## 🔴 GATE 3: Status Transition Rules & Audit Trail

*Fail any item = block planning until resolved*

- [x] CHK011 — **Resolved**: Full transition graph defined — automatic: `SUBMITTED → UNDER_REVIEW` (first admin view); standard: `UNDER_REVIEW → ACCEPTED`, `UNDER_REVIEW → REJECTED`; admin override: any status → any status (with required feedback). No transition is permanently forbidden for manual admin actions. See `spec.md §GATE 3 CHK011`.
- [x] CHK012 — **Resolved**: FR-008a clarified — the `SUBMITTED → UNDER_REVIEW` transition fires ONLY when `status = 'SUBMITTED'` at the moment of admin view, implemented as a conditional Prisma update (`WHERE status = 'SUBMITTED'`). Subsequent admin views of a non-`SUBMITTED` idea produce no transition or duplicate `StatusHistory` entry. Idempotent by design. See `spec.md §GATE 3 CHK012`.
- [x] CHK013 — **Resolved**: Submitter sees full history for their own idea (all fields including admin identity). Admins see history for any idea. Regular users who are not the submitter see only the current status badge, not the history timeline. See `spec.md §GATE 3 CHK013`.
- [x] CHK014 — **Resolved**: Feedback comments are required for ALL manual admin status changes. The automatic `SUBMITTED → UNDER_REVIEW` system transition stores "Idea opened for review" (system-generated, no admin input). All admin-initiated transitions require non-empty, non-whitespace feedback before the form can be submitted. Resolves the conflict between FR-009 and FR-010. See `spec.md §GATE 3 CHK014`.
- [x] CHK015 — **Resolved**: StatusHistory timeline shows per entry: (1) timestamp `MMM DD, YYYY HH:mm`, (2) actor name (admin display name or "System"), (3) old status badge, (4) new status badge, (5) full feedback comments text. All five fields displayed to submitter and admins. See `spec.md §GATE 3 CHK015`.
- [x] CHK016 — **Resolved**: FR-010a added — feedback comments must be 1–2000 characters (post-trim). Empty/whitespace submissions blocked client-side (disabled button) and server-side (400 Bad Request). Exceeding 2000 chars returns specific error message. See `spec.md §GATE 3 CHK016`.

---

## 🔴 GATE 4: File Upload Security Requirements

*Fail any item = block planning until resolved*

- [x] CHK017 — **Resolved**: FR-005b added — MIME type validation is performed server-side using magic-byte inspection (e.g., the `file-type` npm library), NOT file extension or `Content-Type` header. Allowed types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/png`, `image/jpeg`. Invalid type returns HTTP 422 with specific message. See `spec.md §GATE 4 CHK017`.
- [x] CHK018 — **Resolved**: FR-005c added — files are stored using UUID v4 filenames; original filename stored only in `Attachment.originalName` DB field, never used as a path. Upload directory is a flat `/uploads/` directory; no user-input-derived sub-directories. All path separators stripped from any filename input. Path traversal prevented by design. See `spec.md §GATE 4 CHK018`.
- [x] CHK019 — **Resolved**: FR-005a (CHK009 resolution) formalises authenticated-API-only access. `next.config.js` must NOT expose the uploads directory as a static asset. The uploads directory must NOT be inside `public/`. Directly links to CHK009 resolution. See `spec.md §GATE 4 CHK019`.
- [x] CHK020 — **Resolved**: When submitter is deleted — file retained, `Idea.submitterId` set to NULL (Prisma `onDelete: SetNull`), file downloadable by admins. When idea reaches terminal status (`ACCEPTED`/`REJECTED`) — file retained indefinitely for audit. No automatic deletion in MVP. Explicit deletion is out of scope for Phase 1. See `spec.md §GATE 4 CHK020`.
- [x] CHK021 — **Resolved**: 10MB limit enforced at both layers. Client: `file.size > 10 * 1024 * 1024` check before upload initiates, inline error shown. Server: Multer `limits: { fileSize: 10 * 1024 * 1024 }` returns HTTP 413 with `{ error: "File size exceeds 10MB limit." }` on bypass attempt. See `spec.md §GATE 4 CHK021`.

---

## Requirement Completeness

- [x] CHK022 — **Resolved**: No real-time notifications in MVP (email out of scope, WebSocket out of scope). SC-007 revised: status changes visible on manual page refresh. UI displays static note "refresh to see the latest." Formally defined, not left ambiguous. See `spec.md §Resolved Gaps CHK022`.
- [x] CHK023 — **Resolved**: FR-016 added — formal pagination requirement: server-side, 20 ideas per page, total count displayed, current page in URL (`?page=N`, default `?page=1`), Previous/Next navigation controls disabled at boundaries, page indicator ("Page 2 of 7"). See `spec.md §Resolved Gaps CHK023`.
- [x] CHK024 — **Resolved**: Idea detail page layout defined with 7 ordered sections: (1) title + status badge, (2) metadata row, (3) description, (4) attachment, (5) visibility toggle (submitter only), (6) status history (submitter + admin only), (7) admin evaluation panel (admin only). See `spec.md §Resolved Gaps CHK024`.
- [x] CHK025 — **Resolved**: US5 scenario 9 added — "Given I am an admin on `/admin/users`, When I click Promote on a USER-role account and confirm, Then role becomes ADMIN immediately, button changes to Demote, success notification shown." Scenario for demote also defined subject to CHK003 safeguard. See `spec.md §Resolved Gaps CHK025`.
- [x] CHK026 — **Resolved**: FR-003 extended — concurrent sessions permitted in MVP; on expiry user is silently redirected to `/login`; explicit logout via NextAuth `signOut()` immediately invalidates session token server-side; forced logout from admin panel is out of scope for Phase 1. See `spec.md §Resolved Gaps CHK026`.

---

## Requirement Clarity

- [x] CHK027 — **Resolved**: Status badge colors specified with Tailwind CSS classes — `SUBMITTED`: blue (`bg-blue-100 text-blue-800`); `UNDER_REVIEW`: amber (`bg-amber-100 text-amber-800`); `ACCEPTED`: green (`bg-green-100 text-green-800`); `REJECTED`: red (`bg-red-100 text-red-800`). Not left to implementation discretion. See `spec.md §Resolved Gaps CHK027`.
- [x] CHK028 — **Resolved**: Visibility change to PRIVATE is **synchronous** — Prisma `update` completes before API response is returned. The next read by any non-owner non-admin returns no result for that idea. No eventual-consistency window. See `spec.md §Resolved Gaps CHK028`.
- [x] CHK029 — **Resolved**: "Last save wins" implemented via optimistic locking on `Idea.updatedAt`. PATCH payload must include the `updatedAt` value the admin loaded. Server performs conditional update `WHERE id = ? AND updatedAt = ?`; if 0 rows affected, returns HTTP 409 Conflict with current `updatedAt` and error message. See `spec.md §Resolved Gaps CHK029`.
- [x] CHK030 — **Resolved**: "Admin panel" is a dedicated Next.js page section rooted at `/admin` (NOT a modal/sidebar/overlay). Three sub-routes: `/admin`, `/admin/users`, `/admin/ideas`. All protected by `middleware.ts`. Consistent across FR-011, FR-010, and CHK005 definition. See `spec.md §Resolved Gaps CHK030`.
- [x] CHK031 — **Resolved**: US2 scenario 7 added — "Given on submission page, When I enter a title < 10 chars or description < 50 chars, Then I see inline validation errors 'Title must be at least 10 characters' / 'Description must be at least 50 characters' and form cannot submit." Min-length constraints now independently testable via US2. See `spec.md §Resolved Gaps CHK031`.

---

## Requirement Consistency

- [x] CHK032 — **Resolved**: US4 scenario 6 added — "Given an admin has opened my idea for the first time, When I view the updated idea on dashboard, Then status shows 'Under Review' with amber badge." All four statuses now represented in US4. See `spec.md §Resolved Gaps CHK032`.
- [x] CHK033 — **Resolved**: Admin all-ideas rule is consistent across FR-007a (omits visibility filter for ADMIN), US3 scenario 2 ("admin sees all ideas — both public and private"), and US5 scenario 8 ("admin can see all ideas regardless of status"). Same Prisma query path, no contradiction. See `spec.md §Resolved Gaps CHK033`.
- [x] CHK034 — **Resolved**: Password requirements are identical in FR-001 and the Security NFR section: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character. FR-001 is the canonical definition; NFR references it. No discrepancy. See `spec.md §Resolved Gaps CHK034`.
- [x] CHK035 — **Resolved**: FR-007 ("dashboard listing all ideas") is explicitly qualified by FR-007a — "all ideas" means "all ideas the authenticated user is authorized to see under visibility rules." FR-007 defines the dashboard feature; FR-007a defines the filter. No conflict. Implementation applies FR-007a's WHERE clause on top of FR-007's query. See `spec.md §Resolved Gaps CHK035`.

---

## Acceptance Criteria & Success Criteria Quality

- [x] CHK036 — **Resolved**: SC-007 revised — "status changes visible to submitter on manual page refresh; no polling or push required in MVP." Measurement: after admin changes status, submitter loads page cold in separate session; new status appears in one render cycle. See `spec.md §Resolved Gaps CHK036`.
- [x] CHK037 — **Resolved**: SC-008 revised — "50 concurrent users with p95 API response time ≤ 2 000 ms for `GET /api/ideas`, measured under 50 req/s sustained for 60 seconds (k6/Artillery). p95 staying ≤ 2 000 ms throughout = no degradation." See `spec.md §Resolved Gaps CHK037`.
- [x] CHK038 — **Resolved**: SC-003 revised — "dashboard loads < 2 s: warm DB pool, 100-idea dataset (first page of 20), simulated 10 Mbps, server-side render ≤ 500 ms; cold-start renders excluded." See `spec.md §Resolved Gaps CHK038`.
- [x] CHK039 — **Resolved**: SC-009 satisfied when all 10 enumerated inputs are validated: (1) reg email, (2) reg password, (3) login email, (4) login password, (5) idea title, (6) description, (7) category, (8) visibility, (9) feedback comments, (10) file attachment (MIME + size). See `spec.md §Resolved Gaps CHK039`.
- [x] CHK040 — **Resolved**: SC-010 has 6 explicit pass/fail steps: register → login → submit idea + attachment → admin opens (auto Under Review) → admin accepts with feedback → submitter refreshes and sees Accepted + comments. Any error = FAIL. See `spec.md §Resolved Gaps CHK040`.
- [x] CHK041 — **Resolved**: Traceability: US1→SC-001,SC-006; US2→SC-002,SC-005,SC-009; US3→SC-003,SC-006; US4→SC-007; US5→SC-004,SC-010. All 5 user stories trace to ≥1 measurable success criterion. See `spec.md §Resolved Gaps CHK041`.

---

## Scenario & Edge Case Coverage

- [x] CHK042 — **Resolved**: A non-admin user who directly navigates to an admin-only URL (e.g., `/admin`, `/admin/users`) receives a `403 Forbidden` response and is redirected to `/dashboard` with an "Access denied" error message. This is enforced by the Next.js middleware (`middleware.ts`) which checks `session.user.role === 'ADMIN'` for all `/admin/**` routes. [Gap, Security]
- [x] CHK043 — **Resolved**: If an admin's session expires while they are on the evaluation page and they attempt to submit the evaluation, the `PATCH /api/ideas/[id]` route returns `401 Unauthorized`. The partially completed evaluation form data is **not saved** (no server-side persistence occurs until explicit submission). The admin is redirected to `/login` on their next navigation. This is an acceptable trade-off for Phase 1 MVP; Phase 4 (Draft Management) may address auto-save patterns. [Gap, Exception Flow]
- [x] CHK044 — **Resolved**: When a submitter's account is deleted, the associated ideas are **not deleted** (Prisma `onDelete: SetNull` on `Idea.submitterId`). Orphaned ideas: (1) retain their current `status` and `visibility` unchanged; (2) display "Account Deleted" in place of the submitter name on all views; (3) remain fully accessible and evaluatable by admins; (4) remain visible to other users per the existing visibility rules (`PUBLIC` ideas remain public). [Ambiguity, Spec §Edge Cases]
- [x] CHK045 — **Resolved**: For Phase 1 MVP, if the user closes the browser or navigates away before clicking "Submit", **no data is saved** — the partially filled form is discarded. This is explicit in the Out of Scope section: "Draft saving before submission — submitter can only discard or submit; no partial save". The edge case "What happens when user navigates away during file upload?" is addressed: upload is cancelled and submission is not saved. Phase 4 (Draft Management) will introduce explicit draft saving as a new `DRAFT` status. [Gap, Edge Case]

---

## Non-Functional Requirements

- [x] CHK046 — **Resolved**: Accessibility requirement updated to **WCAG 2.1 Level AA**. Minimum requirements: `<label>` or `aria-label` on all inputs; full keyboard navigation; color contrast ≥ 4.5:1; status badges include text (not color alone); errors associated via `aria-describedby`. See `spec.md §Resolved Gaps CHK046`.
- [x] CHK047 — **Resolved**: Breakpoints defined using Tailwind CSS — mobile ≤ 767px (single-column), tablet 768–1023px (two-column), desktop ≥ 1024px (full multi-column). Not left unquantified. See `spec.md §Resolved Gaps CHK047`.
- [x] CHK048 — **Resolved**: Three concrete transaction scenarios enumerated: (1) idea submission + attachment INSERT, (2) status change UPDATE + StatusHistory INSERT, (3) user registration + role assignment. All wrapped in Prisma `$transaction`. See `spec.md §Resolved Gaps CHK048`.
- [x] CHK049 — **Resolved**: "Session recovery" means redirect to `/login?callbackUrl=<url>` on expired/invalid token. No silent refresh, no action replay. After login, NextAuth redirects to `callbackUrl`. See `spec.md §Resolved Gaps CHK049`.

---

## Constitution Compliance

- [x] CHK050 — **Resolved**: All 5 user stories (US1–US5) are fully specified with acceptance scenarios in this spec before any implementation begins. `plan.md`, `data-model.md`, `tasks.md`, and `contracts/` complete the documentation-first artefact set. Documentation-First principle satisfied. See `spec.md §Resolved Gaps CHK050`.
- [x] CHK051 — **Resolved**: Quality gates delegated to `plan.md` (Technical Standards) and `tasks.md` (quality phase tasks): ESLint `@typescript-eslint/recommended` (zero errors), TypeScript `"strict": true`, 80% line coverage via Jest + RTL, code review approval required. See `spec.md §Resolved Gaps CHK051`.
- [x] CHK052 — **Resolved**: Explicitly a **monolithic Next.js application** (single deployable). Logical service separation: auth (`src/lib/auth.ts`), file (`src/lib/upload.ts`), idea (`src/lib/ideas.ts`). Microservices are a post-MVP concern. Deliberate Phase 1 design decision documented. See `spec.md §Resolved Gaps CHK052`.
- [x] CHK053 — **Resolved**: All four Security-First layers confirmed: (1) authentication — FR-002, NextAuth.js + bcrypt min 10 rounds; (2) authorization — FR-011, RBAC middleware, CHK004 matrix; (3) input validation — FR-012, Zod schemas on all API routes; (4) data protection — FR-001 bcrypt, FR-005b server-side MIME, FR-005c UUID storage. See `spec.md §Resolved Gaps CHK053`.
- [x] CHK054 — **Resolved**: Test coverage defined per user story: US1 (unit+integration+E2E), US2 (unit+integration+E2E), US3 (integration), US4 (integration), US5 (E2E = SC-010 scenario). Minimum 80% line coverage across all source files. See `spec.md §Resolved Gaps CHK054`.

---

## Dependencies & Assumptions

- [x] CHK055 — **Resolved**: `check-prerequisites.ps1` script verifies PostgreSQL reachability at `DATABASE_URL` and confirms Prisma schema can be applied. `README.md` MUST include a Prerequisites section (Node.js ≥ 18, PostgreSQL ≥ 14, `.env.example` → `.env`, `npx prisma migrate dev`). Not a purely implicit assumption. See `spec.md §Resolved Gaps CHK055`.
- [x] CHK056 — **Resolved**: UI framework is **Tailwind CSS v3** (firm dependency, not "or similar"). Project MUST include `tailwind.config.js`, `postcss.config.js`, and Tailwind directives in global CSS. No alternative acceptable without spec change. See `spec.md §Resolved Gaps CHK056`.
- [x] CHK057 — **Resolved**: Local filesystem storage documented as a known MVP limitation: files not persisted across ephemeral deployments; lost on server replacement without persistent volume. Accepted for 8.5-hour bootcamp scope. Production upgrade path: S3-compatible adapter in Phase 2 (no API contract changes). See `spec.md §Resolved Gaps CHK057`.

---

## Summary

**Total items**: 57  
**Mandatory gating checks (🔴 GATE)**: 21 (CHK001–CHK021)  
**Traceability coverage**: 100%  
**Status**: ✅ ALL ITEMS RESOLVED — 0 incomplete

**Resolved in this session (2026-02-24)**:
- ✅ GATE 1 — RBAC & Admin Promotion Rules (CHK001–CHK005): race condition handling, promotion UI, last-admin safeguard, auth matrix, admin panel routes
- ✅ GATE 2 — Visibility & Access Control (CHK006–CHK010): enum/default, post-submission toggle, private URL protection, attachment auth, FR-007a/US3 consistency
- ✅ GATE 3 — Status Transitions & Audit Trail (CHK011–CHK016): transition graph, idempotency, history visibility, feedback requirement, display fields, char limits
- ✅ GATE 4 — File Upload Security (CHK017–CHK021): server-side MIME, UUID paths, auth-only serving, retention policy, dual-layer size enforcement
- ✅ Completeness (CHK022–CHK026): in-app notifications, formal pagination, detail page layout, promotion US, session management
- ✅ Clarity (CHK027–CHK031): status colors, sync visibility, optimistic locking, admin panel definition, min-length in US2
- ✅ Consistency (CHK032–CHK035): US4 Under Review scenario, admin all-ideas consistency, password req parity, FR-007/FR-007a reconciliation
- ✅ SC Quality (CHK036–CHK041): SC-007 methodology, SC-008 threshold, SC-003 conditions, SC-009 input inventory, SC-010 pass/fail, US→SC traceability
- ✅ Edge Cases (CHK042–CHK045): admin URL protection, expired session, orphaned ideas, navigation-away behavior
- ✅ NFR (CHK046–CHK049): WCAG 2.1 AA, breakpoints, transaction scenarios, session recovery
- ✅ Constitution (CHK050–CHK054): Documentation-First, quality gates, service boundary, Security-First layers, test coverage per US
- ✅ Dependencies (CHK055–CHK057): PostgreSQL prereq check, Tailwind v3 firm, filesystem limitation documented

**All resolutions added to**: `spec.md §Resolved Specification Gaps`