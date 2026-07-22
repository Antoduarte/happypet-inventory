# Proposal: Sale Status Workflow

## Intent

Sales are created with `status=pending` and never transition further. Users need a way to mark sales as **completed** (finalized) or **canceled** (aborted), with correct stock and cash-session side effects. Without this, inventory and cash reconciliation are unreliable.

## Scope

### In Scope
- Backend PATCH endpoint to transition `pending` → `completed` or `pending` → `canceled`
- State-machine guard: reject invalid transitions and terminal-state changes
- On **cancel**: revert all stock deductions and create reversing `InventoryMovement` records
- On **complete**: optionally link to an open `CashSession` and record a `CashMovement` (if cash payment)
- Frontend status-action buttons (Complete / Cancel) in `SalesList`
- Permission rule: Admin, Manager, and Cashier can complete/cancel

### Out of Scope
- Editing items after sale creation
- Email/receipt notifications on status change
- Bulk status actions

## Capabilities

### New Capabilities
- `sale-status-transition`: PATCH endpoint, state machine, stock revert, cash movement

### Modified Capabilities
- `sale-list-read`: Add action buttons and status-change UI

## Approach

1. **Backend**: Add `SaleStatusService` with `complete_sale()` and `cancel_sale()` methods.
   - `complete`: validate `CashSession` is open if linked, create `CashMovement` for cash payments.
   - `cancel`: iterate `SaleItem`s, restore `Product.stock`, and generate `InventoryMovement` (type=`in`) via `StockMovementService`.
2. **API**: Introduce `SaleStatusSerializer` (PATCH-only) and wire `SaleViewSet.partial_update` to the service.
3. **Frontend**: Add `patchSaleStatus(id, status)` in service/hook, render Complete/Cancel buttons in `SalesList` (hidden for non-pending).
4. **Tests**: Backend tests for valid/invalid transitions and stock revert math.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/happypet/sales/services.py` | New | `SaleStatusService` with complete/cancel logic |
| `backend/happypet/sales/views.py` | Modified | Custom `partial_update` for status transitions |
| `backend/happypet/sales/serializers.py` | New | `SaleStatusSerializer` |
| `backend/happypet/sales/tests.py` | Modified | State-transition and stock-revert tests |
| `frontend/src/pages/Sales/SalesList.tsx` | Modified | Add Complete/Cancel buttons |
| `frontend/src/services/sale.ts` | Modified | `patchSaleStatus` helper |
| `frontend/src/hooks/useSale.ts` | Modified | `updateSaleStatus` action |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock revert creates race condition with concurrent sales | Low | Use `select_for_update` + atomic transaction, same pattern as deduction |
| CashMovement double-counts in session expected amount | Med | Only create CashMovement on complete; session expected already sums sales. Verify in tests. |
| Frontend/backend spelling mismatch (`cancelled` vs `canceled`) | Med | Fix backend constant to `cancelled` (align with frontend) in same migration |

## Rollback Plan

1. Revert the PATCH endpoint logic in `SaleViewSet` to use existing serializer.
2. Remove `SaleStatusService` methods; sales will remain in `pending`.
3. Undo frontend button additions. Database data is forward-compatible.

## Dependencies

- `happypet.products.services.StockMovementService` (for reverting stock)
- `happypet.cash.models.CashSession, CashMovement` (for cash linking)

## Success Criteria

- [x] PATCH `/api/sales/{id}/` with `{status: "completed"}` succeeds from `pending` only
- [x] PATCH `/api/sales/{id}/` with `{status: "cancelled"}` reverts stock and creates `InventoryMovement` records
- [x] Attempting invalid transitions returns `400` with clear error
- [x] Frontend shows Complete/Cancel buttons only for `pending` sales
- [x] Admin, Manager, and Cashier roles can execute transitions
- [x] All backend tests pass (`python manage.py test`)

## Status

**COMPLETED** — Archived on 2026-06-01.
