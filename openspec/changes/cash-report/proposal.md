# Proposal: cash-report

## Intent

The accountant needs to see cash register outflows (and inflows) aggregated by period without having to open each cash session history one by one. Currently, the only way to review cash movements is through the closed cash session detail page, which is impractical for period-level analysis.

## Scope

### In Scope
- **Backend**: New `GET /api/reports/cash/` endpoint that aggregates `CashMovement` income/expense over a date range.
- **Backend**: Extend `CashMovementViewSet.list()` to support filtering by `date_from`, `date_to`, `cashier_id`, and `type`.
- **Backend**: `CashReportSerializer` for the new report response.
- **Frontend**: New `/reports/cash` page with period, type, and cashier filters.
- **Frontend**: Summary cards for total cash income, total cash expense, and balance.
- **Frontend**: Paginated table of cash movements for the selected period.
- **Frontend**: Trend chart of cash income/expense grouped by the selected granularity.
- **Frontend**: Sidebar navigation entry visible only to admin/manager.

### Out of Scope
- CSV export (can be added later).
- General business movements (`GeneralMovement`) — those already have their own screen.
- Editing or creating movements from the report page.
- Cash session-level reports (those remain in the closed session detail page).

## Capabilities

### New Capabilities
- `cash-report-api`: Aggregated cash movement report endpoint with period, cashier, and type filters.
- `cash-report-page`: UI page that displays cash movement summary, detail table, and trend chart.

### Modified Capabilities
- `cash-movement-list`: Add `date_from`, `date_to`, `cashier_id`, and `type` filters to the existing cash movement list endpoint.

## Approach

**Backend:**
1. Add `CashReportView` in `happypet/cash/views.py` — `APIView` that receives `start`, `end`, `cashier_id`, and `granularity`, filters `CashMovement` by `created_at__date__range`, optionally by `cash_session__user_id`, and aggregates income/expense totals, period breakdown, and per-cashier breakdown.
2. Extend `CashMovementViewSet.get_queryset()` and `list()` to support `date_from`, `date_to`, `cashier_id`, and `type` filters for the detail table.
3. Add `CashReportSerializer` in `happypet/cash/serializers.py`.
4. Register `path("reports/cash/", CashReportView.as_view(), name="cash-report")` in `config/api_router.py`.

**Frontend:**
1. Add `CashReport` and `CashReportParams` types to `interfaces/cash/index.ts`.
2. Add `getCashReport()` to `services/cash/index.ts` and extend `getMovements()` with date/cashier/type filters.
3. Create `useCashReport` and `useCashMovementFilters` hooks.
4. Build `pages/CashReport/CashReportPage.tsx` and reusable components: `CashReportFilters`, `CashReportSummary`, `CashMovementsTable`, `CashReportTrendChart`.
5. Register `/reports/cash` route guarded by `RoleGuard` for admin/manager.
6. Add "Reporte de Caja" item to the sidebar for admin/manager.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/happypet/cash/views.py` | Modified + New | Extend `CashMovementViewSet` filters; add `CashReportView` |
| `backend/happypet/cash/serializers.py` | Modified + New | Add `CashReportSerializer` |
| `backend/config/api_router.py` | Modified | Register `/reports/cash/` URL |
| `backend/happypet/cash/tests.py` | Modified | Add tests for cash report and filters |
| `frontend/src/interfaces/cash/index.ts` | Modified | Add report-related types |
| `frontend/src/services/cash/index.ts` | Modified | Add `getCashReport`; extend `getMovements` filters |
| `frontend/src/hooks/cash/index.ts` | Modified | Add `useCashReport` |
| `frontend/src/hooks/cash/useCashMovementFilters.ts` | New | Filter state hook |
| `frontend/src/pages/CashReport/` | New | Page and components |
| `frontend/src/routes/Routes.tsx` | Modified | Add `/reports/cash` route |
| `frontend/src/components/layout/Sidebar.tsx` | Modified | Add sidebar item |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Large date range returns too many movements | Low/Med | Server-side pagination on the detail table; report aggregation is grouped by period |
| Confusion between cash movements and general movements | Low | Clear page title "Reporte de Caja" and labels "Ingresos de caja" / "Egresos de caja" |
| Permission leak allowing cashiers to see all cash movements | Low | Route and view restricted to admin/manager |

## Rollback Plan

1. Remove `path("reports/cash/", ...)` from `config/api_router.py`.
2. Remove `CashReportView` and report-related filter logic from `backend/happypet/cash/views.py`.
3. Remove `CashReportSerializer` from `backend/happypet/cash/serializers.py`.
4. Delete `frontend/src/pages/CashReport/` directory.
5. Remove `useCashReport` and `useCashMovementFilters` exports; revert `services/cash/index.ts` and `interfaces/cash/index.ts` additions.
6. Remove `/reports/cash` route and sidebar item.

## Dependencies

- Backend: existing `CashMovement`, `CashSession`, and `User` models.
- Frontend: existing `PeriodFilterBar`, `SelectFilter`, `MetricCard`, `DataTable`, `Card`, React Query, and Recharts (already used by other report charts).

## Success Criteria

- [ ] Admin/manager can open `/reports/cash` and see total cash income, expense, and balance for a period.
- [ ] Admin/manager can filter by date range, movement type (income/expense), and cashier.
- [ ] The detail table lists individual cash movements matching the filters with pagination.
- [ ] The trend chart shows income/expense grouped by day/week/month.
- [ ] Backend tests cover report totals, date filtering, cashier filtering, and type filtering.
- [ ] Frontend TypeScript build passes without errors.
