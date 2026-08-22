# Design: cash-session-day-boundary-fix

## Technical Approach

No new abstraction is introduced. The fix removes two call sites that bypassed the existing `get_today_range()` helper and reuses it (or `timezone.localtime()` directly for a single-instant comparison), matching the pattern already established in `CashSessionService.open_session` and `CashSessionViewSet.active`.

## Root Cause — Sequence of Events

```
TIME_ZONE = America/Managua (UTC-6)

Local day D, 09:00  ──► Cashier opens session. opened_at stored as
                          UTC D 15:00 (09:00 + 6h, same UTC calendar date).

Local day D, 18:00  ──► UTC clock crosses midnight into UTC date D+1.
                          From here on, timezone.now() is UTC-dated D+1,
                          but the local calendar day is still D.

Local day D, 20:00  ──► Cashier's screen polls session state.
                          OLD get_is_today():
                            obj.opened_at.date()   -> D   (UTC date of stored value)
                            timezone.now().date()  -> D+1 (UTC date "now")
                            D == D+1  ->  False
                          Frontend sees is_today=false -> redirects to /cash/open,
                          i.e. "the register looks closed."

Local day D, 20:01  ──► Cashier tries to open a new session for the same register.
                          CashSessionService.open_session() (unaffected by the bug)
                          uses get_today_range() -> localtime-based window still
                          covering local day D -> finds the session opened at 09:00
                          still counts as "open today" -> raises
                          "There is already an open session for this cash register."

Result: UI says "no active session", API says "one already exists" — for the
        SAME session, at the SAME moment.
```

## Architecture Decisions

### Decision 1: Reuse `get_today_range()` vs. inline `timezone.localtime()`

**Choice**: `get_is_today` uses `timezone.localtime()` directly (single-instant field, doesn't need a range); `validate_cash_register_id` imports `get_today_range()` (needs a `[start, end)` window, same shape the function already returns).

**Alternatives considered**: Add a new `is_same_local_day(dt)` utility.

**Rationale**: `get_today_range()` already exists and is already the source of truth used by `CashSessionService.open_session` and `CashSessionViewSet.active`. Introducing a second helper would recreate the exact kind of "two definitions of today" divergence this fix is meant to eliminate. `timezone.localtime()` is Django's own idiomatic call for "convert an aware datetime (or `now()`) to the configured local timezone" — no wrapper needed for a single comparison.

---

### Decision 2: Fix scope — cash app only, not a project-wide date-boundary audit

**Choice**: Fix only the two confirmed call sites in `happypet/cash/serializers.py`.

**Alternatives considered**: Grep and fix every `timezone.now()` usage repo-wide in the same change.

**Rationale**: A targeted grep for `timezone.now().date()` and `timezone.now().replace(hour=0` across `backend/` turned up exactly these two occurrences. Widening scope to a general timezone audit risks touching unrelated, untested code paths without a concrete reported symptom. Logged as an Open Question in the proposal for a deliberate follow-up instead.

## File Changes

| File | Action | Description |
|------|--------|--------------|
| `backend/happypet/cash/serializers.py` | Modify | `get_is_today`: compare `timezone.localtime(obj.opened_at).date()` to `timezone.localtime().date()` |
| `backend/happypet/cash/serializers.py` | Modify | `validate_cash_register_id`: replace inline UTC window with `get_today_range()` from `happypet.cash.utils` |
| `backend/happypet/cash/serializers.py` | Modify | Drop now-unused `from datetime import timedelta` import |
| `backend/happypet/cash/tests.py` | Add | `CashSessionTimezoneBoundaryTests` with two regression tests |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `get_is_today` local-day correctness | Create a session with `opened_at` forced to local 09:00; mock `timezone.now()` (patched at `happypet.cash.serializers.timezone.now`) to a UTC instant corresponding to local 23:00 the same day; assert `is_today is True`. Verified to fail against pre-fix code. |
| Unit | Open-session validation consistency | Same setup, mock `timezone.now()` at `happypet.cash.utils.timezone.now` (the module `get_today_range()` reads from), POST to `/api/cash-sessions/open/`, assert `400 Bad Request` |
| Regression | Full `happypet.cash` suite | `python manage.py test happypet.cash.tests --keepdb` — 56 tests, only pre-existing/unrelated failures in date-range report tests remain (confirmed present before this change via `git stash`) |

## Migration

None. No schema changes, no data backfill — this is a pure computation fix over existing `opened_at` values.

## Open Questions

Carried from proposal.md:
- [ ] Extend regression coverage to `happypet/sales/services.py` and `happypet/sales/serializers.py`'s existing (correct) `get_today_range()` usages, to catch a future accidental revert to `timezone.now().date()`.
- [ ] Consider a lint/review rule against bare `timezone.now().date()` project-wide.
