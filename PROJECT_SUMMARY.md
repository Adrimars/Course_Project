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

## What Would I Have Done Differently

- **Used GitHub more frequently**: I would have committed changes more regularly throughout each phase, using branches per feature and opening pull requests to maintain a clear history of progress and make it easier to review, roll back, or collaborate at any point.
- **Invested more in the frontend with more detailed prompts**: I would have spent more time refining the UI, aiming for a more polished and detailed user experience. Better-structured and more specific prompts when generating or describing frontend components would have led to cleaner layouts, more consistent design, and a more professional overall look.
- **Leveraged Antigravity's screenshot and video recording mode**: I would have enabled Antigravity's built-in screenshot capture and video recording during E2E test runs. This would have made it much easier to visually debug failing tests, review the application's behaviour across different flows, and produce clear evidence of feature completion without having to manually reproduce scenarios.
