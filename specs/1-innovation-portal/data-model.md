# Data Model: Innovation Portal

**Phase**: 1 | **Branch**: `1-innovation-portal` | **Date**: 2026-02-24

---

## Entities

### 1. User

Represents a registered portal participant.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (cuid) | PK, auto-generated | Prisma `@default(cuid())` |
| `email` | `String` | Unique, NOT NULL | Valid email format |
| `hashedPassword` | `String` | NOT NULL | bcrypt, min 12 rounds |
| `name` | `String` | NOT NULL, min 2 chars | Display name |
| `role` | `Role` enum | NOT NULL, default `USER` | `USER` or `ADMIN` |
| `createdAt` | `DateTime` | NOT NULL, default `now()` | Registration timestamp |
| `updatedAt` | `DateTime` | NOT NULL, auto-updated | Prisma `@updatedAt` |

**Relationships**:
- `ideas` → `Idea[]` (one-to-many) — ideas submitted by this user
- `statusChanges` → `StatusHistory[]` (one-to-many) — status changes made by this admin
- `sessions` → NextAuth `Session[]` (managed by NextAuth adapter)

**Validation rules**:
- Email: must match RFC 5322 format; unique across all users
- Password (pre-hash): min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special character (`!@#$%^&*` etc.)
- Name: min 2 chars, max 100 chars

**Business rules**:
- First user to register receives `role = ADMIN` automatically
- Only `ADMIN` users can promote others to `ADMIN` via admin panel
- Deleting an account leaves `Idea.submitter` as a soft reference; display reads "Account Deleted"

---

### 2. Idea

Represents a submitted innovation idea.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (cuid) | PK, auto-generated | |
| `title` | `String` | NOT NULL, min 10, max 200 | FR-004 |
| `description` | `String` | NOT NULL, min 50, max 5000 | FR-004 |
| `status` | `IdeaStatus` enum | NOT NULL, default `SUBMITTED` | FR-008 |
| `visibility` | `Visibility` enum | NOT NULL, default `PUBLIC` | FR-007a |
| `submitterId` | `String` | FK → `User.id`, nullable | Nullable for "Account Deleted" case |
| `createdAt` | `DateTime` | NOT NULL, default `now()` | Submission timestamp |
| `updatedAt` | `DateTime` | NOT NULL, auto-updated | Last modified |

**Relationships**:
- `submitter` → `User?` (many-to-one, nullable)
- `attachment` → `Attachment?` (one-to-one, optional)
- `statusHistory` → `StatusHistory[]` (one-to-many)

**Validation rules**:
- `title`: min 10, max 200 characters; required
- `description`: min 50, max 5,000 characters; required
- `visibility`: must be `PUBLIC` or `PRIVATE`; defaults to `PUBLIC` if omitted

**Dashboard query rules**:
- Regular user: `WHERE visibility = 'PUBLIC' OR submitterId = currentUserId`
- Admin: no visibility filter
- Order: `createdAt DESC`
- Pagination: `SKIP (page-1)*20 TAKE 20`

---

### 3. IdeaStatus (Enum)

| Value | Description |
|-------|-------------|
| `SUBMITTED` | Idea just submitted by user; initial state |
| `UNDER_REVIEW` | Admin has opened the idea for the first time |
| `ACCEPTED` | Admin accepted the idea |
| `REJECTED` | Admin rejected the idea |

**State transition rules**:
```
SUBMITTED ──(admin first-view)──→ UNDER_REVIEW
UNDER_REVIEW ──(admin accept)───→ ACCEPTED
UNDER_REVIEW ──(admin reject)───→ REJECTED
ACCEPTED ──(admin override)─────→ UNDER_REVIEW | REJECTED  (any valid status)
REJECTED ──(admin override)─────→ UNDER_REVIEW | ACCEPTED  (any valid status)
```
- `SUBMITTED → UNDER_REVIEW`: automatic, triggered by admin opening idea detail; logged in `StatusHistory`
- All transitions initiated by admin must include non-empty `feedback` comments (min 10 chars)
- Admins can override any status at any time (FR-009)

---

### 4. Visibility (Enum)

| Value | Description |
|-------|-------------|
| `PUBLIC` | Visible to all authenticated users |
| `PRIVATE` | Visible only to submitter and admins |

---

### 5. Attachment

Stores metadata for the file attached to an idea. One attachment per idea maximum.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (cuid) | PK, auto-generated | |
| `ideaId` | `String` | FK → `Idea.id`, unique | One-to-one |
| `originalName` | `String` | NOT NULL | Original filename from upload |
| `storedName` | `String` | NOT NULL | UUID-based filename on disk |
| `storagePath` | `String` | NOT NULL | Absolute path in `./uploads/` |
| `mimeType` | `String` | NOT NULL | Server-verified MIME type |
| `sizeBytes` | `Int` | NOT NULL, max 10485760 | 10 MB maximum |
| `createdAt` | `DateTime` | NOT NULL, default `now()` | Upload timestamp |

**Relationships**:
- `idea` → `Idea` (one-to-one inverse)

**Validation rules**:
- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `image/png`, `image/jpeg`
- Max size: 10 MB (10,485,760 bytes)
- MIME type validated server-side via Multer `fileFilter` (not just extension)

---

### 6. StatusHistory

Immutable audit trail of all idea status changes.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `String` (cuid) | PK, auto-generated | |
| `ideaId` | `String` | FK → `Idea.id`, NOT NULL | |
| `adminId` | `String` | FK → `User.id`, nullable | Null for auto-system transitions |
| `oldStatus` | `IdeaStatus` enum | NOT NULL | Previous status |
| `newStatus` | `IdeaStatus` enum | NOT NULL | New status |
| `feedback` | `String` | NOT NULL | Admin comments; "System" for auto-transitions |
| `changedAt` | `DateTime` | NOT NULL, default `now()` | Timestamp of change |

**Relationships**:
- `idea` → `Idea` (many-to-one)
- `admin` → `User?` (many-to-one, nullable — null for system-triggered transitions)

**Business rules**:
- Records are **never deleted** (full audit trail required by FR-009)
- Visible to submitter and admins on idea detail page
- `admin` is null when status auto-transitions to `UNDER_REVIEW`; `feedback` = system message

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  USER
  ADMIN
}

enum IdeaStatus {
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  REJECTED
}

enum Visibility {
  PUBLIC
  PRIVATE
}

model User {
  id             String          @id @default(cuid())
  email          String          @unique
  hashedPassword String
  name           String
  role           Role            @default(USER)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  ideas          Idea[]          @relation("SubmittedIdeas")
  statusChanges  StatusHistory[] @relation("AdminChanges")

  // NextAuth fields (if using Prisma adapter)
  accounts       Account[]
  sessions       Session[]
}

model Idea {
  id          String      @id @default(cuid())
  title       String
  description String
  status      IdeaStatus  @default(SUBMITTED)
  visibility  Visibility  @default(PUBLIC)
  submitterId String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  submitter     User?           @relation("SubmittedIdeas", fields: [submitterId], references: [id], onDelete: SetNull)
  attachment    Attachment?
  statusHistory StatusHistory[]
}

model Attachment {
  id           String   @id @default(cuid())
  ideaId       String   @unique
  originalName String
  storedName   String
  storagePath  String
  mimeType     String
  sizeBytes    Int
  createdAt    DateTime @default(now())

  idea Idea @relation(fields: [ideaId], references: [id], onDelete: Cascade)
}

model StatusHistory {
  id        String     @id @default(cuid())
  ideaId    String
  adminId   String?
  oldStatus IdeaStatus
  newStatus IdeaStatus
  feedback  String
  changedAt DateTime   @default(now())

  idea  Idea  @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  admin User? @relation("AdminChanges", fields: [adminId], references: [id], onDelete: SetNull)
}

// NextAuth.js v5 required models
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

---

## Entity Relationship Diagram

```
User ──────────────────────────────────────────────────┐
│ id (PK)                                               │
│ email                                                 │
│ hashedPassword                                        │
│ name                                                  │
│ role (USER|ADMIN)                                     │
│ createdAt                                             │
└──────────┬─────────────────────────────────┐          │
           │ 1                               │ 1         │
           ▼ *                               ▼ *         │
         Idea                         StatusHistory ◄────┘
         │ id (PK)                    │ id (PK)       (adminId, nullable)
         │ title                      │ ideaId (FK)
         │ description                │ adminId (FK, null=system)
         │ status (enum)              │ oldStatus
         │ visibility (enum)          │ newStatus
         │ submitterId (FK, nullable) │ feedback
         │ createdAt                  │ changedAt
         └──────┬──────────────────────┘ *
                │ 1                     (ideaId)
                ▼ 0..1
            Attachment
            │ id (PK)
            │ ideaId (FK, unique)
            │ originalName
            │ storedName
            │ storagePath
            │ mimeType
            │ sizeBytes
```
