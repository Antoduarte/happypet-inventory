# Tasks: cash-session-flow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150-200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Backend — Active Session Endpoint

- [x] 1.1 Add `get_active_session` action (`detail=False, methods=["get"], url_path="active"`) to `CashSessionViewSet` in `backend/happypet/cash/views.py` — filter by `user=request.user`, `opened_at__date=today`, `status=open`; return 404 if none found
- [x] 1.2 Add `is_today = SerializerMethodField()` to `CashSessionSerializer` in `backend/happypet/cash/serializers.py` — implement `get_is_today` returning whether `opened_at.date() == today`
- [x] 1.3 Verify URL is auto-wired by DRF router (action decorator with `url_path="active"` produces `/cash-sessions/active/`)

## Phase 2: Backend — Sale Auto-Link

- [x] 2.1 In `SaleCreateSerializer.create()` in `backend/happypet/sales/serializers.py`, before popping `cash_session`, auto-lookup active session via `self.context["request"].user` and today's date; inject into `validated_data["cash_session"]` if found
- [x] 2.2 Keep explicit `cash_session_id` from payload as override if provided; gracefully skip auto-link if no session exists (no error)

## Phase 3: Frontend — Cash Service

- [x] 3.1 Add `getActiveSession()` to `CashSessionService` in `frontend/src/services/cash/index.ts` — `GET /api/cash-sessions/active/`, return `CashSession`, throw on error
- [x] 3.2 Export `ActiveSessionResponse` type if distinct from `CashSession`

## Phase 4: Frontend — AuthProvider Redirect

- [x] 4.1 In `AuthProvider.tsx` `login` callback, after `setIsAuthenticated(true)`, call `cashSessionService.getActiveSession()`
- [x] 4.2 On 200 response: `window.location.href = '/'`
- [x] 4.3 On 404: `window.location.href = '/cash/open'`
- [x] 4.4 On any other error: `window.location.href = '/'` (graceful — do not block login)

## Phase 5: Frontend — OpenSessionPage Redirect Fix

- [x] 5.1 In `OpenSessionPage.tsx`, change `onSuccess` redirect from `navigate(\`/cash-session/${session.id}\`)` to `navigate('/')`

## Phase 6: Verification

- [ ] 6.1 Run `python manage.py test` inside `backend/` — verify no regressions
- [ ] 6.2 Run `npm run build` in `frontend/` — verify TypeScript compiles cleanly
- [ ] 6.3 Manual: login as user with open cash session → should redirect to dashboard (`/`)
- [ ] 6.4 Manual: login as user with no open session → should redirect to `/cash/open`

## Implementation Order

1. **Phase 1** (backend endpoint) — other components call it
2. **Phase 2** (sale auto-link) — independent, can run in parallel with Phase 1
3. **Phase 3** (frontend service) — depends on Phase 1 endpoint existing
4. **Phase 4** (AuthProvider) — depends on Phase 3 service
5. **Phase 5** (OpenSessionPage) — independent fix
6. **Phase 6** (verification) — run after all code changes

## File Summary

| File | Phase | What changes |
|------|-------|--------------|
| `backend/happypet/cash/views.py` | 1 | Add `get_active_session` action |
| `backend/happypet/cash/serializers.py` | 1 | Add `is_today` field |
| `backend/happypet/sales/serializers.py` | 2 | Auto-link sale to active session |
| `frontend/src/services/cash/index.ts` | 3 | Add `getActiveSession()` |
| `frontend/src/context/AuthProvider.tsx` | 4 | Post-login session check + redirect |
| `frontend/src/pages/CashSession/OpenSessionPage.tsx` | 5 | Fix redirect target to `/` |