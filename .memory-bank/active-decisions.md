# Innovation Portal — Active Decisions & Context

## Resolved Decisions

### ✅ D1: Independent Sessions Per Tab
**Decision:** Option A — Full sessionStorage-based auth rewrite.
Replace NextAuth cookie-based sessions with sessionStorage tokens so each browser tab holds an independent session.

### ✅ D2: Status States
**Decision:** Keep and extend the existing statuses:
```
SUBMITTED → UNDER_REVIEW → ACCEPTED / REJECTED / INSPECTING
```
- `INSPECTING` is a **new** status added to the enum
- Status changes are **admin/inspector-only** — users cannot change statuses
- Proper transition rules must be enforced server-side (BUG-6 fix + new state)

### ✅ D3: Role Hierarchy
```
USER < INSPECTOR < ADMIN
```

| Permission                         | USER | INSPECTOR | ADMIN |
|------------------------------------|------|-----------|-------|
| Submit ideas                       | ✅   | ✅        | ✅    |
| View public ideas                  | ✅   | ✅        | ✅    |
| View ALL ideas (incl. private)     | ❌   | ✅        | ✅    |
| Toggle own idea visibility         | ✅   | ✅        | ✅    |
| Delete/edit files on any idea      | ❌   | ✅        | ✅    |
| Set idea to INSPECTING mode        | ❌   | ✅        | ✅    |
| Evaluate ideas (status + feedback) | ❌   | ✅        | ✅    |
| Grant/revoke roles                 | ❌   | ❌        | ✅    |
| Assign tasks to users              | ❌   | ❌        | ✅    |

### ✅ D4: INSPECTING Mode Behavior
- When an idea is set to `INSPECTING`, **regular users cannot see it** (hidden from their lists/detail)
- The idea appears in the **Inspector's "My Ideas"** section
- Admins can also see and manage INSPECTING ideas

### ✅ D5: Tasks = Ideas (Naming)
- Tasks and ideas are the **same entity**
- The tab is called **"My Ideas"**
- Only **admins** can assign ideas to users

### ✅ D6: "My Ideas" Tab Content
| Role      | Shows ideas in states                                      |
|-----------|------------------------------------------------------------|
| USER      | Own ideas in **UNDER_REVIEW** + ideas assigned to them     |
| INSPECTOR | All of USER's + ideas in **INSPECTING** state              |
| ADMIN     | All of INSPECTOR's (full visibility)                       |

### ✅ D7: Notes System
Two types of notes per idea:
- **Personal notes** — only visible to the note author
- **Collaborative notes** — visible to all collaborators, inspectors, and admins

### ✅ D8: Join Project = Collaborate
- Users can request to join/collaborate on existing ideas
- Pending requests appear in the idea owner's "My Ideas" section
- Accepted collaborators see the idea in their "My Ideas"

## Open Question

### ❓ Q-FINAL: "On Progress" Status
The user mentioned "My Ideas" should show "reviewing and on progress states" for USER role, but the confirmed statuses are `SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED, INSPECTING` — there is no explicit `ON_PROGRESS` status.

**Current interpretation:** "On progress" likely means ideas assigned to the user (i.e., they're actively working on them). So "My Ideas" for USER = own UNDER_REVIEW ideas + admin-assigned ideas. **Awaiting final confirmation.**
