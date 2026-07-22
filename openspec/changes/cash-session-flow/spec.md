# Delta Spec: cash-session-flow

## ADDED Requirements

### Requirement: cash-session-active-check

The system MUST provide an endpoint to check whether the authenticated user has an open cash session for the current date.

`GET /api/cash/sessions/active/` MUST return:
- **200 OK** with the active `CashSession` object if one exists for `user=current_user`, `opened_at__date=today`, `status='open'`
- **404 Not Found** if no matching session exists (this is not an error condition — it signals the user must open a session)

The response serializer MUST include an `is_today: bool` computed field set to `True`.

#### Scenario: Active session exists for today

- GIVEN the authenticated user has an open CashSession opened on today's date
- WHEN the user calls `GET /api/cash/sessions/active/`
- THEN the response is 200 OK with the session data
- AND `is_today` is `true`

#### Scenario: No active session today

- GIVEN the authenticated user has no CashSession opened on today's date
- WHEN the user calls `GET /api/cash/sessions/active/`
- THEN the response is 404 Not Found
- AND no error message is shown (just an empty response body)

#### Scenario: Past session exists, no session today

- GIVEN the authenticated user has a CashSession from yesterday with status `open`
- WHEN the user calls `GET /api/cash/sessions/active/`
- THEN the response is 404 Not Found (date filter excludes yesterday's session)

---

### Requirement: sale-cash-session-auto-link

On sale creation, the system MUST automatically link the sale to the authenticated user's active cash session for today if one exists.

`SaleCreateSerializer.create()` MUST:
1. Check for an active session: `user=current_user`, `opened_at__date=today`, `status='open'`
2. If found: set `cash_session` to that session's ID before saving
3. If not found: save the sale without `cash_session` (FK is nullable — no error raised)

The frontend sale form MUST NOT display or require a cash session selector.

#### Scenario: Sale created with active session

- GIVEN the authenticated user has an open CashSession for today
- WHEN a cashier creates a sale via `POST /api/sales/`
- THEN `sale.cash_session` is populated with today's active session
- AND the sale appears in the session's sale list

#### Scenario: Sale created without active session

- GIVEN the authenticated user has no open CashSession for today
- WHEN a cashier creates a sale via `POST /api/sales/`
- THEN the sale is created successfully
- AND `sale.cash_session` is `null`

---

### Requirement: post-login session redirect

After a successful JWT login, the system MUST check for an active cash session and route the user to the appropriate screen.

The `AuthProvider.login()` success callback MUST:
1. Call `GET /api/cash/sessions/active/`
2. If response is **200**: redirect to `/` (dashboard)
3. If response is **404**: redirect to `/cash/open`
4. If a **network error occurs**: redirect to `/` (dashboard) — do not block login for cash-related issues

#### Scenario: User logs in, active session exists

- GIVEN the user has an open CashSession for today
- WHEN the user logs in with valid credentials
- THEN the system calls `GET /api/cash/sessions/active/` and receives 200
- AND the user is redirected to `/`

#### Scenario: User logs in, no active session

- GIVEN the user has no open CashSession for today
- WHEN the user logs in with valid credentials
- THEN the system calls `GET /api/cash/sessions/active/` and receives 404
- AND the user is redirected to `/cash/open`

#### Scenario: Network error on session check

- GIVEN the user logs in with valid credentials
- WHEN the call to `GET /api/cash/sessions/active/` fails with a network error
- THEN the user is redirected to `/` (login succeeds, cash check does not block)

---

### Requirement: OpenSessionPage

The OpenSessionPage MUST allow a cashier to open a new cash session for the current day.

The page MUST:
- Display the current date
- Show a form with an `opening_amount` decimal input field
- POST to `POST /api/cash/sessions/` on submit
- On **success**: redirect to `/` (dashboard)
- On **error**: display an inline error message without navigating

If a session already exists for today, the backend MUST return the existing session (no duplicate).

#### Scenario: Open session with opening amount

- GIVEN the user is on `/cash/open`
- WHEN the user enters `500.00` in `opening_amount` and submits
- THEN `POST /api/cash/sessions/` is called with `{"opening_amount": "500.00", "cash_register": <default>}`
- AND the user is redirected to `/`

#### Scenario: Open session — duplicate same day

- GIVEN the user already has an open CashSession for today
- WHEN the user submits the OpenSessionPage form
- THEN the backend returns the existing session (200, not 201)
- AND the user is redirected to `/`

#### Scenario: Open session — backend error

- GIVEN the user is on `/cash/open`
- WHEN the form submission fails with a backend error (e.g., validation error)
- THEN an inline error message is displayed
- AND the user remains on `/cash/open`

---

## API Contract Summary

### GET /api/cash/sessions/active/

Response 200:
```json
{
  "id": 5,
  "cash_register": { "id": 1, "name": "Caja Principal" },
  "user": { "id": 2, "username": "cashier1" },
  "opened_at": "2026-06-01T09:00:00Z",
  "closed_at": null,
  "opening_amount": "500.00",
  "status": "open",
  "is_today": true
}
```

Response 404: `{}`

### POST /api/cash/sessions/

Request:
```json
{
  "cash_register": 1,
  "opening_amount": "500.00"
}
```

Response 201 (created) or 200 (already exists):
```json
{
  "id": 5,
  "cash_register": { "id": 1, "name": "Caja Principal" },
  "opened_at": "2026-06-01T09:00:00Z",
  "status": "open",
  "is_today": true
}
```

---

## Affected Files

| Area | File | Change |
|------|------|--------|
| Backend | `happypet/cash/views.py` | Add `get_active_session` custom action |
| Backend | `happypet/cash/serializers.py` | Add `is_today` to `CashSessionSerializer` |
| Backend | `happypet/sales/serializers.py` | Auto-link `cash_session` in `SaleCreateSerializer.create()` |
| Frontend | `context/AuthProvider.tsx` | Post-login session check + redirect |
| Frontend | `pages/OpenSessionPage.tsx` | Verify/confirm form behavior |
