# Tasks: cash-session-day-boundary-fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: n/a
400-line budget risk: Low

## Phase 1: Backend — Fix Day-Boundary Comparisons

- [x] 1.1 `CashSessionSerializer.get_is_today()` in `backend/happypet/cash/serializers.py` — compare `timezone.localtime(obj.opened_at).date()` to `timezone.localtime().date()` instead of UTC `timezone.now().date()`
- [x] 1.2 `CashSessionOpenSerializer.validate_cash_register_id()` in `backend/happypet/cash/serializers.py` — replace the inline `timezone.now().replace(hour=0, ...)` window with `get_today_range()` from `happypet.cash.utils`
- [x] 1.3 Remove the now-unused `from datetime import timedelta` import

## Phase 2: Regression Tests

- [x] 2.1 Add `CashSessionTimezoneBoundaryTests` to `backend/happypet/cash/tests.py`
- [x] 2.2 `test_is_today_true_late_in_local_day_despite_utc_rollover` — session opened local 09:00, `is_today` checked with mocked "now" at local 23:00 (already next UTC calendar date) — must be `true`
- [x] 2.3 `test_cannot_open_second_session_late_in_local_day` — same setup, verify `POST /api/cash-sessions/open/` is still rejected with 400 at that hour (consistency check between the two fixed call sites)

## Phase 3: Verification

- [x] 3.1 Run `python manage.py test happypet.cash.tests --keepdb` — 56 tests; only pre-existing/unrelated failures remain
- [x] 3.2 Confirm pre-existing failures are unaffected by this change via `git stash -- happypet/cash/serializers.py` + re-run
- [x] 3.3 Confirm the two new tests fail against pre-fix `serializers.py` (via the same stash) and pass against the fix
- [ ] 3.4 `npm run build` in `frontend/` — not run; no frontend files touched by this change (repo has known pre-existing, unrelated TS build errors — see project memory `prod-build-preexisting-ts-errors`)

## Implementation Order

1. **Phase 1** (the fix itself) — both call sites can be fixed together, they're in the same file
2. **Phase 2** (regression tests) — written and confirmed to fail pre-fix / pass post-fix
3. **Phase 3** (verification) — full suite + pre-existing-failure isolation

## File Summary

| File | Phase | What changes |
|------|-------|--------------|
| `backend/happypet/cash/serializers.py` | 1 | `get_is_today` and `validate_cash_register_id` now use local-time day boundaries |
| `backend/happypet/cash/tests.py` | 2 | New `CashSessionTimezoneBoundaryTests` class |
