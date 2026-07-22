# Tasks: Sale Status Workflow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend core) → PR 2 (frontend) → PR 3 (tests) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend core: constants, migration, permission, service, serializer, view | PR 1 | Base: `main` |
| 2 | Frontend: patch helpers + action buttons | PR 2 | Base: `main`; depends on PR 1 API contract |
| 3 | Backend tests: transitions, stock, cash, permissions | PR 3 | Base: `main`; depends on PR 1 |

## Phase 1: Foundation

- [x] 1.1 Rename `SAILE_STATUS_CANCELED` → `SAILE_STATUS_CANCELLED` in `backend/happypet/sales/constants.py` and update `SALE_STATUS_CHOICES`.
- [x] 1.2 Create migration: rename constant reference + data migration to update existing `status='canceled'` rows to `'cancelled'`.
- [x] 1.3 Add `CanTransitionSale` permission to `backend/happypet/users/permissions.py` (allows admin, manager, cashier).

## Phase 2: Core Backend

- [x] 2.1 Add `SaleStatusService` to `backend/happypet/sales/services.py` with `transition()`, `_complete_sale()`, `_cancel_sale()`.
- [x] 2.2 Add `_revert_stock_for_item()` (lock product, restore stock using `presentation_multiplier_snap`, create `InventoryMovement(type=in)`) and `_create_cash_movement()` (insert `CashMovement(type=income)` for cash + open session).
- [x] 2.3 Add `SaleStatusSerializer` to `backend/happypet/sales/serializers.py` (PATCH-only, `status` choice field, delegates to `SaleStatusService`).
- [x] 2.4 Override `SaleViewSet.partial_update` in `backend/happypet/sales/views.py` to use `SaleStatusSerializer` for status transitions; add `CanTransitionSale` to write permission classes.

## Phase 3: Frontend

- [x] 3.1 Add `patchSaleStatus(id, status)` thin wrapper to `frontend/src/services/sale.ts`.
- [x] 3.2 Add `updateSaleStatus(id, status)` thin wrapper to `frontend/src/hooks/useSale.ts`.
- [x] 3.3 Add Complete/Cancel action buttons to `frontend/src/pages/Sales/SalesList.tsx`, visible only when `status === 'pending'`.

## Phase 4: Testing

- [x] 4.1 Write backend tests for valid/invalid transitions and terminal state guards.
- [x] 4.2 Write backend tests for stock revert math (`qty × snapshot_multiplier`) and `InventoryMovement(type=in)` creation.
- [x] 4.3 Write backend tests for `CashMovement` creation (cash + open session creates; card/closed session blocks).
- [x] 4.4 Write backend tests for `CanTransitionSale` permission (admin/manager/cashier succeed; vendor gets 403).
