# Design: Sale Status Workflow

## Technical Approach

Introduce a domain service `SaleStatusService` that encapsulates the state machine and all side effects (stock revert, cash movement). Expose it through a dedicated `SaleStatusSerializer` wired into `SaleViewSet.partial_update`. The frontend adds action buttons in `SalesList` that call the existing `patchSale` helper with `{status}`.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|---|---|---|---|
| State machine location | Model method; Serializer; Service | Model should not know about CashMovement. Serializer should not orchestrate side effects. | **Service layer** (`SaleStatusService`) |
| Stock revert reuse | Reuse `StockMovementService.apply`; Custom helper in `SaleStatusService` | `apply` uses current `presentation.multiplier`, but we must use `presentation_multiplier_snap`. | **Custom helper** in `SaleStatusService` with `select_for_update` |
| Cash session link | Always create CashMovement; Only for cash + open session | Non-cash payments must not affect cash. Closed session must block completion. | **Only cash + open session** |
| Permission check | Inline in view; Custom permission class | Reusable and follows DRF convention. | **Custom `CanTransitionSale` permission** |
| Spelling fix | Migration only; Migration + constant rename | Aligns backend with frontend (`cancelled`). | **Data migration + constant rename** |

## Data Flow

```
Frontend (SalesList)
  │ click Complete / Cancel
  ▼
PATCH /api/sales/{id}/  { status: "completed" | "cancelled" }
  │
  ▼
SaleViewSet.partial_update()
  │ uses SaleStatusSerializer
  ▼
SaleStatusService.transition(sale, target_status, user)
  │ atomic transaction
  ├─ validate transition (pending → target)
  ├─ if completed:
  │    └─ maybe create CashMovement (cash + open session)
  ├─ if cancelled:
  │    └─ for each item:
  │         lock Product (select_for_update)
  │         compute base_units = qty × snapshot_multiplier
  │         update stock
  │         create InventoryMovement(type=in)
  └─ save sale.status
  │
  ▼
SaleSerializer → 200 OK
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/happypet/sales/services.py` | Modify | Add `SaleStatusService` with `transition`, `_complete_sale`, `_cancel_sale`, `_revert_stock_for_item`, `_create_cash_movement` |
| `backend/happypet/sales/serializers.py` | Modify | Add `SaleStatusSerializer` (PATCH-only, field `status`) |
| `backend/happypet/sales/views.py` | Modify | Override `partial_update`; map `SaleStatusSerializer`; add `CanTransitionSale` to `permission_classes` for write actions |
| `backend/happypet/users/permissions.py` | Modify | Add `CanTransitionSale` (admin, manager, cashier) |
| `backend/happypet/sales/tests.py` | Modify | Tests for valid/invalid transitions, stock revert math, cash movement, permissions |
| `frontend/src/pages/Sales/SalesList.tsx` | Modify | Add action column with Complete / Cancel buttons for `pending` rows |
| `frontend/src/services/sale.ts` | Modify | Add `patchSaleStatus(id, status)` thin wrapper around `patchSale` |
| `frontend/src/hooks/useSale.ts` | Modify | Add `updateSaleStatus(id, status)` thin wrapper around `updateSale` |

## Interfaces / Contracts

```python
# backend/happypet/sales/services.py
class SaleStatusService:
    def transition(self, sale: Sale, target_status: str, user: User) -> Sale:
        """Atomic state transition with side effects."""

    def _complete_sale(self, sale: Sale) -> None:
        """Create CashMovement if cash + open session."""

    def _cancel_sale(self, sale: Sale) -> None:
        """Revert stock and create InventoryMovement(type=in) for each item."""

    def _revert_stock_for_item(self, item: SaleItem) -> None:
        """Lock product, restore stock using snapshot multiplier, audit movement."""

    def _create_cash_movement(self, sale: Sale) -> None:
        """Create CashMovement(type=income) for cash payment."""
```

```python
# backend/happypet/sales/serializers.py
class SaleStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["completed", "cancelled"])

    def update(self, instance, validated_data):
        # delegates to SaleStatusService
```

```python
# backend/happypet/users/permissions.py
class CanTransitionSale(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER)
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `SaleStatusService` state machine | Django `TestCase`: assert raises on invalid / terminal transitions |
| Unit | Stock revert math | Create sale with presentation (multiplier=5), cancel, assert `product.stock` increased by `qty × 5` and `InventoryMovement` created |
| Integration | PATCH endpoint + permissions | `APITestCase`: admin succeeds, vendor gets 403 |
| Integration | CashMovement creation | Complete cash sale with open session → assert `CashMovement` exists; card sale → assert none |
| Integration | Closed cash session | Complete with closed session → assert 400 |

## Migration / Rollout

1. **Constant rename migration**: rename `SAILE_STATUS_CANCELED` → `SAILE_STATUS_CANCELLED` and update `SALE_STATUS_CHOICES`.
2. **Data migration**: update existing rows where `status='canceled'` to `'cancelled'`.
3. No feature flag required; database is forward-compatible.

## Open Questions

- [ ] **Missing product on cancel**: If a `SaleItem.product` was deleted (`SET_NULL`), stock cannot be restored. Should we block cancel or skip the item? **Recommendation**: raise `ValidationError` to prevent silent inventory drift.
- [ ] **Cash session expected amount**: Confirm that `CashSession.expected_amount` already sums linked `Sale` totals, so creating a `CashMovement` does not double-count. Verify in integration tests.
