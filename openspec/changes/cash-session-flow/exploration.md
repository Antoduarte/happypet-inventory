# Exploration: Cash Session UX Flow — HappyPet Inventory

**Date**: 2026-06-01
**Change**: `cash-session-flow`
**Topic Key**: `sdd/cash-session-flow/explore`
**Type**: `architecture`

---

## Current State

### What Exists

| Layer | What's Built | Status |
|-------|-------------|--------|
| **Backend Models** | `CashRegister`, `CashSession`, `CashMovement` with all needed fields (`status`, `opened_at`, `closed_at`, FKs to user/register) | ✅ Works |
| **Backend Services** | `CashSessionService.open_session`, `close_session`, `get_current_session` — all implemented | ✅ Works |
| **Backend Views** | Full CRUD + custom actions: `POST /cash-sessions/open/`, `GET /cash-sessions/current/?cash_register_id=`, `POST /{id}/close/`, `GET /{id}/report/` | ✅ Works |
| **Sale ↔ CashSession link** | `Sale.cash_session` FK exists. `SaleCreateSerializer` accepts `cash_session_id` and validates it's open. `SaleService._complete_sale` creates `CashMovement` on cash sale completion | ✅ Works |
| **Frontend hooks** | `useCashRegisters`, `useCurrentSession`, `useOpenSession`, `useCloseSession`, `useCashMovements` in `frontend/src/hooks/cash/index.ts` | ✅ Works |
| **Frontend pages** | `CashSessionIndexPage`, `OpenSessionPage`, `CurrentSessionPage`, `SessionReportPage` | ✅ UI works |
| **Auth flow** | `Login` → `AuthProvider.login()` → stores JWT + role + userId in localStorage | ✅ Works |

### What's Broken / Missing

| # | Gap | Impact | Complexity |
|---|-----|--------|------------|
| 1 | **No "check active session after login" logic** — After `login()` succeeds, the app redirects to `/` (Dashboard). No code checks if the logged-in user already has an open `CashSession`. | User lands on dashboard even if they should first open a session | Medium |
| 2 | **No auto-close at 11:59 PM** — No scheduler exists. Django runs without Celery or any task queue. `opened_at` and `closed_at` exist on `CashSession` but nothing enforces the end-of-day closure. | Sessions stay open indefinitely past midnight | High |
| 3 | **Sale creation doesn't auto-link to active cash session** — `buildPayload()` in `useSaleForm` never includes `cash_session_id`. The `SaleCreateSerializer` accepts it but the frontend never sends it. Cash sales don't register the movement | Revenue leakage | Medium |
| 4 | **No "my open session" endpoint** — `GET /cash-sessions/current/` requires `cash_register_id`. There's no endpoint like `GET /cash-sessions/my-open/` that returns the current user's active session across any register. | Frontend can't know which session belongs to the logged-in user without knowing the register | Medium |
| 5 | **No "require open session" guard** — There's no mechanism to prevent a cashier from making a cash sale without an open session | No enforcement | Low |

---

## Affected Areas

- `frontend/src/context/AuthProvider.tsx` — `login()` callback needs extension (post-login session check + redirect)
- `frontend/src/hooks/cash/index.ts` — needs `useMyActiveSession()` hook (no backend endpoint yet)
- `backend/happypet/cash/views.py` — needs `GET /cash-sessions/my-open/` action (no auth-gated user session lookup)
- `backend/happypet/sales/hooks/useSaleForm.ts` — `buildPayload()` doesn't include `cash_session_id`
- `frontend/src/pages/Sales/SaleFormPage.tsx` — needs cash session context to pass to form
- **No scheduler/background task infrastructure** — Django runs bare, no Celery/Beat/RQ
- `frontend/src/pages/Dashboard/Dashboard.tsx` — currently static, could show active session status

---

## Approaches

### 1. Minimal — Patch the Gaps Per Feature

Implement the 5 gaps one by one without infrastructure changes.

**Backend:**
- Add `GET /cash-sessions/my-open/` that returns the current user's open session (no register_id needed)
- Create a Django management command `close_expired_sessions` and document it for cron/Windows Task Scheduler

**Frontend:**
- Add `useMyActiveSession` hook calling the new endpoint
- Extend `AuthProvider.login()` to check active session and redirect to `/cash-session/open` if none exists
- Extend `buildPayload()` to include `cash_session_id` from active session context

| Pros | Cons |
|------|------|
| No new infrastructure dependencies | Auto-close relies on external cron (Windows Task Scheduler) |
| Each piece is independently testable | User experience still has friction (sale flow needs active session context) |
| Low blast radius | |

**Effort**: Medium

---

### 2. Full Flow — Unified Cash Session UX + Background Auto-Close

Add a proper background task system (Celery + Redis/Beat equivalent) and implement all UX flows.

**Backend:**
- Celery Beat schedule: daily at 23:59 close all open sessions (or a management command callable by cron)
- Add `GET /cash-sessions/my-open/` endpoint
- SaleCreateSerializer auto-links sale to active user session if payment_type is cash and no explicit `cash_session_id` sent (implicit session linking)
- Add `IsCashier` permission to enforce session requirement

**Frontend:**
- AuthProvider post-login: check active session → redirect to OpenSession or Dashboard
- Create `CashSessionGate` component: if no active session, show OpenSession screen; else render children with session context
- `SaleFormPage` reads active session from context; shows "Sin sesión de caja" warning if cash sale without session
- Dashboard shows "Sesión de caja activa" banner with link to current session

| Pros | Cons |
|------|------|
| Complete UX flow, fully enforced | Adds Celery + Redis as dependencies (infrastructure) |
| Auto-close is automatic, not cron-dependent | More complex setup |
| Consistent experience — cash sales always linked | Harder to rollback |

**Effort**: High

---

## Recommendation

**Approach 1 (Minimal)** is the right starting point because:
1. No new infrastructure (no Celery/Redis) — the user already has a working Django + PostgreSQL setup
2. The auto-close can use a **Django management command + Windows Task Scheduler** (or a simple `cron` on any server) — reliable enough for a small shop inventory system
3. The missing UX flow pieces (login → session check, sale → session link) are implementable in the frontend without touching the backend API contract fundamentally

**Next phase (sdd-propose)** should define:
- Whether to add a background task library or use cron/Task Scheduler
- The exact redirect logic after login (always dashboard? always check session first?)
- Whether to auto-create the cash movement on sale completion server-side (already partially exists in `SaleService._complete_sale`)

---

## Risks

- **Risk 1**: Auto-close via external scheduler — if the cron/Task Scheduler job fails or never runs, sessions stay open. Mitigation: add a "stale session" check when `current/` is called (flag sessions > 24h as suspicious)
- **Risk 2**: `SaleCreateSerializer` validates that `cash_session_id` points to an open session — but the frontend will start sending it. Need to ensure the frontend doesn't crash when no session exists (cashiers can still do non-cash sales)
- **Risk 3**: Redis is not installed — if we go Celery route, requires new infrastructure setup
- **Risk 4**: The existing `sale.cash_session` link is optional (nullable) — the business rule "cash sales MUST have a session" isn't enforced at model level, only at serializer validation

---

## Open Questions

1. Should **cashiers without an open session** be blocked from creating cash sales entirely, or just shown a warning?
2. When a user has an open session on **Register A** but opens the POS on **Register B**, what happens? (Current `current/` endpoint requires `cash_register_id` — needs UX decision)
3. Is the `cash_session_id` on sale creation supposed to be **user-selected** (cashier picks which session) or **automatically derived** from the logged-in user?
4. What is the desired behavior when a session is auto-closed at 11:59 PM — should it use the `expected_amount` as `counted_amount` (no physical count) or stay open for manual close next day?
5. Does the user have Redis available for Celery, or should we avoid adding it?

---

## Ready for Proposal

**Yes** — the exploration is complete. The missing pieces are well-defined. Proceed to **sdd-propose** to define intent, scope, and approach before sdd-spec.