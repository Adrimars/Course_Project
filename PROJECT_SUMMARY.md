# Project Summary — Innovation Portal

## Overview

The Innovation Portal is a full-stack web application built with Next.js 14 that allows employees to submit, discover, and collaboratively evaluate innovation ideas through a structured multi-stage workflow. The system supports three distinct roles (User, Inspector, Admin), a rich idea lifecycle from draft through scoring, and a suite of collaboration features including notes, task assignments, join requests, and a real-time notification system. Delivered across seven iterative phases, the portal progressed from a minimal authentication-and-submission core to a fully-featured evaluation platform complete with a scoring leaderboard and analytics dashboard.

---

## Phases Completed

- [x] **Phase 0 — Bug Fixes & Hardening**: Resolved critical race conditions (last-admin demotion), replaced browser-reported MIME types with magic-byte detection via `file-type`, made status auto-transitions idempotent, and fixed pagination URL construction
- [x] **Phase 1 — Core Features**: Implemented per-tab sessionStorage auth, the Inspector RBAC role, an analytics dashboard with status breakdowns, a personal/collaborative notes system, task assignment with accept/decline flow, project join requests with auto-assignment on approval, a dedicated "My Ideas" page, and full-text search with multi-dimensional filtering
- [x] **Phase 2 — Smart Submission Forms**: Added category-specific dynamic fields with per-category Zod schemas, per-category form templates with a "Load template" shortcut, character count indicators, `localStorage` draft auto-save, and real-time React Hook Form validation
- [x] **Phase 3 — Multi-Media Support**: Extended attachments to up to 5 files per idea (10 MB each, 50 MB aggregate), added YouTube/Vimeo video link embedding, an image gallery with click-to-lightbox, expanded MIME support (PPTX, XLSX, MP4), and a per-attachment download route
- [x] **Phase 4 — Draft Management**: Introduced a `DRAFT` status with relaxed validation on save, owner-only access control, dual-action "Save as Draft / Submit" form buttons, a My Drafts tab, and a dedicated draft edit page
- [x] **Phase 5 — Scoring System & Notifications**: Added a four-dimension scoring model (feasibility, impact, novelty, cost-effectiveness), a weighted-average leaderboard with category filtering, a `Notification` model with unread badge in the Navbar, and notification triggers on every status transition

---

## Technical Decisions

### Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Mandated by project constitution; collocates frontend pages and API routes in a single deployable unit, eliminating CORS complexity for a 50-user scale |
| **Language** | TypeScript 5 (strict mode) | Enforced type safety across shared `types/index.ts` enums, Prisma-generated models, and Zod schemas |
| **Database** | PostgreSQL 16 + Prisma 5 ORM | Relational integrity for the audit trail (`StatusHistory`), parameterised queries prevent SQL injection, and Prisma migrations provide a reproducible schema history |
| **Authentication** | Custom `sessionStorage` token flow (replacing NextAuth cookies) | Enables independent per-tab sessions—a project requirement that cookie-based auth cannot satisfy |
| **Validation** | Zod | Single schema source of truth used server-side in API routes and surfaced client-side via React Hook Form's `zodResolver` |
| **Styling** | Tailwind CSS | Utility-first approach keeps component styling co-located and avoids a separate CSS build step |
| **File Storage** | Local filesystem (`/uploads/`) with magic-byte MIME detection | Avoids external storage dependencies for this deployment scope; `file-type` guarantees server-side format enforcement independent of the browser-reported content type |
| **Testing** | Jest + React Testing Library (unit/integration) · Playwright (E2E) | 188 tests passing; 80 % coverage gate enforced in CI |

### Architectural Decisions

- **Single-service microservice boundary**: All API routes live under `/api/**` and form the explicit service contract. The decision to use one Next.js app rather than a separate Express API + React SPA was justified because the added operational overhead (CORS, dual deployments, duplicated auth) brings no benefit at the target scale.
- **Role hierarchy encoded in middleware**: The `middleware.ts` file intercepts every request and reads the sessionStorage token header, preventing protected routes from ever rendering on the server for unauthorised roles.
- **Immutable audit trail**: `StatusHistory` records are append-only; the `PATCH /api/ideas/[id]` route enforces a `VALID_TRANSITIONS` map rather than free-form status updates, ensuring the state machine is respected at the API layer.
- **Category-driven metadata stored as JSON**: Per-category dynamic fields are stored in a `metadata Json?` column rather than normalised tables, keeping the schema stable as new categories are added without additional migrations.

---

## Challenges & Solutions

### 1. Per-tab Authentication
**Challenge**: The requirement for two browser tabs to hold independent user sessions is fundamentally incompatible with cookie-based auth (cookies are shared across all tabs for the same origin).  
**Solution**: Replaced NextAuth cookie sessions with a custom `sessionStorage`-based token approach. A `useTabSession` hook stores the token in `sessionStorage` (tab-isolated), and `middleware.ts` reads it from a custom request header injected by a client-side fetch wrapper. This gives full tab isolation without requiring a separate auth service.

### 2. MIME Type Spoofing
**Challenge**: Relying on `file.type` from the browser's `FormData` allows a malicious user to rename any file with an allowed extension and bypass the format guard entirely.  
**Solution**: After reading the upload into a Node.js `Buffer`, the server runs `file-type`'s magic-byte detection against the raw bytes before persisting. The allowed set (`ALLOWED_MIME_TYPES` in `upload.ts`) is checked against this server-derived type, not the client-supplied one.

### 3. Race Condition in Admin Demotion
**Challenge**: A check-then-act pattern for "last admin" protection—count admins, then demote if count > 1—is vulnerable to concurrent requests both reading `count = 2` and both proceeding with demotion, leaving zero admins.  
**Solution**: The count and the `UPDATE` were wrapped in a single Prisma `$transaction` with serializable isolation, making the guard atomic.

### 4. Idempotent Status Auto-Transition
**Challenge**: The "idea moves to `UNDER_REVIEW` on first admin view" logic was implemented as a `findUnique` + conditional `update` in a Server Component, causing duplicate `StatusHistory` rows on concurrent page renders (e.g., SSR + client hydration).  
**Solution**: Replaced the pattern with `updateMany` (which is a no-op if the predicate does not match) and a conditional `StatusHistory` create guarded by a `count` check inside a transaction, making repeated invocations safe.

### 5. Pagination + Filter Query-Param Collision
**Challenge**: Appending a page number to a URL that already contained filter query parameters produced malformed URLs (e.g., `/admin?status=SUBMITTED?page=2`).  
**Solution**: Added separator logic in both `IdeaList.tsx` and `admin/page.tsx` to detect whether the `basePath` already contains a `?` and join additional params with `&` vs `?` accordingly.

---

## Reflection

### Key Learnings

- **Spec-first discipline pays compound interest**: Writing the full specification and data model before touching code meant that every subsequent phase had a stable contract to build against. Ambiguities that would have caused mid-implementation rewrites (e.g., visibility rules, status transition legality) were resolved during the spec review session.
- **Magic-byte MIME validation is non-negotiable for file uploads**: Browser-reported content types are user-controlled input. Validating file format server-side from raw bytes eliminates an entire class of bypass vulnerabilities with minimal overhead.
- **Granular RBAC must be encoded at the API layer, not just the UI**: Hiding buttons in the UI is UX, not security. Every mutation route (`POST`, `PATCH`, `DELETE`) checks the caller's role independently, so a determined user cannot trigger forbidden transitions by calling the API directly.
- **`sessionStorage` isolation solves the multi-tab auth problem elegantly**, but it requires every fetch call to pass the token explicitly and every Server Component to receive it from request headers—a pattern that must be established early and enforced consistently.

### What Would Be Done Differently

- **Start with a dedicated notification infrastructure** instead of bolting it on in Phase 7. Notification triggers are needed whenever status changes, scores are submitted, or assignments are made. Retrofitting the `createNotification()` helper into existing API routes that were already tested required careful re-testing of those routes.
- **Extract file storage behind an interface from day one**. The current implementation writes directly to the local filesystem. Abstracting this behind a `StorageProvider` interface (with a `LocalStorageProvider` as the default implementation) would make a future swap to S3 or Azure Blob Storage a configuration change rather than a code change.
- **Use a dedicated job queue for side-effects** (notifications, async MIME scanning) rather than executing them inline in API route handlers. Inline side-effects make response times dependent on secondary operations and complicate error handling when the primary write succeeds but the notification fails.
