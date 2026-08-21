# Delta Spec: cash-report

## ADDED Requirements

### Requirement: cash-report-api

The system MUST provide a dedicated cash movement report endpoint at `GET /api/reports/cash/`.

The endpoint MUST accept the following query parameters:
- `start` — start date in `YYYY-MM-DD` format (default: today).
- `end` — end date in `YYYY-MM-DD` format (default: today).
- `cashier_id` — optional user ID to filter movements by the cashier who owns the cash session.
- `granularity` — grouping period for the trend data: `day`, `week`, or `month` (default: `day`).

The endpoint MUST return:
- `granularity`, `start`, `end`
- `total_income` — sum of all `CashMovement` with `type='income'` in the range.
- `total_expense` — sum of all `CashMovement` with `type='expense'` in the range.
- `balance` — `total_income - total_expense`.
- `count` — total number of movements in the range.
- `by_period` — array of `{ period, income, expense }` grouped by the requested granularity.
- `by_cashier` — array of `{ user_id, name, income, expense }` aggregated per cashier.

The endpoint MUST be accessible only to users with role `admin` or `manager`.

#### Scenario: Report with income and expense movements

- GIVEN two cash movements exist: one income of `C$100.00` and one expense of `C$40.00`, both created today
- WHEN an admin calls `GET /api/reports/cash/?start=today&end=today`
- THEN the response status is 200
- AND `total_income` equals `"100.00"`
- AND `total_expense` equals `"40.00"`
- AND `balance` equals `"60.00"`
- AND `count` equals `2`

#### Scenario: Filter by cashier

- GIVEN cashier A has an expense movement of `C$50.00` and cashier B has an expense movement of `C$30.00`
- WHEN an admin calls `GET /api/reports/cash/?cashier_id=<A_id>`
- THEN `total_expense` equals `"50.00"`
- AND `by_cashier` contains only cashier A

#### Scenario: Unauthorized cashier access

- GIVEN an authenticated user with role `cashier`
- WHEN they call `GET /api/reports/cash/`
- THEN the response status is 403 Forbidden

---

### Requirement: cash-movement-list-filters

The existing `GET /api/cash-movements/` endpoint MUST support the following optional query parameters:
- `date_from` — filter movements where `created_at__date >= date_from`.
- `date_to` — filter movements where `created_at__date <= date_to`.
- `cashier_id` — filter movements by `cash_session__user_id`.
- `type` — filter movements by `type` (`income` or `expense`).

The endpoint MUST continue to support `cash_session` filtering and MUST return paginated results when no session filter is provided.

#### Scenario: Filter movements by date range

- GIVEN a movement created yesterday and a movement created today
- WHEN an admin calls `GET /api/cash-movements/?date_from=today&date_to=today`
- THEN only today's movement is returned

#### Scenario: Filter movements by type

- GIVEN one income movement and one expense movement
- WHEN an admin calls `GET /api/cash-movements/?type=expense`
- THEN only the expense movement is returned

---

### Requirement: cash-report-page

The system MUST provide a frontend page at `/reports/cash` accessible only to `admin` and `manager` roles.

The page MUST display:
1. A filter bar with:
   - Period presets (`today`, `week`, `month`, `custom`).
   - Custom date range inputs when `custom` is selected.
   - Granularity selector (`day`, `week`, `month`) for the trend chart.
   - Type filter (`Ingreso`, `Egreso`, `Todos`).
   - Cashier filter (all cashiers with at least one session).
2. Summary cards showing:
   - Total cash income.
   - Total cash expense.
   - Balance (income - expense).
3. A trend chart of income/expense over the selected granularity.
4. A paginated table of cash movements matching the filters.

#### Scenario: Admin opens cash report

- GIVEN an admin user navigates to `/reports/cash`
- WHEN the page loads with default filters (today)
- THEN the summary cards show today's totals
- AND the movements table lists today's movements
- AND the trend chart renders today's income/expense

#### Scenario: Apply type filter

- GIVEN the cash report page is open
- WHEN the user selects "Egreso" in the type filter
- THEN the summary cards, table, and chart update to reflect only expense movements

---

## API Contract Summary

### GET /api/reports/cash/

Request example:
```
GET /api/reports/cash/?start=2026-08-01&end=2026-08-18&cashier_id=2&granularity=day
```

Response 200:
```json
{
  "granularity": "day",
  "start": "2026-08-01",
  "end": "2026-08-18",
  "total_income": "150.00",
  "total_expense": "75.00",
  "balance": "75.00",
  "count": 12,
  "by_period": [
    { "period": "2026-08-18", "income": "50.00", "expense": "25.00" }
  ],
  "by_cashier": [
    { "user_id": 2, "name": "Cashier Name", "income": "150.00", "expense": "75.00" }
  ]
}
```

Response 403:
```json
{ "detail": "You do not have permission to perform this action." }
```

### GET /api/cash-movements/

New optional query params:
- `date_from`
- `date_to`
- `cashier_id`
- `type`

Response shape remains unchanged; results are paginated when not filtered by `cash_session`.

---

## Affected Files

| Area | File | Change |
|------|------|--------|
| Backend | `happypet/cash/views.py` | Add `CashReportView`; extend `CashMovementViewSet` filters |
| Backend | `happypet/cash/serializers.py` | Add `CashReportSerializer` |
| Backend | `config/api_router.py` | Register `/reports/cash/` |
| Backend | `happypet/cash/tests.py` | Add tests |
| Frontend | `interfaces/cash/index.ts` | Add report types |
| Frontend | `services/cash/index.ts` | Add report service; extend movement filters |
| Frontend | `hooks/cash/index.ts` | Add `useCashReport` |
| Frontend | `hooks/cash/useCashMovementFilters.ts` | New filter hook |
| Frontend | `pages/CashReport/*` | New page and components |
| Frontend | `routes/Routes.tsx` | Add `/reports/cash` route |
| Frontend | `components/layout/Sidebar.tsx` | Add sidebar item |
