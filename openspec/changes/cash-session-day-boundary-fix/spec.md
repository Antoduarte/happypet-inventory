# Delta Spec: cash-session-day-boundary-fix

## MODIFIED Requirements

### Requirement: cash-session-is-today-local-boundary

The system MUST determine whether a `CashSession` belongs to "today" using the server's configured local timezone (`settings.TIME_ZONE`), never the raw UTC calendar date.

`CashSessionSerializer.get_is_today()` MUST compare `timezone.localtime(obj.opened_at).date()` against `timezone.localtime().date()`.

#### Scenario: Session opened this morning, checked before local midnight, after UTC has rolled over

- GIVEN `TIME_ZONE` is set to a zone behind UTC (e.g. `America/Managua`, UTC-6)
- AND a `CashSession` was opened at 09:00 local time today
- WHEN `is_today` is evaluated at 23:00 local time the same day (a moment at which the UTC calendar date has already advanced to tomorrow)
- THEN `is_today` MUST be `true`

#### Scenario: Session opened yesterday (local), checked today

- GIVEN a `CashSession` was opened yesterday at any local time
- WHEN `is_today` is evaluated today
- THEN `is_today` MUST be `false`

---

### Requirement: cash-session-open-validation-local-boundary

`CashSessionOpenSerializer.validate_cash_register_id()` MUST use the same local-day window as the rest of the cash session flow (via `happypet.cash.utils.get_today_range()`) when checking for an existing open or suspended session for "today," instead of computing a UTC-based window independently.

#### Scenario: Attempting to open a second session late in the local day

- GIVEN a cash register already has an open `CashSession` opened this morning (local time)
- WHEN a user attempts to open a new session for that register late at night local time (after the UTC calendar date has advanced)
- THEN the request MUST be rejected with a validation error identifying the existing session as already open for today
- AND this outcome MUST be consistent with `is_today` reporting the existing session as active at that same moment (no state where the UI shows "no active session" while the backend still enforces one exists)

---

## Rationale

Prior to this change, `get_is_today` and `validate_cash_register_id` each computed "today" from `timezone.now()` directly (an aware UTC datetime), while `CashSessionService.open_session` and `CashSessionViewSet.active` already computed it via `get_today_range()` (`timezone.localtime()`-based). With `TIME_ZONE = "America/Managua"` (UTC-6), the UTC calendar date advances at 18:00 local time, so for roughly six hours every evening the two definitions of "today" disagreed — session data appeared to "close" in the UI (`is_today: false` driving a redirect to `/cash/open` in `CurrentSessionPage.tsx` / `ResumeSessionPage.tsx`) while the still-open session correctly blocked a fresh session from being opened for that register. This spec closes that gap by requiring every "is this today?" check in the cash session flow to use the same local-day boundary.
