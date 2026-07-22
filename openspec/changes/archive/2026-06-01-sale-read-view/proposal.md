# Proposal: Sale Read View

## Intent

Users currently can list sales and change status from the list, but cannot inspect the full details of an individual sale (items, snapshots, payment method, financial breakdown, cash session). This change adds a read-only detail view so staff can review any completed or pending sale.

## Scope

### In Scope
- Backend: enhance `SaleSerializer` with a read-only nested `CashSession` minimal object (`id`, `register_name`, `opened_at`)
- Backend: add `select_related('cash_session')` in `SaleViewSet.retrieve`
- Frontend: new `SaleDetailPage` component (`/sales/:id`) with status banner, stat grid, items table, totals breakdown
- Frontend: responsive items display (table on desktop, stacked cards on mobile)
- Frontend: add navigation from `SalesList` row click to detail page

### Out of Scope
- Editing sales, printing receipts, bulk actions
- Modifying sale status from the detail page (remains list-only)
- Cash session detail deep-link beyond a text link

## Capabilities

### New Capabilities
- `sale-read-view`: Read-only sale detail page with nested items and cash session metadata

### Modified Capabilities
- None (no existing spec-level behavior changes beyond additive serializer field)

## Approach

Follow the `SessionReportPage` pattern: `PageHeader` with breadcrumbs/back action, a colored status banner, a 4-column stat grid, a `Card` + `DataTable` for line items, and a totals breakdown card. Use Tailwind responsive utilities (`hidden md:block` / `md:hidden`) to switch between table and stacked cards. Extend `useSale` hook with a `currentSale` state field so `SaleDetailPage` can consume it cleanly.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/happypet/sales/serializers.py` | Modified | Add minimal `CashSessionSerializer`; nest it in `SaleSerializer` as read-only |
| `backend/happypet/sales/views.py` | Modified | Add `select_related('cash_session')` in `SaleViewSet` retrieve path |
| `frontend/src/pages/Sales/SaleDetailPage.tsx` | New | Read-only detail page component |
| `frontend/src/routes/Routes.tsx` | Modified | Add `/sales/:id` route |
| `frontend/src/pages/Sales/SalesList.tsx` | Modified | Wire row click / detail action to navigate to `/sales/${id}` |
| `frontend/src/hooks/useSale.ts` | Modified | Expose `currentSale` state populated by `fetchSaleById` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Serializer nesting causes N+1 on list endpoint | Low | Only add `select_related` on `retrieve`; list remains unchanged |
| Mobile card layout adds JSX complexity | Low | Reuse existing `Card` and utility classes; keep cards simple |
| First read-only detail page establishes a new pattern | Low | Document the pattern in a short code comment at the top of `SaleDetailPage` |

## Rollback Plan

1. Revert `SaleSerializer` to remove the nested `CashSession` field.
2. Revert `SaleViewSet` to remove `select_related('cash_session')`.
3. Remove `/sales/:id` route from `Routes.tsx`.
4. Delete `SaleDetailPage.tsx` and remove navigation from `SalesList.tsx`.
5. Revert `useSale.ts` to remove `currentSale` state.

## Dependencies

- None. Backend endpoint `GET /api/sales/{id}/` already exists.

## Success Criteria

- [x] `GET /api/sales/{id}/` returns a nested `cash_session` object with `id`, `register_name`, `opened_at`
- [x] Navigating to `/sales/:id` renders a responsive detail page with status, stats, items, and totals
- [x] Clicking a row in `SalesList` navigates to the detail page
- [x] Page works on mobile without horizontal table overflow
- [x] Backend tests pass; frontend builds and lints cleanly (pre-existing frontend errors remain)

## Final State

**Status**: COMPLETED — All tasks implemented and verified. 31/31 backend tests pass. Frontend builds with zero new errors. Change archived on 2026-06-01.
