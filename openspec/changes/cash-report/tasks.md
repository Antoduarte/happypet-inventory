# Tasks: cash-report

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~400-500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

## Phase 1: Backend — Cash Movement Filters

- [ ] 1.1 In `backend/happypet/cash/views.py`, update `CashMovementViewSet.get_queryset()` to apply filters:
  - `date_from` → `created_at__date__gte`
  - `date_to` → `created_at__date__lte`
  - `cashier_id` → `cash_session__user_id`
  - `type` → `type`
- [ ] 1.2 Ensure `CashMovementViewSet.list()` remains paginated when no `cash_session` filter is provided.

## Phase 2: Backend — Cash Report Endpoint

- [ ] 2.1 Create `CashReportSerializer` in `backend/happypet/cash/serializers.py`.
- [ ] 2.2 Create `CashReportView` in `backend/happypet/cash/views.py` with permission `IsManagerOrAdmin`.
- [ ] 2.3 Implement aggregation logic:
  - Total income/expense/balance/count over the date range.
  - `by_period` grouped by `day`/`week`/`month` using `TruncDay`/`TruncWeek`/`TruncMonth` on `created_at`.
  - `by_cashier` grouped by `cash_session__user` with income/expense sums.
- [ ] 2.4 Register `path("reports/cash/", CashReportView.as_view(), name="cash-report")` in `backend/config/api_router.py`.

## Phase 3: Backend — Tests

- [ ] 3.1 Add tests in `backend/happypet/cash/tests.py`:
  - Report totals with income and expense movements.
  - Date range filter.
  - Cashier filter.
  - Type filter on `CashMovementViewSet.list()`.
  - Permission test ensuring cashiers receive 403.

## Phase 4: Frontend — Types and Service

- [ ] 4.1 Add to `frontend/src/interfaces/cash/index.ts`:
  - `CashReportParams`
  - `CashReport`
  - `CashReportPeriodPoint`
  - `CashReportCashierRow`
  - `CashMovementQueryParams` (extend existing or add new type for date/cashier/type)
- [ ] 4.2 Add `getCashReport(params)` to `frontend/src/services/cash/index.ts`.
- [ ] 4.3 Extend `CashMovementService.getMovements()` to accept date/cashier/type filters.

## Phase 5: Frontend — Hooks

- [ ] 5.1 Add `useCashReport(params)` hook in `frontend/src/hooks/cash/index.ts`.
- [ ] 5.2 Create `frontend/src/hooks/cash/useCashMovementFilters.ts` managing preset, dates, granularity, type, and cashier.

## Phase 6: Frontend — Page and Components

- [ ] 6.1 Create `frontend/src/pages/CashReport/CashReportPage.tsx`.
- [ ] 6.2 Create `frontend/src/pages/CashReport/components/CashReportFilters.tsx`.
- [ ] 6.3 Create `frontend/src/pages/CashReport/components/CashReportSummary.tsx`.
- [ ] 6.4 Create `frontend/src/pages/CashReport/components/CashMovementsTable.tsx`.
- [ ] 6.5 Create `frontend/src/pages/CashReport/components/CashReportTrendChart.tsx`.

## Phase 7: Frontend — Routing and Navigation

- [ ] 7.1 Add `/reports/cash` route guarded by `RoleGuard` for `['admin', 'manager']` in `frontend/src/routes/Routes.tsx`.
- [ ] 7.2 Add "Reporte de Caja" sidebar item for admin/manager in `frontend/src/components/layout/Sidebar.tsx`.

## Phase 8: Verification

- [ ] 8.1 Run `python manage.py test` inside `backend/` — all tests pass.
- [ ] 8.2 Run `npm run build` in `frontend/` — TypeScript compiles cleanly.
- [ ] 8.3 Manual: open `/reports/cash`, verify summary, table, chart, and filters work.

## Implementation Order

1. **Phase 1** (backend filters) — foundation for detail table.
2. **Phase 2** (backend report endpoint) — foundation for summary and chart.
3. **Phase 3** (backend tests) — verify backend contract.
4. **Phase 4** (frontend types/service) — depends on backend API shape.
5. **Phase 5** (frontend hooks) — depends on Phase 4.
6. **Phase 6** (frontend components) — depends on Phase 5.
7. **Phase 7** (routing/navigation) — depends on Phase 6.
8. **Phase 8** (verification) — final check.

## File Summary

| File | Phase | What changes |
|------|-------|--------------|
| `backend/happypet/cash/views.py` | 1, 2 | Filters + `CashReportView` |
| `backend/happypet/cash/serializers.py` | 2 | `CashReportSerializer` |
| `backend/config/api_router.py` | 2 | URL registration |
| `backend/happypet/cash/tests.py` | 3 | New tests |
| `frontend/src/interfaces/cash/index.ts` | 4 | Report types |
| `frontend/src/services/cash/index.ts` | 4 | Report service + movement filters |
| `frontend/src/hooks/cash/index.ts` | 5 | `useCashReport` |
| `frontend/src/hooks/cash/useCashMovementFilters.ts` | 5 | Filter hook |
| `frontend/src/pages/CashReport/*` | 6 | Page + components |
| `frontend/src/routes/Routes.tsx` | 7 | Route |
| `frontend/src/components/layout/Sidebar.tsx` | 7 | Sidebar item |
