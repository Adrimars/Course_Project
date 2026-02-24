# Feature Specification: Innovation Portal

**Feature Branch**: `1-innovation-portal`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "Build an Innovation Portal with complete submission and evaluation workflow including authentication, idea submission with file attachments, dashboard listing, status tracking, and admin evaluation capabilities"

## Clarifications

### Session 2026-02-24

- Q: How is the first admin user created in the system? → A: First registered user becomes admin automatically, then admins can promote others via admin panel
- Q: Can all users see all submitted ideas, or is visibility restricted? → A: Configurable visibility per idea (submitter chooses public/private), admins can see all ideas regardless of visibility setting
- Q: When/how do ideas transition from "Submitted" to "Under Review"? → A: Automatically changes to "Under Review" when admin first opens/views the idea
- Q: What are the password strength requirements for user registration? → A: Minimum 8 characters with at least one number, one uppercase letter, one lowercase letter, and one special character; passwords must be hashed using bcrypt
- Q: Can admins change idea status after Accepted/Rejected decisions? → A: Admins can change status at any time; all changes are tracked in StatusHistory with full audit trail

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Authentication (Priority: P1)

Users must be able to register for an account, log in securely, and log out to access the innovation portal.

**Why this priority**: Authentication is the foundational requirement that gates all other functionality. Without user accounts, ideas cannot be attributed to submitters and the evaluation workflow cannot function.

**Independent Test**: Can be fully tested by creating a test account, logging in, verifying authenticated state, and logging out. Delivers immediate value by establishing user identity management.

**Acceptance Scenarios**:

1. **Given** I am a new user on the registration page, **When** I provide valid credentials (email, password meeting requirements), **Then** my account is created and I am logged in
2. **Given** I am on the registration page, **When** I enter a password that doesn't meet requirements (minimum 8 chars with number, uppercase, lowercase, special character), **Then** I see a validation error explaining password requirements
3. **Given** I am a registered user on the login page, **When** I enter my correct credentials, **Then** I am logged in and redirected to the dashboard
4. **Given** I am logged in, **When** I click the logout button, **Then** I am logged out and redirected to the login page
5. **Given** I am on the login page, **When** I enter incorrect credentials, **Then** I see an error message and remain on the login page
6. **Given** I am not logged in, **When** I try to access protected pages, **Then** I am redirected to the login page

---

### User Story 2 - Submit Ideas with Attachments (Priority: P1)

Users can submit innovation ideas through a form and attach a single supporting file to provide context.

**Why this priority**: This is the core value proposition of the portal - enabling users to submit their ideas. Without this, the portal has no content to display or evaluate.

**Independent Test**: Can be fully tested by logging in, filling out the submission form with idea details, attaching a file, and verifying the submission is stored. Delivers standalone value as an idea repository.

**Acceptance Scenarios**:

1. **Given** I am logged in and on the submission page, **When** I fill out all required fields (title, description, category) and click submit, **Then** my idea is saved and I see a confirmation message
2. **Given** I am on the submission page, **When** I select visibility option (public/private), **Then** my idea visibility is saved with that setting (defaults to public if not explicitly set)
3. **Given** I am on the submission page, **When** I attach a file (PDF, DOC, or image under 10MB), **Then** the file is uploaded with my submission
4. **Given** I am on the submission page, **When** I try to submit without required fields (title, description, or category), **Then** I see validation errors highlighting missing fields
5. **Given** I am on the submission page, **When** I try to attach a file over 10MB or unsupported format, **Then** I see an error message and the file is not attached
6. **Given** I have submitted an idea, **When** the submission completes, **Then** I am redirected to the dashboard and see my new idea in the list

---

### User Story 3 - View Ideas Dashboard (Priority: P2)

Users can view a dashboard listing submitted ideas based on visibility settings: regular users see public ideas plus their own private ideas, while admins see all ideas regardless of visibility.

**Why this priority**: Visibility of submitted ideas enables users to see what has been proposed, provides transparency, and allows users to track their own submissions. Configurable visibility gives submitters control over who can see their ideas.

**Independent Test**: Can be fully tested by viewing the dashboard with pre-loaded public and private ideas and verifying correct visibility rules are enforced. Works independently if ideas exist in the system.

**Acceptance Scenarios**:

1. **Given** I am logged in as a regular user, **When** I navigate to the dashboard, **Then** I see all public ideas plus my own private ideas with title, submitter, submission date, and status
2. **Given** I am logged in as an admin, **When** I navigate to the dashboard, **Then** I see all ideas (both public and private) from all users
3. **Given** I am on the dashboard with multiple ideas, **When** the page loads, **Then** ideas are displayed in reverse chronological order (newest first)
4. **Given** I am on the dashboard, **When** I click on an idea I have access to, **Then** I see the full details including description and attachment
5. **Given** there are no visible ideas for my access level, **When** I view the dashboard, **Then** I see a message indicating no ideas are available
6. **Given** I am viewing an idea's details, **When** I check the metadata, **Then** I can see who submitted it, when, and its visibility setting

---

### User Story 4 - Track Idea Status (Priority: P2)

Users can see the current status of each idea (Submitted, Under Review, Accepted, Rejected) as it moves through the evaluation process.

**Why this priority**: Status tracking provides feedback to submitters about their ideas and creates transparency in the evaluation workflow. This keeps users engaged and informed.

**Independent Test**: Can be fully tested by viewing ideas with different statuses on the dashboard and verifying status changes are reflected. Works independently with pre-defined status values.

**Acceptance Scenarios**:

1. **Given** I have submitted an idea, **When** I view it on the dashboard, **Then** it shows status "Submitted"
2. **Given** an admin has reviewed my idea, **When** I view the updated idea, **Then** the status reflects the admin's decision (Accepted or Rejected)
3. **Given** I am viewing the dashboard, **When** I look at any idea, **Then** the status is clearly visible with appropriate visual indicators (color coding)
4. **Given** my idea has been rejected, **When** I view the details, **Then** I can see the admin's rejection comments
5. **Given** my idea has been accepted, **When** I view the details, **Then** I can see the admin's acceptance comments

---

### User Story 5 - Admin Evaluation Workflow (Priority: P1)

Administrators can review submitted ideas, provide feedback comments, and set the status to Accepted or Rejected to complete the evaluation loop.

**Why this priority**: This completes the end-to-end MVP workflow. The success criterion for the MVP requires a fully functioning end-to-end cycle where a user can submit an idea and an admin can evaluate and decide on it. Without evaluation, the portal is only a passive repository and the core product value is not delivered.

**Independent Test**: Can be fully tested by logging in as admin, reviewing an idea, adding comments, and changing status. Delivers standalone admin capability.

**Acceptance Scenarios**:

1. **Given** I am logged in as an administrator, **When** I navigate to the admin review page, **Then** I see all ideas with "Submitted" or "Under Review" status
2. **Given** I am reviewing an idea with "Submitted" status as admin, **When** I open/view the idea details for the first time, **Then** the status automatically changes to "Under Review"
3. **Given** I am reviewing an idea as admin, **When** I read the full details and attachment, **Then** I can make an informed evaluation decision
4. **Given** I am reviewing an idea, **When** I enter feedback comments and click "Accept", **Then** the idea status changes to "Accepted" and comments are saved
5. **Given** I am reviewing an idea, **When** I enter feedback comments and click "Reject", **Then** the idea status changes to "Rejected" and comments are saved
6. **Given** an idea I previously accepted or rejected requires a revised decision, **When** I change its status to any valid value with new feedback comments, **Then** the status updates and the full change history (previous and new decision, timestamps, admin) is preserved in the audit trail
7. **Given** I have evaluated an idea, **When** the submitter views it, **Then** they can see my latest feedback comments, the current status, and the history of all status changes
8. **Given** I am an admin, **When** I view the dashboard, **Then** I can see all ideas regardless of status with filter/sort options

---

### Edge Cases

- What happens when a user tries to submit an idea without authentication? → Redirected to login page
- What happens when a user tries to register with a weak password? → Registration blocked with clear error message explaining requirements (8+ chars, number, uppercase, lowercase, special character)
- What happens when a user enters an already-registered email? → Registration fails with error "Email already in use"
- What happens when file upload fails mid-submission? → User sees error message and can retry submission
- What happens when a user tries to access a private idea they don't own? → Access denied, redirect to dashboard with error message
- What happens when visibility setting is not selected during submission? → Defaults to public visibility
- What happens when a user makes their idea private after it was public? → Immediately hidden from other non-admin users
- What happens when an admin reverses a previous Accepted/Rejected decision? → Status updated immediately with new feedback; full change history (all prior decisions, timestamps, admins) preserved in StatusHistory audit trail and visible to submitter
- What happens when an idea is "Under Review" but admin doesn't complete evaluation? → Remains in "Under Review" status until admin makes Accept/Reject decision
- What happens when multiple admins review the same idea simultaneously? → Last save wins with timestamp tracking
- What happens when a user deletes their account? → Ideas remain but show "Account Deleted" for submitter
- What happens when attachment file type is disguised (wrong extension)? → Server validates actual file type via MIME detection
- What happens when dashboard has hundreds of ideas? → Implement pagination (show 20 per page)
- What happens when search/filter returns no results? → Display "No ideas match your criteria" message
- What happens when admin leaves feedback blank? → Validation requires feedback comments before status change
- What happens when user navigates away during file upload? → Upload canceled, submission not saved

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide user registration with email validation and password validation enforcing: minimum 8 characters, at least one number, one uppercase letter, one lowercase letter, and one special character
- **FR-002**: System MUST authenticate users via email/password using NextAuth.js and hash all passwords using bcrypt with minimum 10 rounds
- **FR-003**: System MUST maintain user sessions and protect routes requiring authentication
- **FR-004**: Users MUST be able to submit ideas with required fields: title (min 10 chars), description (min 50 chars), category (must be one of the predefined category values)
- **FR-005**: System MUST support single file attachment per idea with types: PDF, DOC, DOCX, PNG, JPG (max 10MB)
- **FR-006**: System MUST store file uploads using Multer and persist metadata in database
- **FR-007**: System MUST display dashboard listing all ideas with fields: title, submitter, date, status
- **FR-007a**: System MUST implement configurable visibility per idea (public/private); regular users see public ideas plus their own private ideas; admins see all ideas regardless of visibility
- **FR-008**: System MUST implement four status values: Submitted, Under Review, Accepted, Rejected
- **FR-008a**: System MUST automatically transition idea status from "Submitted" to "Under Review" when an admin first opens/views the idea details
- **FR-009**: System MUST track all status changes in StatusHistory with timestamps, admin user identity, old status, new status, and feedback comments; admins MUST be able to change idea status at any time regardless of current status
- **FR-010**: Administrators MUST be able to view all ideas and change status with required feedback comments
- **FR-011**: System MUST implement role-based access control (RBAC) distinguishing regular users from administrators; first registered user automatically receives admin role, and admins can promote other users to admin via admin panel
- **FR-012**: System MUST validate all user inputs for security (SQL injection, XSS prevention)
- **FR-013**: System MUST persist all data in PostgreSQL database using Prisma ORM
- **FR-014**: System MUST provide logout functionality that terminates user session
- **FR-015**: System MUST display appropriate error messages for failed operations (login, submission, file upload)

### Key Entities *(include if feature involves data)*

- **User**: Represents portal users; attributes include email (unique), hashed password, name, role (user/admin), creation date
- **Idea**: Represents submitted innovation ideas; attributes include title, description, category (predefined enum), submitter (User reference), submission date, current status, visibility (public/private, defaults to public), attachment metadata (filename, path, size, MIME type)
- **StatusHistory**: Represents status change audit trail; attributes include idea reference, old status, new status, admin user reference, timestamp, feedback comments
- **Session**: Represents authenticated user sessions; managed by NextAuth.js; includes user reference, expiration, tokens

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete registration and login in under 1 minute
- **SC-002**: Users can submit an idea with attachment in under 3 minutes
- **SC-003**: Dashboard loads all ideas (up to 100) in under 2 seconds
- **SC-004**: Admins can review and evaluate an idea in under 2 minutes
- **SC-005**: System successfully handles file uploads up to 10MB without errors
- **SC-006**: 100% of authenticated routes properly redirect unauthenticated users
- **SC-007**: Status changes are visible to submitters on the next page load or manual refresh after admin action
- **SC-008**: System supports at least 50 concurrent users without performance degradation
- **SC-009**: All user inputs are validated and sanitized preventing security vulnerabilities
- **SC-010**: Complete end-to-end workflow (submit → review → status update → view feedback) executes successfully

## Scope *(mandatory)*

### In Scope

- User registration, login, logout functionality
- Idea submission form with validation
- Single file attachment per idea (PDF, DOC, DOCX, PNG, JPG)
- Dashboard listing all ideas with status indicators
- Status tracking with four states (Submitted, Under Review, Accepted, Rejected)
- Admin evaluation interface with feedback comments
- Role-based access control (user vs admin)
- Database persistence using PostgreSQL and Prisma
- Basic error handling and user feedback
- Security measures (input validation, authentication checks)
- Post-submission visibility change by submitter (PUBLIC ↔ PRIVATE toggle on idea detail page)

### Out of Scope

- Email notifications for status changes
- Multiple file attachments per idea
- Idea content editing after submission (title, description, and category cannot be changed post-submission; only the visibility setting may be updated by the submitter — planned as Phase 4 Draft Management)
- Draft saving before submission (submitter can only discard or submit; no partial save — addressed in Phase 4)
- Commenting/discussion threads on ideas
- User profile pages with preferences
- Advanced search and filtering (beyond basic status filter)
- Idea voting or rating system
- Export functionality (CSV, PDF reports)
- Mobile app (web-only)
- Real-time collaboration features
- Third-party integrations (Slack, Teams)
- Analytics dashboard for submission trends
- Automated idea evaluation/scoring
- Multi-project / multi-tenant support (separate workspaces with per-project admins and scoped idea pools) — planned as `2-multi-project-support` after MVP completion

---

## Future Phases (Post-MVP Roadmap)

The following phases are planned for iterative development after the MVP is accepted. Each phase builds on the previous and can be specified in its own feature branch.

### Phase 2 — Smart Submission Forms

Enhance the idea submission form with dynamic, context-aware fields. Planned capabilities:
- Conditional fields that appear/hide based on selected category
- Field-level help text and examples per category
- Auto-save of form state to prevent accidental data loss (precursor to Phase 4 drafts)
- Character count indicators and real-time validation feedback

### Phase 3 — Multi-Media Support

Expand attachment support beyond a single file. Planned capabilities:
- Multiple file attachments per idea (up to a configurable limit)
- Support for video links (YouTube/Vimeo embed URLs)
- Image gallery preview within the idea detail page
- Expanded MIME type support (MP4, PPTX, XLSX)
- Aggregate size cap per idea (e.g., 50 MB total)

### Phase 4 — Draft Management

Allow submitters to save incomplete ideas before committing to submission. Planned capabilities:
- New `DRAFT` idea status: idea saved but not yet submitted; visible only to the submitter
- Submitters can edit `DRAFT` ideas (title, description, category, attachment) until submission
- Explicit "Submit" action transitions idea from `DRAFT` → `SUBMITTED` and locks content
- Drafts auto-expire after a configurable period of inactivity
- **Data model impact**: adds `DRAFT` value to `IdeaStatus` enum; removes the post-submission edit restriction for `DRAFT`-state ideas only

### Phase 5 — Multi-Stage Review

Replace the binary Accept/Reject decision with a structured, multi-stage evaluation pipeline. Planned capabilities:
- Configurable review stages (e.g., Initial Screen → Technical Review → Executive Approval)
- Different admins or reviewer roles assigned per stage
- Idea must pass all stages sequentially before reaching a final decision
- Stage-level feedback visible in the status history timeline

### Phase 6 — Blind Review

Allow admins to evaluate ideas without knowing the identity of the submitter. Planned capabilities:
- Submitter identity hidden from reviewers during the `UNDER_REVIEW` phase
- Blinded idea card shows only title, description, category, and attachment (no name/date)
- Identity revealed automatically after a final Accept/Reject decision is recorded
- Configurable per-idea or portal-wide blind review toggle

### Phase 7 — Scoring System

Replace or supplement binary decisions with a numeric scoring model. Planned capabilities:
- Reviewers assign scores on multiple weighted criteria (e.g., feasibility, impact, cost)
- Aggregate/weighted score calculated automatically per idea
- Leaderboard or ranked listing of top-scored ideas
- Score threshold rules to auto-advance or auto-reject ideas
- Score history tracked alongside status history in the audit trail

## Non-Functional Requirements *(optional)*

### Performance

- Dashboard page load time: < 2 seconds with 100 ideas
- File upload completion: < 10 seconds for 10MB files
- API response time: < 500ms for read operations, < 1s for write operations

### Security

- Password requirements: minimum 8 characters with at least one number, one uppercase letter, one lowercase letter, and one special character
- Passwords hashed using bcrypt with minimum 10 rounds before storage
- Session tokens expire after 30 days (NextAuth JWT default; invalidated immediately on explicit logout)
- All sensitive routes protected by authentication middleware
- File uploads validated for type and size server-side
- SQL injection prevention via Prisma parameterized queries
- XSS prevention via input sanitization and CSP headers

### Usability

- Mobile-responsive design for all pages
- Clear error messages for all validation failures
- Visual feedback for loading states (spinners, progress bars)
- Accessible forms with proper labels and ARIA attributes

### Reliability

- Graceful error handling with user-friendly messages
- Database transaction integrity for critical operations
- Automatic session recovery after temporary disconnections

## Assumptions *(optional)*

- Development timeline is 8.5 hours with hourly commits
- Single developer working on the project
- First registered user automatically becomes admin; subsequent admins promoted via admin panel (no manual database manipulation required)
- File storage is local filesystem (not cloud storage like S3)
- English language only (no internationalization)
- Desktop/laptop primary use case (mobile as secondary)
- PostgreSQL database is pre-configured and accessible
- Ideas cannot be deleted, only status can change
- One attachment per idea is sufficient for MVP

## Dependencies *(optional)*

- **External Libraries**: NextAuth.js (authentication), Prisma (ORM), Multer (file uploads)
- **Infrastructure**: PostgreSQL database server, Node.js runtime environment
- **Design Assets**: Basic UI framework (assumed Tailwind CSS or similar for styling)
- **Testing Data**: Pre-loaded test users and sample ideas for demonstration

## Risks *(optional)*

- **Risk-001**: File upload failures due to size/network issues → Mitigation: Implement upload progress indicator and retry logic
- **Risk-002**: Database connection errors during submission → Mitigation: Implement connection pooling and graceful error handling
- **Risk-003**: Time constraint (8.5 hours) may not allow full feature completion → Mitigation: Prioritize P1 stories first, P3 as stretch goal
- **Risk-004**: Security vulnerabilities in file upload handling → Mitigation: Strict file type validation and virus scanning consideration
- **Risk-005**: Concurrent admin edits causing data conflicts → Mitigation: Optimistic locking with timestamp comparison

---

## Resolved Specification Gaps *(spec-audit.md resolutions)*

> This section formally closes all open items identified in the spec-audit checklist. Each sub-section maps to one or more CHK IDs.

---

### GATE 1: RBAC & Admin Promotion Rules

**CHK001 — First-user-becomes-admin scope & race condition**
The first registered user *globally* (i.e., the first row ever inserted into the `User` table across all deployments of the same database) receives `role = ADMIN`. "First" is determined by an atomic database transaction that checks `COUNT(*) = 0` on the `User` table before inserting the new row, using a serializable isolation level or a Prisma `$transaction` with an explicit lock. In a simultaneous-registration race, only one INSERT succeeds with `role = ADMIN`; the other(s) default to `role = USER`. This rule applies once per database instance and is not re-triggerable afterward.

**CHK002 — Admin promotion: initiator, UI, reversibility**
- *Who initiates*: Any user with `role = ADMIN` can promote any `USER`-role account.
- *UI flow*: Admin navigates to `/admin/users` → locates the target user row → clicks the **"Promote to Admin"** button → a confirmation dialog appears → admin confirms → the role is updated immediately with a success toast.
- *Reversibility*: An admin **can** demote another admin (set their role back to `USER`), subject to the last-admin safeguard below. An admin **cannot** demote themselves; the "Demote" action is hidden for the currently authenticated admin's own row.

**CHK003 — Minimum one admin safeguard**
The system MUST enforce that at least one `ADMIN` account always exists:
- FR-011a: Before executing any role demotion or account deletion, the system MUST verify that at least one other active `ADMIN` account will remain afterward. If the target is the only admin, the operation MUST be rejected with HTTP 409 and error message "Cannot remove the last administrator. Promote another user to admin first."
- This check applies to both `PATCH /api/admin/users/[id]/role` (demotion) and any future account-deletion endpoint.

**CHK004 — Authorization matrix for admin-only actions**

| Action | Route | Required Role | Regular user result |
|--------|-------|--------------|-------------------|
| View all ideas (incl. private of others) | `GET /api/ideas` | `ADMIN` (for private others) | Filtered to PUBLIC + own PRIVATE |
| Change idea status | `PATCH /api/ideas/[id]` | `ADMIN` | 403 Forbidden |
| Promote / demote user | `PATCH /api/admin/users/[id]/role` | `ADMIN` | 403 Forbidden |
| View user list | `GET /api/admin/users` | `ADMIN` | 403 Forbidden |
| Access any `/admin/**` route | Next.js middleware | `ADMIN` | 403 + redirect to `/dashboard` |

**CHK005 — Admin panel routes**
The "admin panel" consists of the following dedicated routes, all protected by Next.js middleware that checks `session.user.role === 'ADMIN'`:
- `/admin` — Overview: total ideas, pending reviews, registered users count
- `/admin/users` — User list with Promote/Demote controls
- `/admin/ideas` — All ideas (regardless of visibility) with status filter and evaluation links

---

### GATE 2: Visibility & Access Control Rules

**CHK006 — Visibility enum, default, formal requirement**
- FR-007b (new): Idea visibility is an enum with exactly two values: `PUBLIC` | `PRIVATE`. The default value is `PUBLIC`. The default MUST be set at the database level (`@default(PUBLIC)`) AND enforced in the API layer if the field is omitted from the submission payload. The default is not left to implementation discretion.

**CHK007 — Post-submission visibility change**
- FR-007c (new): The submitter of an idea MAY change its visibility between `PUBLIC` and `PRIVATE` at any time after submission via a toggle on the idea detail page. Only the original submitter (matched by `idea.submitterId === session.user.id`) may change visibility. Admins cannot change another user's idea visibility. The effect is **synchronous**: the `Idea.visibility` field is updated in the same DB transaction as the API response, so the change is reflected on the very next page load.

**CHK008 — Private idea detail page direct URL access**
- FR-007d (new): If a regular user navigates directly to `/ideas/[id]` (or calls `GET /api/ideas/[id]`) for an idea where `visibility = PRIVATE` AND `idea.submitterId ≠ session.user.id`, the server MUST return HTTP 403 Forbidden. The Next.js page redirects the user to `/dashboard` with a flash message "You do not have access to this idea."

**CHK009 — File attachment access control**
- FR-005a (new): Uploaded files are served **exclusively** via the authenticated API route `GET /api/ideas/[id]/attachment`. The upload directory is NOT exposed as a static asset directory. Before streaming the file, the API applies the same visibility + ownership check as FR-007d: if the requesting user is not the submitter, not an admin, and the idea is `PRIVATE`, the API returns HTTP 403. The file's storage path (UUID-based filename) is never exposed in API responses; only the download endpoint URL is returned.

**CHK010 — FR-007a and US3 consistency**
FR-007a and User Story 3 are consistent: "regular users see all `PUBLIC` ideas plus their own `PRIVATE` ideas" is the authoritative rule enforced in both the database query (Prisma `WHERE` clause) and the Next.js server component. User Story 3, Scenario 2 (admin sees all) is addressed by bypassing the visibility filter when `session.user.role === 'ADMIN'` in the same query.

---

### GATE 3: Status Transition Rules & Audit Trail

**CHK011 — Full status transition graph**
All four statuses are: `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`.

Allowed transitions:

| From | To | Trigger | Who |
|------|----|---------|-----|
| `SUBMITTED` | `UNDER_REVIEW` | First admin view of idea details | System (automatic) |
| `UNDER_REVIEW` | `ACCEPTED` | Admin submits evaluation with Accept | Admin |
| `UNDER_REVIEW` | `REJECTED` | Admin submits evaluation with Reject | Admin |
| Any status | Any status | Admin manual override with feedback | Admin |

The last row formalises FR-009's "admins can change status at any time." No transition is permanently forbidden for a manual admin action; however, the evaluation UI surfaces only contextually appropriate actions (e.g., Accept/Reject buttons shown only for `UNDER_REVIEW` ideas; a separate "Override Status" control available on any idea for power-admin use). Backward transitions (e.g., `ACCEPTED` → `UNDER_REVIEW`) are allowed as admin overrides.

**CHK012 — SUBMITTED → UNDER_REVIEW idempotency**
FR-008a (clarification): The automatic `SUBMITTED → UNDER_REVIEW` transition fires **only once** — specifically when the idea's status is currently `SUBMITTED` at the moment an admin loads the idea detail page. If the idea is already in any other status, no automatic transition occurs. This check is performed inside a Prisma transaction with a conditional update (`UPDATE ... WHERE status = 'SUBMITTED'`), so concurrent admin views of the same `SUBMITTED` idea will produce exactly one `StatusHistory` entry for this transition.

**CHK013 — Who can view StatusHistory**
- The submitter of an idea can see the full `StatusHistory` for their own idea (all entries, including admin identity shown as display name).
- Admins can see `StatusHistory` for any idea.
- Regular users who are **not** the submitter can see only the current status of a `PUBLIC` idea; the full history timeline is not shown to them.

**CHK014 — Feedback comments required for which transitions**
Feedback comments are **required for all manual admin status changes** (including `SUBMITTED → UNDER_REVIEW` override, `ACCEPTED → anything`, `REJECTED → anything`). The **automatic** `SUBMITTED → UNDER_REVIEW` system transition stores a system-generated comment: "Idea opened for review" (no admin input required). All other transitions initiated by an admin MUST include a non-empty, non-whitespace-only feedback comment before the form can be submitted.

**CHK015 — StatusHistory fields displayed to submitter**
The status history timeline shown to the submitter on the idea detail page displays, per entry:
1. Timestamp (formatted as `MMM DD, YYYY HH:mm`)
2. Actor (admin display name, or "System" for automatic transitions)
3. Old status (badge with color coding)
4. New status (badge with color coding)
5. Feedback comments (full text, wrapping)

**CHK016 — Feedback comments length constraint**
- FR-010a (new): Feedback comments MUST be between 1 and 2000 characters (after trimming leading/trailing whitespace). Submitting an empty or whitespace-only string MUST be rejected client-side (disabled submit button) and server-side (400 Bad Request with message "Feedback comments are required and cannot be empty."). Submissions exceeding 2000 characters are rejected with "Feedback comments must not exceed 2000 characters."

---

### GATE 4: File Upload Security

**CHK017 — Server-side MIME type validation**
FR-005b (new): File type MUST be validated on the server using magic-byte inspection (e.g., the `file-type` npm library or equivalent), NOT by relying on the file extension or the `Content-Type` request header. Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/png`, `image/jpeg`. Files where the detected MIME type does not match an allowed type MUST be rejected with HTTP 422 and message "Unsupported file type. Allowed types: PDF, DOC, DOCX, PNG, JPG."

**CHK018 — File storage path and naming**
FR-005c (new): Uploaded files MUST be stored using a UUID v4 filename (e.g., `550e8400-e29b-41d4-a716-446655440000.pdf`). The original client-provided filename is stored only in the `Attachment.originalName` database field and is NEVER used as the file system path. The upload directory is a single flat directory (`/uploads/`) with no sub-directories derived from user input. Path traversal is prevented by: (1) stripping all path separators from any filename input, (2) using the UUID as the sole path component.

**CHK019 — File access only via authenticated API route**
FR-005a formalises this (see CHK009 above). Additionally: the Next.js `next.config.js` MUST NOT include the uploads directory in any `publicRuntimeConfig` or `staticFiles` serving configuration. The upload directory MUST NOT be inside the `public/` folder.

**CHK020 — File retention policy**
- When the idea submitter's account is deleted: the file is retained on disk and in the `Attachment` table. The idea's `submitterId` is set to `NULL` (Prisma `onDelete: SetNull`). The file remains downloadable by admins.
- When an idea reaches a terminal status (`ACCEPTED` or `REJECTED`): the file is **retained** indefinitely for audit purposes. No automatic clean-up occurs in MVP.
- Explicit file deletion is out of scope for Phase 1 MVP.

**CHK021 — 10MB limit at client and server**
- *Client*: The file `<input>` is validated before upload begins; if `file.size > 10 * 1024 * 1024`, the form shows an inline error "File exceeds 10MB limit. Please choose a smaller file." and the upload is not initiated.
- *Server*: Multer is configured with `limits: { fileSize: 10 * 1024 * 1024 }`. If the limit is exceeded (e.g., a bypass attempt), Multer throws a `MulterError('LIMIT_FILE_SIZE')` and the API returns HTTP 413 with body `{ error: "File size exceeds 10MB limit." }`.

---

### Requirement Completeness Gaps

**CHK022 — In-app status change notifications**
No real-time push notifications are provided in MVP (email is out of scope; WebSocket is out of scope). SC-007 is formally defined as: status changes are visible to the submitter **upon manual page refresh** of the dashboard or idea detail page after an admin action. The UI displays a static note on the idea detail page: "Status is updated in real time — refresh to see the latest."

**CHK023 — Pagination formal requirement**
FR-016 (new): The dashboard MUST implement server-side pagination with exactly **20 ideas per page**. Each paginated response includes: the current page's idea list, total idea count, current page number, and total page count. The page number is reflected in the URL as a query parameter (`?page=N`, default `?page=1`). Navigation controls show Previous / Next buttons (disabled at boundaries) and current page indicator ("Page 2 of 7").

**CHK024 — Idea detail page layout**
The idea detail page (`/ideas/[id]`) MUST render sections in this order:
1. **Header**: Idea title + current status badge (color-coded)
2. **Metadata row**: Submitter name, submission date, category, visibility badge
3. **Description**: Full text, formatted (line breaks preserved)
4. **Attachment**: Download link showing original filename + file size; "No attachment" if none
5. **Visibility toggle**: Shown only to the submitter; allows PUBLIC ↔ PRIVATE change
6. **Status History**: Chronological timeline (newest first) — shown to submitter and admins only
7. **Admin Evaluation Panel**: Shown only to admins; contains status select, feedback textarea, and Submit button

**CHK025 — Admin user promotion user story (US5 extension)**
US5 acceptance scenario 9 (added): **Given** I am logged in as an admin on the `/admin/users` page, **When** I click the "Promote to Admin" button for a `USER`-role account and confirm the dialog, **Then** that user's role immediately becomes `ADMIN`, the button changes to "Demote to User", and a success notification is shown. Conversely, **Given** I click "Demote to User" for another admin, **When** I confirm, **Then** their role reverts to `USER`, subject to the last-admin safeguard (CHK003).

**CHK026 — Session management requirements**
FR-003 (extended): 
- *Concurrent sessions*: Multiple simultaneous sessions from different devices are **permitted** in MVP (single-session enforcement is a Phase 2 security hardening item).
- *Token expiry*: JWT tokens expire after 30 days (NextAuth default). On expiry, the user is silently redirected to `/login` on their next authenticated request.
- *Explicit logout*: Calling `signOut()` (NextAuth) immediately invalidates the session token server-side (database adapter session deletion). Subsequent requests with the invalidated token receive `401 Unauthorized` and are redirected to `/login`.
- *Forced logout from admin panel*: Out of scope for Phase 1 MVP.

---

### Requirement Clarity Gaps

**CHK027 — Status color coding**
Status badges use the following Tailwind CSS color classes (or equivalent):
- `SUBMITTED` → blue (`bg-blue-100 text-blue-800`)
- `UNDER_REVIEW` → amber (`bg-amber-100 text-amber-800`)
- `ACCEPTED` → green (`bg-green-100 text-green-800`)
- `REJECTED` → red (`bg-red-100 text-red-800`)

**CHK028 — "Immediately hidden" propagation**
When a submitter changes their idea's visibility from `PUBLIC` to `PRIVATE`, the change is **synchronous**: the Prisma `update` call completes before the API response is returned. The next database read by any other user (on their next page load or API call) will not include the now-private idea. There is no eventual-consistency window.

**CHK029 — "Last save wins" concrete mechanism**
For concurrent admin edits (Risk-005): the `Idea` model includes an `updatedAt` field (auto-managed by Prisma). When an admin submits a status change, the `PATCH /api/ideas/[id]` payload MUST include the `updatedAt` timestamp the admin loaded. The server performs a conditional update: `UPDATE ideas SET ... WHERE id = ? AND updatedAt = ?`. If `updatedAt` has changed (another admin saved first), the update affects 0 rows; the API returns HTTP 409 Conflict with body `{ error: "This idea was updated by another admin. Please refresh and try again.", currentUpdatedAt: "<new value>" }`.

**CHK030 — "Admin panel" definition**
The "admin panel" is a dedicated section of the Next.js application rooted at `/admin`. It is separate from the regular user dashboard (`/dashboard`). Access to any route under `/admin/**` requires `session.user.role === 'ADMIN'`, enforced by `middleware.ts`. The admin panel is not a modal, sidebar, or overlay — it is a full distinct page layout with its own navigation.

**CHK031 — Min length constraints reflected in US2 scenarios**
US2 acceptance scenario 7 (added): **Given** I am on the submission page, **When** I enter a title with fewer than 10 characters or a description with fewer than 50 characters, **Then** I see an inline validation error: "Title must be at least 10 characters" or "Description must be at least 50 characters" respectively, and the form cannot be submitted until corrected.

---

### Requirement Consistency Gaps

**CHK032 — US4 references all four statuses**
US4 acceptance scenario 6 (added): **Given** an admin has opened my idea for the first time, **When** I view the updated idea on the dashboard, **Then** the status shows "Under Review" with an amber badge, confirming the automatic transition occurred.

**CHK033 — Admin sees all ideas: cross-section consistency**
FR-007a, US3 scenario 2, and US5 scenario 8 are consistent: all three explicitly state that admins see ALL ideas regardless of visibility. The Prisma query for admins omits the `WHERE visibility = PUBLIC OR submitterId = userId` clause entirely.

**CHK034 — Password requirements consistency**
FR-001 and the Security NFR section both specify identical password requirements: minimum 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one special character. No discrepancy exists between the two sections. The canonical definition is in FR-001; the NFR section references it.

**CHK035 — FR-007 vs FR-007a reconciliation**
FR-007 ("display dashboard listing all ideas") uses "all ideas" to mean "all ideas the authenticated user is authorized to see under the visibility rules defined in FR-007a." FR-007a is the authoritative qualifier. There is no conflict: FR-007 defines the dashboard exists; FR-007a defines the visibility filter. Implementation applies FR-007a's filter on top of FR-007's query.

---

### Acceptance & Success Criteria Quality

**CHK036 — SC-007 measurement methodology**
SC-007 (revised): Status changes made by an admin are visible to the submitter **upon the submitter's next manual page refresh** of the dashboard or idea detail page. No automated polling or push notification is required in MVP. Measurement: after an admin changes status in one browser session, the submitter loads the idea detail page (cold request, no cache) in a separate browser session; the new status MUST appear within one full page render cycle.

**CHK037 — SC-008 measurable degradation threshold**
SC-008 (revised): The system supports at least 50 concurrent users with **p95 API response time ≤ 2 000 ms** for dashboard load (`GET /api/ideas`), measured under a sustained 50-request/second load for 60 seconds using a load testing tool (e.g., k6 or Artillery). "No degradation" means p95 stays ≤ 2 000 ms throughout the test run.

**CHK038 — SC-003 measurement conditions**
SC-003 (revised): The dashboard (`GET /dashboard` server-side render) loads in under **2 seconds total** measured under these conditions: warm database connection pool, dataset of exactly 100 ideas (first page of 20), standard broadband (simulated 10 Mbps), server-side render time contribution ≤ 500 ms. Cold-start renders (first request after server restart) are excluded from this SLA.

**CHK039 — SC-009 input inventory**
SC-009 is satisfied when ALL of the following inputs are validated and sanitized:
1. Registration email (format + uniqueness)
2. Registration password (strength rules + bcrypt hash)
3. Login email (format)
4. Login password (existence check, no raw logging)
5. Idea title (min 10, max 200 chars)
6. Idea description (min 50, max 5 000 chars)
7. Idea category (must be a valid enum value)
8. Idea visibility (must be `PUBLIC` or `PRIVATE`)
9. Feedback comments (min 1, max 2 000 chars)
10. File attachment (MIME type server-side + size ≤ 10 MB)

**CHK040 — SC-010 explicit pass/fail criteria**
SC-010 passes when the following 6-step workflow completes without any error or unexpected state:
1. New user registers with valid credentials → account created, redirected to dashboard
2. User logs in → session established, dashboard visible
3. User submits an idea with a valid attachment → idea appears on dashboard with status `SUBMITTED`
4. Admin opens the idea detail page → status automatically changes to `UNDER_REVIEW`
5. Admin enters feedback comments and clicks Accept → status changes to `ACCEPTED`, history entry created
6. Submitter refreshes dashboard or idea detail page → status shows `ACCEPTED` with admin's feedback visible

Any failure, error message, or incorrect state at any step = SC-010 FAIL.

**CHK041 — User story to success criteria traceability**
| User Story | Success Criteria |
|-----------|-----------------|
| US1 (Authentication) | SC-001, SC-006 |
| US2 (Submit Ideas) | SC-002, SC-005, SC-009 |
| US3 (View Dashboard) | SC-003, SC-006 |
| US4 (Track Status) | SC-007 |
| US5 (Admin Evaluation) | SC-004, SC-010 |

---

### Non-Functional Requirements Gaps

**CHK046 — WCAG conformance level**
The application MUST conform to **WCAG 2.1 Level AA**. Minimum requirements: all form inputs have associated `<label>` elements or `aria-label`; all interactive elements are keyboard-navigable; color contrast ratio ≥ 4.5:1 for normal text; status badges include text (not color alone) to convey meaning; error messages are associated with their inputs via `aria-describedby`.

**CHK047 — Mobile-responsive breakpoints**
The application MUST be responsive at three breakpoints using Tailwind CSS:
- Mobile: ≤ 767px (single-column layout, stacked navigation)
- Tablet: 768px – 1 023px (two-column layout where applicable)
- Desktop: ≥ 1 024px (full multi-column layout, side navigation)

**CHK048 — Database transaction scenarios**
The following operations MUST execute within a single Prisma `$transaction`:
1. Idea submission: `Idea` INSERT + `Attachment` INSERT (if file present)
2. Status change: `Idea` UPDATE (`status`, `updatedAt`) + `StatusHistory` INSERT
3. User registration: `User` INSERT (including role determination for first-user-becomes-admin check)

**CHK049 — Automatic session recovery behavior**
When a session token is found to be expired or invalid during a request to a protected route, the system MUST: redirect the user to `/login?callbackUrl=<encoded-current-url>`. No silent token refresh is attempted. No last action is replayed. The user must re-authenticate; after successful login, NextAuth redirects them to `callbackUrl` automatically.

---

### Constitution Compliance

**CHK050 — Documentation-First principle**
All five user stories (US1–US5) are fully specified with acceptance scenarios in this document before any implementation work begins. This spec, plus `plan.md`, `data-model.md`, `tasks.md`, and `contracts/` collectively constitute the complete documentation-first artefact set required before implementation.

**CHK051 — Quality Standards gates**
The following quality gates are delegated to `plan.md` (Technical Standards section) and enforced as task checklist items in `tasks.md`:
- ESLint with `@typescript-eslint/recommended` rules (zero errors required)
- TypeScript strict mode (`"strict": true` in `tsconfig.json`)
- Minimum 80% line coverage via Jest + React Testing Library
- All pull/merge requests require code review approval before merging

**CHK052 — Service boundary design decision**
This is explicitly a **monolithic Next.js application** (single deployable unit). Service concerns are separated logically, not as independent deployables:
- Auth service: `src/lib/auth.ts` + NextAuth configuration
- File service: `src/lib/upload.ts` + `pages/api/ideas/[id]/attachment.ts`
- Idea service: `src/lib/ideas.ts` + corresponding API routes
- This is a deliberate Phase 1 MVP decision; microservices decomposition is a post-MVP architecture concern.

**CHK053 — Security-First four layers confirmed**
All four layers mandated by the constitution are present:
1. **Authentication**: FR-002 (NextAuth.js + bcrypt, min 10 rounds)
2. **Authorization**: FR-011 (RBAC middleware, admin-only routes)
3. **Input validation**: FR-012 (Zod schemas on all API routes)
4. **Data protection**: FR-001 (bcrypt password hashing), FR-005b (server-side MIME validation), FR-005c (UUID-based storage)

**CHK054 — Test coverage per user story**
| User Story | Unit Tests | Integration Tests | E2E Tests |
|-----------|-----------|-----------------|----------|
| US1 (Auth) | Password validation logic, bcrypt helper | Registration API, login API, session middleware | Login → dashboard flow |
| US2 (Submit) | Zod validation schema, MIME checker | Submission API + file upload API | Submit idea with file → dashboard |
| US3 (Dashboard) | Visibility filter logic | Dashboard query (user vs. admin) | Dashboard visibility rules |
| US4 (Status) | Status badge component | Status history API | Status change visible after refresh |
| US5 (Admin) | Status machine helper | Admin status change + history | Full end-to-end SC-010 scenario |

Minimum 80% line coverage across all source files.

---

### Dependencies & Assumptions Gaps

**CHK055 — PostgreSQL prerequisite validation**
The `check-prerequisites.ps1` / `check-prerequisites.sh` script (run before implementation tasks) MUST verify: (1) a PostgreSQL server is reachable at the `DATABASE_URL` in `.env`; (2) the target database exists and the Prisma schema can be applied. The project `README.md` MUST include a "Prerequisites" section listing: Node.js ≥ 18, PostgreSQL ≥ 14, and instructions to copy `.env.example` → `.env` and run `npx prisma migrate dev`.

**CHK056 — UI framework specification**
The UI framework is **Tailwind CSS v3** (not "or similar"). This is a firm dependency. The project MUST include `tailwind.config.js`, `postcss.config.js`, and Tailwind directives in the global CSS file. No alternative CSS framework is acceptable without explicit spec change.

**CHK057 — Local filesystem storage known limitation**
File storage on the local filesystem (`/uploads/`) is a **known MVP limitation** with the following documented risks:
- Files are NOT persisted across deployments to ephemeral container environments (e.g., Vercel, Docker without a volume mount).
- Files ARE lost if the server process is replaced without a persistent volume.
- *Mitigation for development*: All file operations run locally; this is acceptable for the 8.5-hour bootcamp project scope.
- *Production upgrade path*: Replace the local Multer storage engine with an S3-compatible adapter (e.g., `@aws-sdk/client-s3` or `@vercel/blob`) as a Phase 2 infrastructure task — no API contract changes required.
- This limitation is explicitly accepted as a Phase 1 assumption.