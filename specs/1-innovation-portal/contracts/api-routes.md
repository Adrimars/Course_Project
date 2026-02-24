# API Route Contracts: Innovation Portal

**Phase**: 1 | **Branch**: `1-innovation-portal` | **Date**: 2026-02-24

> All routes are prefixed with `/api`. All requests/responses use `application/json` unless noted.  
> Authentication: Session cookie managed by NextAuth.js. `401 Unauthorized` returned for unauthenticated access to protected routes.

---

## Authentication Routes

### `POST /api/auth/register`

Register a new user account.

**Auth required**: No  
**Request body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass1!",
  "name": "Jane Doe"
}
```

**Validation**:
- `email`: valid email format, unique
- `password`: min 8 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char
- `name`: min 2, max 100 chars

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `201` | `{ "id": "...", "email": "...", "name": "...", "role": "USER" }` | Success |
| `400` | `{ "error": "Validation failed", "details": {...} }` | Invalid input |
| `409` | `{ "error": "Email already in use" }` | Duplicate email |

---

### `POST /api/auth/[...nextauth]`

Handled by NextAuth.js. Covers `signIn`, `signOut`, `session`, `csrf` actions.

**Auth required**: N/A (NextAuth internals)  
**Note**: Client uses `signIn()` / `signOut()` from `next-auth/react`; do not call directly.

---

## Ideas Routes

### `GET /api/ideas`

List ideas with visibility filtering and pagination.

**Auth required**: Yes  
**Query params**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | `1` | Page number (1-based) |
| `pageSize` | integer | `20` | Items per page (max 50) |
| `status` | `SUBMITTED\|UNDER_REVIEW\|ACCEPTED\|REJECTED` | — | Filter by status |

**Visibility logic**: Regular user sees `PUBLIC` ideas + own `PRIVATE` ideas. Admin sees all.

**Response `200`**:
```json
{
  "ideas": [
    {
      "id": "clxyz123",
      "title": "Solar-Powered IoT Sensor",
      "category": "TECHNOLOGY",
      "status": "SUBMITTED",
      "visibility": "PUBLIC",
      "submitter": { "id": "...", "name": "Jane Doe" },
      "createdAt": "2026-02-24T10:00:00Z",
      "hasAttachment": true
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

---

### `POST /api/ideas`

Submit a new idea. Optionally includes a file attachment (multipart/form-data).

**Auth required**: Yes  
**Content-Type**: `multipart/form-data`  
**Form fields**:
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | min 10, max 200 |
| `description` | string | Yes | min 50, max 5000 |
| `category` | `TECHNOLOGY\|PROCESS\|PRODUCT\|COST_SAVING\|CUSTOMER_EXPERIENCE\|OTHER` | Yes | must match `IdeaCategory` enum |
| `visibility` | `PUBLIC\|PRIVATE` | No | default `PUBLIC` |
| `attachment` | File | No | PDF/DOC/DOCX/PNG/JPG, max 10 MB |

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `201` | Full idea object (see GET detail) | Success |
| `400` | `{ "error": "Validation failed", "details": {...} }` | Invalid fields |
| `400` | `{ "error": "File too large or unsupported type" }` | Bad attachment |
| `401` | `{ "error": "Unauthorized" }` | Not logged in |

---

### `GET /api/ideas/[id]`

Get full details of a single idea. **Admin side-effect**: if admin views a `SUBMITTED` idea, status auto-transitions to `UNDER_REVIEW`.

**Auth required**: Yes  
**Access control**: Regular user can access only `PUBLIC` ideas or own `PRIVATE` ideas. Admin can access all.

**Response `200`**:
```json
{
  "id": "clxyz123",
  "title": "Solar-Powered IoT Sensor",
  "description": "A detailed proposal for...",
  "category": "TECHNOLOGY",
  "status": "UNDER_REVIEW",
  "visibility": "PUBLIC",
  "submitter": { "id": "...", "name": "Jane Doe" },
  "createdAt": "2026-02-24T10:00:00Z",
  "updatedAt": "2026-02-24T11:00:00Z",
  "attachment": {
    "originalName": "proposal.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": 204800,
    "downloadUrl": "/api/ideas/clxyz123/attachment"
  },
  "statusHistory": [
    {
      "id": "...",
      "oldStatus": "SUBMITTED",
      "newStatus": "UNDER_REVIEW",
      "feedback": "Automatically set to Under Review upon admin view",
      "admin": null,
      "changedAt": "2026-02-24T11:00:00Z"
    }
  ]
}
```

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `200` | Idea detail object | Success |
| `403` | `{ "error": "Access denied" }` | Accessing private idea without permission |
| `404` | `{ "error": "Idea not found" }` | ID does not exist |

---

### `PATCH /api/ideas/[id]`

Two-role endpoint — handler routes by payload and caller role:
- **Admin** (`role === ADMIN`): evaluates idea by setting status with required feedback
- **Submitter** (caller is the idea's owner): changes visibility setting (PUBLIC ↔ PRIVATE)

#### Admin: Evaluate Idea

**Auth required**: Yes, `ADMIN` role

**Request body**:
```json
{
  "status": "ACCEPTED",
  "feedback": "Excellent proposal with clear ROI metrics."
}
```

**Validation**:
- `status`: must be `ACCEPTED` or `REJECTED` (or any valid `IdeaStatus` for overrides)
- `feedback`: required, min 10 chars

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `200` | Updated idea object | Success |
| `400` | `{ "error": "Feedback is required" }` | Missing/short feedback |
| `403` | `{ "error": "Admin role required" }` | Caller is neither admin nor submitter |
| `404` | `{ "error": "Idea not found" }` | ID does not exist |

#### Submitter: Change Visibility

**Auth required**: Yes, must be the idea's submitter

**Request body**:
```json
{ "visibility": "PRIVATE" }
```

**Validation**: `visibility` must be `PUBLIC` or `PRIVATE`

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `200` | Updated idea object | Success |
| `400` | `{ "error": "Invalid visibility value" }` | Not a valid visibility enum |
| `403` | `{ "error": "Access denied" }` | Caller is not the idea's submitter |
| `404` | `{ "error": "Idea not found" }` | ID does not exist |

**Handler routing**: payload contains `{ status, feedback }` → admin evaluation path; payload contains `{ visibility }` → submitter visibility path; role/ownership mismatch → 403.

---

### `GET /api/ideas/[id]/attachment`

Download the file attached to an idea.

**Auth required**: Yes  
**Access control**: Same visibility rules as `GET /api/ideas/[id]`

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `200` | Binary file stream | Success; `Content-Disposition: attachment; filename="original.pdf"` |
| `404` | `{ "error": "No attachment found" }` | Idea has no attachment |
| `403` | `{ "error": "Access denied" }` | Visibility restriction |

---

## Users Routes

### `PATCH /api/users/[id]`

Promote a user to `ADMIN` role.

**Auth required**: Yes, `ADMIN` role

**Request body**:
```json
{
  "role": "ADMIN"
}
```

**Responses**:
| Status | Body | Condition |
|--------|------|-----------|
| `200` | `{ "id": "...", "email": "...", "role": "ADMIN" }` | Success |
| `400` | `{ "error": "Invalid role" }` | Role value not recognised |
| `403` | `{ "error": "Admin role required" }` | Non-admin caller |
| `404` | `{ "error": "User not found" }` | ID does not exist |

---

## Error Response Shape (standard)

All error responses follow:
```json
{
  "error": "Human-readable message",
  "details": { /* optional: Zod validation errors keyed by field */ }
}
```

---

## Rate Limiting & Security Notes

- All API routes: Input sanitised via Zod before DB interaction
- Prisma parameterised queries prevent SQL injection
- React DOM escaping prevents XSS on client
- File upload: MIME validated server-side; stored outside `public/` directory
- Sessions: NextAuth.js JWT; `httpOnly`, `secure`, `sameSite=lax` cookies
