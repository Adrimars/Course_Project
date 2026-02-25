# Phase 0 Bug Fixes — Testing Scenarios

> Run after all fixes are applied. TS lint errors for `INSPECTING` will resolve after Phase 1 Prisma migration.

---

## Automated Tests

```bash
cd innovation-portal
npx jest tests/unit/validations/idea.test.ts
```

**Expected**: All pass, including the new `INSPECTING` status test case.

---

## Manual Testing Scenarios

### BUG-1: Race Condition — Last Admin Demotion
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1.1 | Single admin cannot be demoted | As admin, try `PATCH /api/users/{admin-id}` with `{"role":"USER"}` | 409: "Cannot remove the last administrator." |
| 1.2 | Self-demotion blocked | As admin, try to change own role | 400: "You cannot change your own role." |
| 1.3 | Normal demotion works | Create 2 admins, demote one | 200: Role updated to USER |
| 1.4 | Concurrent demotion safety | 2 admins simultaneously demote each other (use two API calls in quick succession) | Exactly one succeeds, one fails with 409 |

### BUG-2: MIME Type Magic Byte Validation
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 2.1 | Valid PNG upload | Submit idea with real PNG image | 201: Idea created with attachment |
| 2.2 | Valid PDF upload | Submit idea with real PDF file | 201: Idea created with attachment |
| 2.3 | Spoofed MIME type | Rename `.exe` to `.png`, submit as `image/png` | 422: "File type not allowed" |
| 2.4 | No file | Submit idea without attachment | 201: Idea created, no attachment |
| 2.5 | File too large | Upload >10MB file | 413: "File size exceeds 10MB limit" |

### BUG-3: Idempotent Auto-Transition
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 3.1 | Admin views SUBMITTED idea | Open idea detail as admin | Status changes to UNDER_REVIEW, 1 history entry |
| 3.2 | Admin re-opens same idea | Refresh the page | No duplicate history entry created |
| 3.3 | Two admins open simultaneously | Open same SUBMITTED idea in 2 admin tabs at once | Exactly 1 StatusHistory entry |

### BUG-4: Category Display
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 4.1 | Multi-underscore category | View idea with `CUSTOMER_EXPERIENCE` category | Displays as "Customer Experience" (both underscores replaced) |
| 4.2 | Single-underscore category | View idea with `COST_SAVING` | Displays as "Cost Saving" |
| 4.3 | No-underscore category | View idea with `TECHNOLOGY` | Displays as "Technology" |

### BUG-5: Admin Filter + Pagination
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 5.1 | Filter then paginate | Click "SUBMITTED" filter → click "Next" page | URL has both `status=SUBMITTED` and `page=2` |
| 5.2 | Paginate then filter | Go to page 2 → click "ACCEPTED" filter | URL resets to page 1 with `status=ACCEPTED` |
| 5.3 | Clear filter | Click "All" after filtering | Shows all ideas, page=1 |

### BUG-6: Status Transition Rules
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 6.1 | Valid: UNDER_REVIEW → ACCEPTED | Admin evaluates with status=ACCEPTED | 200: Status updated |
| 6.2 | Valid: UNDER_REVIEW → REJECTED | Admin evaluates with status=REJECTED | 200: Status updated |
| 6.3 | Invalid: SUBMITTED → ACCEPTED | `PATCH` with status=ACCEPTED on SUBMITTED idea | 422: "Cannot transition from SUBMITTED to ACCEPTED" |
| 6.4 | Invalid: ACCEPTED → REJECTED | Try to go directly from ACCEPTED to REJECTED | 422: Invalid transition |
| 6.5 | Valid: ACCEPTED → UNDER_REVIEW | Re-open an accepted idea | 200: Status reverted |
| 6.6 | Valid: UNDER_REVIEW → INSPECTING | Set idea to INSPECTING mode | 200: Status updated *(TS error until Phase 1 migration)* |

### BUG-7: Pagination URL Construction  
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 7.1 | Dashboard pagination | Navigate to page 2 on dashboard | URL: `/dashboard?page=2` |
| 7.2 | Admin filtered pagination | Filter by SUBMITTED, go to page 2 | URL: `/admin?status=SUBMITTED&page=2` |
| 7.3 | Admin unfiltered pagination | No filter, go to page 3 | URL: `/admin?page=3` |

---

## Summary

| Bug | Fix Verified By | Automated Test |
|-----|----------------|----------------|
| BUG-1 | Scenarios 1.1–1.4 | Integration (with DB) |
| BUG-2 | Scenarios 2.1–2.5 | Manual only |
| BUG-3 | Scenarios 3.1–3.3 | Manual only |
| BUG-4 | Scenarios 4.1–4.3 | Manual (visual) |
| BUG-5 | Scenarios 5.1–5.3 | Manual (URL check) |
| BUG-6 | Scenarios 6.1–6.6 | `idea.test.ts` (INSPECTING) |
| BUG-7 | Scenarios 7.1–7.3 | Manual (URL check) |
