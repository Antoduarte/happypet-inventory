# Proposal: cash-session-flow

## Intent

Close the UX gap between login and cash operations: after a cashier logs in, the system MUST determine whether they have an open cash session for today and route them to the appropriate screen — either the OpenSession page or the Dashboard — before any cash sale can occur.

## Scope

### In Scope
- **Backend**: `GET /api/cash/sessions/active/` — returns today's open session for the authenticated user (or 404)
- **Backend**: `CashSessionSerializer` — add `is_today` computed field
- **Backend**: `SaleCreateSerializer` — auto-link new sale to user's active session (nullable FK)
- **Frontend**: Post-login session check via `GET /api/cash/sessions/active/` + redirect (`/cash/open` if 404, dashboard if 200)
- **Frontend**: `OpenSessionPage` — verify it accepts `opening_amount` and POSTs to `/api/cash/sessions/`

### Out of Scope
- Auto-close scheduler (solved by date-based filtering — no stale session problem)
- Cash movement tracking improvements
- User permissions/auth refactoring
- Cash session reports

## Approach

**Backend:**
1. Add `CashSessionViewSet.get_active_session()` — custom action `GET /cash/sessions/active/` filtered by `user=request.user`, `opened_at__date=today`, `status='open'`
2. Add `is_today` computed field to `CashSessionSerializer`
3. In `SaleCreateSerializer.create()`, lookup active session for current user on current date and auto-fill `cash_session` if not provided. If no session exists, sale creates without `cash_session` (graceful degradation)

**Frontend:**
1. `AuthProvider.login()` success callback: call `GET /api/cash/sessions/active/`
   - 200 → redirect to `/`
   - 404 → redirect to `/cash/open`
2. `OpenSessionPage`: verify existing form POSTs `opening_amount` to `/api/cash/sessions/` and redirects to `/` on success

**Simplification**: Date-based filtering replaces active flag logic. One session per user per day enforced by query filter, not unique constraint.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/happypet/cash/views.py` | Modified | Add `get_active_session` custom action |
| `backend/happypet/cash/serializers.py` | Modified | Add `is_today` field to CashSessionSerializer |
| `backend/happypet/sales/serializers.py` | Modified | Auto-link sale to active session on creation |
| `frontend/src/context/AuthProvider.tsx` | Modified | Post-login session check + redirect logic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sale creation fails if no active session | Low | `cash_session` FK is nullable; sale creates without it |
| Multiple sessions same day per user | Low | Backend query filter; can add unique constraint if needed |
| OpenSessionPage UX mismatch | Medium | Verify page only asks for `opening_amount` before building |

## Rollback Plan

1. Revert `SaleCreateSerializer` to not auto-fill `cash_session`
2. Remove `get_active_session` view action
3. Remove session-check redirect from `AuthProvider.login()`
4. Revert `CashSessionSerializer` — remove `is_today` field

## Dependencies

- Frontend: React Query already configured (no new deps)
- Backend: `CashSession` model, `Sale` model with `cash_session` FK already exist

## Success Criteria

- [ ] Login → active session exists → goes to dashboard (no intermediate screen)
- [ ] Login → no active session → goes to `/cash/open`
- [ ] Open session with amount → creates `CashSession` → goes to dashboard
- [ ] Sale created → `sale.cash_session` FK populated with today's session
- [ ] No active session + create sale → sale creates without `cash_session` (graceful)