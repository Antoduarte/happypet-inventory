# Tasks: multi-product-stock-movement

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–350 |
| 400-line budget risk | Low–Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low-Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend serializer + service changes | PR 1 | Tests + implementation included |

Single PR — estimated under 400-line budget.

---

## Phase 1: Backend — Serializer Changes

- [x] 1.1 Add `MovementItemSerializer` inner class to `products/serializers.py` — fields: `product_id` (PrimaryKeyRelatedField), `presentation_id` (PrimaryKeyRelatedField, required=False), `quantity` (DecimalField, min_value=0)
- [x] 1.2 Add `items = MovementItemSerializer(many=True, write_only=True, required=False)` to `InventoryMovementSerializer`
- [x] 1.3 In `InventoryMovementSerializer.validate()`, consolidate duplicates: sum quantities for same `(product_id, presentation_id)` pair; store in `attrs["_consolidated_items"]`
- [x] 1.4 In `InventoryMovementSerializer.create()`, detect batch vs single-item mode: if `items` present → call `apply_batch()`; else → call existing `_create_single()` for backward compat
- [x] 1.5 Wrap `apply_batch()` call in try/except for `InsufficientStockError` → raise `ValidationError({"items": [...]})`

---

## Phase 2: Backend — Service Changes

- [x] 2.1 In `products/services.py`, add `apply_batch(movement_type, notes, items[])` to `StockMovementService`
- [x] 2.2 Use `transaction.atomic()` as outer wrapper; use `select_for_update()` on `Product` for 'out' movements
- [x] 2.3 For each item: validate `presentation.product_id == product.id`; for 'out' check stock → raise `InsufficientStockError` if insufficient
- [x] 2.4 Call `self.apply()` per item; collect returned `InventoryMovement` instances; return list

---

## Phase 3: Frontend — Interface Changes

- [x] 3.1 In `interfaces/product.ts`, add `MovementItem` type: `{ product_id: number; presentation_id: number | null; quantity: number }`
- [x] 3.2 Add `items?: MovementItem[]` to `CreateMovementPayload` interface
- [x] 3.3 `Presentation` type already exported from product interfaces (line ~20)

---

## Phase 4: Frontend — Service Changes

- [x] 4.1 In `services/stock.ts`, update `createMovement()` to accept single-item or batch payload
- [x] 4.2 Update return type to `InventoryMovement[]` to support batch responses
- [x] 4.3 Keep backward compat: if no `items` field → send root fields; if `items` present → send batch format

---

## Phase 5: Frontend — MovementFormModal Redesign

- [x] 5.1 Add `items` state: `useState<Array<{ product_id: number | null; presentation_id: number | null; quantity: number }>>([])`
- [x] 5.2 Add "Agregar producto" button → calls `setItems(prev => [...prev, { product_id: null, presentation_id: null, quantity: 1 }])`
- [x] 5.3 Build line-items table: columns (Producto, Presentación, Cantidad, Acciones)
- [x] 5.4 Per row: `SearchableCombobox` for product, `Combo` for presentation, number input for quantity, trash icon to remove
- [x] 5.5 On product change: fetch presentations for that product, update row's `presentation_id` options
- [x] 5.6 Keep `movement_type` selector and `notes` field at form level (batch-level fields)
- [x] 5.7 On submit: call `createMovement({ movement_type, notes, items })` with `items` array
- [x] 5.8 Validate: ensure at least 1 item, all items have `product_id`, all quantities > 0 before submit

---

## Phase 6: Verification

- [ ] 6.1 Run backend tests: `python manage.py test` in `backend/` — verify no regressions
- [x] 6.2 Run `npm run build` in `frontend/` — TypeScript compiles (pre-existing errors in CashSession/Category/User/Product pages are unrelated to this change)
- [ ] 6.3 Manual: create movement with 3 items via UI → verify all 3 appear in stock history
- [ ] 6.4 Manual: create 'out' movement with insufficient stock → verify 422 error, no movements created, stock unchanged

---

## Implementation Order

1. Phase 1 (backend serializer) — no deps
2. Phase 2 (backend service) — depends on Phase 1
3. Phase 3 (frontend interface) — independent
4. Phase 4 (frontend service) — depends on Phase 3
5. Phase 5 (frontend modal) — depends on Phase 3 + 4
6. Phase 6 (verification) — all prior phases complete