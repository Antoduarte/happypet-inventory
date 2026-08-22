# Proposal: cash-session-day-boundary-fix

## Intent

Fix a bug where a cashier's open cash session appeared closed in the UI in the evening (reported as "closes around 8pm, should be 11:59pm"), while the backend simultaneously refused to open a new session with "there is already an open session for this cash register" — an internally contradictory state caused by two different definitions of "today" living side by side in the same feature.

## Background

`cash-session-flow` introduced `is_today` and assumed (see its proposal, "Out of Scope") that "date-based filtering" fully solved the stale-session problem. That assumption held only if every "is this today?" check used the same day boundary. It didn't: most of the cash app resolves "today" via `get_today_range()` (`happypet/cash/utils.py`), which correctly uses `timezone.localtime()` against `TIME_ZONE = "America/Managua"` (UTC-6). Two spots instead used `timezone.now()` directly, which is UTC:

- `CashSessionSerializer.get_is_today()` — compared `opened_at.date()` to `timezone.now().date()`, both implicitly UTC dates.
- `CashSessionOpenSerializer.validate_cash_register_id()` — computed `today_start`/`today_end` from `timezone.now().replace(hour=0, ...)`, a UTC-day window.

Because UTC is 6 hours ahead of `America/Managua`, the UTC calendar date rolls over at **18:00 local time**. From that point until local midnight, a session opened earlier that same local day has `opened_at` in UTC-date `D`, while `timezone.now()` is already UTC-date `D+1` — so `is_today` flips to `false` even though it is still the same local business day.

- **Frontend impact**: `CurrentSessionPage.tsx` and `ResumeSessionPage.tsx` both redirect to `/cash/open` whenever `session.is_today === false` — this is what cashiers perceived as "the register closing itself" in the evening.
- **Backend impact**: Opening a new session still correctly found the same local-day session as open (via `get_today_range()` in `CashSessionService.open_session`) and rejected the attempt — hence "ya hay una activa" right after the UI implied there wasn't one.

No auto-close scheduler exists or is needed; the sessions were never actually closed. This was a pure day-boundary inconsistency bug.

## Scope

### In Scope
- **Backend**: `CashSessionSerializer.get_is_today()` — compare local dates instead of UTC dates
- **Backend**: `CashSessionOpenSerializer.validate_cash_register_id()` — reuse `get_today_range()` instead of a UTC-based hand-rolled window
- **Backend**: Regression tests reproducing the local-evening / UTC-rollover scenario

### Out of Scope
- Auditing date-boundary logic outside the `cash` app (sales reporting date filters, etc.) — flagged as a follow-up, not fixed here
- Any actual auto-close/scheduled-close feature — none exists; this was a misdiagnosed "it closes at night" bug, not a scheduler
- Frontend changes — the frontend behavior (redirect on `is_today === false`) is correct; only the backend's computation of that field was wrong

## Approach

Standardize both call sites on the existing `get_today_range()` helper (or `timezone.localtime()` for a single-instant comparison), matching the pattern already used in `CashSessionService.open_session` and `CashSessionViewSet.active`. No new helper introduced — the fix is to stop bypassing the one that already existed.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `backend/happypet/cash/serializers.py` | Modified | `get_is_today` now uses `timezone.localtime()` on both sides of the comparison |
| `backend/happypet/cash/serializers.py` | Modified | `validate_cash_register_id` now uses `get_today_range()` instead of a UTC-based window |
| `backend/happypet/cash/tests.py` | Added | `CashSessionTimezoneBoundaryTests` — regression coverage for the UTC/local mismatch |

Frontend: none required.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Other undiscovered UTC-vs-local date comparisons elsewhere in `cash`/`sales` | Medium | Grepped `backend/` for `timezone.now().date()` and `timezone.now().replace(hour=0` — no other occurrences found at time of fix; broader date-filter audit left as follow-up (see Open Questions) |
| Behavior change for any client relying on the old (buggy) UTC-day `is_today` value | Low | The old behavior was the bug being reported; no legitimate use case depends on it |

## Rollback Plan

1. Revert `get_is_today` to `obj.opened_at.date() == timezone.now().date()`
2. Revert `validate_cash_register_id` to the inline `timezone.now().replace(hour=0, ...)` window
3. Remove `CashSessionTimezoneBoundaryTests` from `happypet/cash/tests.py`

## Dependencies

- `happypet/cash/utils.py::get_today_range()` — already existed, used by `CashSessionService.open_session` and `CashSessionViewSet.active`; this change makes the rest of the module consistent with it.

## Success Criteria

- [x] `is_today` remains `true` for a session opened earlier in the local day, even after the UTC calendar date has rolled over (i.e., after ~18:00 America/Managua time)
- [x] Opening-session validation and the `is_today` field agree on whether "today's" session is still open, at any hour
- [x] Regression tests fail against the pre-fix code and pass against the fix
- [x] No regressions in existing `happypet.cash.tests` suite (pre-existing, unrelated failures in `CashReportViewTests`/`CashMovementFilterTests` date-range tests are unaffected by this change — confirmed via `git stash` comparison)

## Open Questions

- [ ] Should `happypet/sales/services.py` and `happypet/sales/serializers.py` (which also call `get_today_range()` correctly today) be covered by a shared regression test to prevent a future regression back to `timezone.now().date()`?
- [ ] Worth a lint rule / code review checklist item banning bare `timezone.now().date()` in favor of `timezone.localtime().date()` project-wide?
