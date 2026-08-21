# Design: cash-report

## Technical Approach

Add a dedicated cash report that aggregates `CashMovement` records over a date range. The backend exposes a read-only report endpoint and extends the existing cash movement list with date/cashier/type filters. The frontend renders a new report page composed of small, reusable components driven by dedicated hooks.

## Architecture Decisions

### Decision 1: Separate endpoint `/api/reports/cash/` instead of extending `/api/reports/sales/`

**Choice**: New `CashReportView` at `GET /api/reports/cash/`.
**Alternatives**: Add cash movement aggregates to the existing `SalesReportView`.
**Rationale**: Sales and cash movements are different domains. Mixing them in `SalesReportView` would violate single responsibility and make the report harder to maintain. A dedicated endpoint gives a clear contract and lets each report evolve independently.

---

### Decision 2: Date filter on `CashMovement.created_at`

**Choice**: Filter movements by `created_at__date__range`.
**Alternatives**: Filter by `CashSession.opened_at`.
**Rationale**: `created_at` is the exact moment the movement was recorded. Using the session open date would misattribute movements made today to sessions opened earlier, which is incorrect for accounting.

---

### Decision 3: Reuse `CashMovementViewSet` for the detail table

**Choice**: Extend the existing `/api/cash-movements/` list with filters instead of creating a new detail endpoint.
**Alternatives**: New `/api/reports/cash/detail/` endpoint.
**Rationale**: The existing viewset already serializes `CashMovement`. Adding query filters (`date_from`, `date_to`, `cashier_id`, `type`) is a small, non-breaking change and keeps the API surface minimal.

---

### Decision 4: Dedicated filter hook (`useCashMovementFilters`)

**Choice**: Extract filter state into a custom hook similar to `useGeneralMovementFilters`.
**Alternatives**: Inline state in `CashReportPage`.
**Rationale**: Keeping filter logic out of the page component follows SRP, makes testing easier, and allows reuse if another page needs the same filter shape.

---

### Decision 5: Small, single-purpose components

**Choice**: Split page into `CashReportFilters`, `CashReportSummary`, `CashMovementsTable`, and `CashReportTrendChart`.
**Alternatives**: One large page component.
**Rationale**: Each component has one reason to change. They are easier to test, review, and reuse. The table is independent from the summary and chart.

## Data Flow

```
User opens /reports/cash
  │ CashReportPage mounts
  │ ▼
  ├─► useCashMovementFilters derives date range, type, cashier, granularity
  │     │
  │     ▼
  ├─► useCashReport calls GET /api/reports/cash/?start=&end=&cashier_id=&granularity=
  │     ├─► CashReportSummary renders total_income / total_expense / balance
  │     └─► CashReportTrendChart renders by_period data
  │
  └─► useCashMovements calls GET /api/cash-movements/?date_from=&date_to=&cashier_id=&type=
        └─► CashMovementsTable renders paginated rows
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/happypet/cash/views.py` | Modify + Add | Extend `CashMovementViewSet` filters; add `CashReportView` |
| `backend/happypet/cash/serializers.py` | Modify + Add | Add `CashReportSerializer` |
| `backend/config/api_router.py` | Modify | Register `/reports/cash/` |
| `backend/happypet/cash/tests.py` | Modify | Add report and filter tests |
| `frontend/src/interfaces/cash/index.ts` | Modify | Add `CashReport*` types |
| `frontend/src/services/cash/index.ts` | Modify | Add `getCashReport`; extend `getMovements` |
| `frontend/src/hooks/cash/index.ts` | Modify | Add `useCashReport` export |
| `frontend/src/hooks/cash/useCashMovementFilters.ts` | New | Filter state hook |
| `frontend/src/pages/CashReport/CashReportPage.tsx` | New | Page orchestrator |
| `frontend/src/pages/CashReport/components/CashReportFilters.tsx` | New | Filter bar |
| `frontend/src/pages/CashReport/components/CashReportSummary.tsx` | New | Summary cards |
| `frontend/src/pages/CashReport/components/CashMovementsTable.tsx` | New | Paginated movements table |
| `frontend/src/pages/CashReport/components/CashReportTrendChart.tsx` | New | Income/expense trend chart |
| `frontend/src/routes/Routes.tsx` | Modify | Add `/reports/cash` route |
| `frontend/src/components/layout/Sidebar.tsx` | Modify | Add sidebar item |

## Interfaces

### `GET /api/reports/cash/`

```python
class CashReportView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        # Filters:
        #   start (YYYY-MM-DD, default today)
        #   end   (YYYY-MM-DD, default today)
        #   cashier_id (optional)
        #   granularity ('day' | 'week' | 'month', default 'day')
        ...
```

Response:

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

### `GET /api/cash-movements/`

New optional query params:

- `date_from` — `created_at__date__gte`
- `date_to` — `created_at__date__lte`
- `cashier_id` — `cash_session__user_id`
- `type` — `'income'` or `'expense'`

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `CashReportView` totals | DRF APIClient test with movements across dates |
| Unit | `CashReportView` filters | Test `cashier_id`, `type`, and date range |
| Unit | `CashMovementViewSet` filters | Test `date_from`/`date_to`/`cashier_id`/`type` on list endpoint |
| Integration | Frontend build | `npm run build` verifies TypeScript and route registration |

## Migration

No migration required. The change is purely additive: new endpoint, new filters, and new frontend page. Existing cash movement data remains untouched.

## Open Questions

- [ ] Should the report include open sessions' movements or only closed sessions? Decision: include all movements in the date range regardless of session status, because the accountant needs the real outflow date.
