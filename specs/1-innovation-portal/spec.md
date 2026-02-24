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

1. **Given** I am logged in and on the submission page, **When** I fill out all required fields (title, description) and click submit, **Then** my idea is saved and I see a confirmation message
2. **Given** I am on the submission page, **When** I select visibility option (public/private), **Then** my idea visibility is saved with that setting (defaults to public if not explicitly set)
3. **Given** I am on the submission page, **When** I attach a file (PDF, DOC, or image under 10MB), **Then** the file is uploaded with my submission
4. **Given** I am on the submission page, **When** I try to submit without required fields, **Then** I see validation errors highlighting missing fields
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

### User Story 5 - Admin Evaluation Workflow (Priority: P3)

Administrators can review submitted ideas, provide feedback comments, and set the status to Accepted or Rejected to complete the evaluation loop.

**Why this priority**: This completes the end-to-end workflow but is lower priority because the portal can function as an idea repository without evaluation. Can be added after core submission and viewing features work.

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
- **FR-004**: Users MUST be able to submit ideas with required fields: title (min 10 chars), description (min 50 chars)
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
- **Idea**: Represents submitted innovation ideas; attributes include title, description, submitter (User reference), submission date, current status, visibility (public/private, defaults to public), attachment metadata (filename, path, size, MIME type)
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
- **SC-007**: Status changes are immediately visible to submitters within 5 seconds of admin action
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

### Out of Scope

- Email notifications for status changes
- Multiple file attachments per idea
- Idea editing after submission
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

## Non-Functional Requirements *(optional)*

### Performance

- Dashboard page load time: < 2 seconds with 100 ideas
- File upload completion: < 10 seconds for 10MB files
- API response time: < 500ms for read operations, < 1s for write operations

### Security

- Password requirements: minimum 8 characters with at least one number, one uppercase letter, one lowercase letter, and one special character
- Passwords hashed using bcrypt with minimum 10 rounds before storage
- Session tokens expire after 24 hours of inactivity
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