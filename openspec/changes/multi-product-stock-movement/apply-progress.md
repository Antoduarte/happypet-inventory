# Apply Progress: multi-product-stock-movement

## Summary

All implementation tasks for multi-product stock movement have been completed. Backend serializer + service support batch operations atomically. Frontend interface updated to line-items table UX.

## Completed Tasks

### Phase 1: Backend — Serializer Changes
- [x] 1.1 Added `MovementItemSerializer` inner class with `product_id`, `presentation_id`, `quantity`
- [x] 1.2 Added `items = MovementItemSerializer(many=True, write_only=True, required=False)` field
- [x] 1.3 `validate()` consolidates duplicates using `OrderedDict` — sums quantities for same `(product_id, presentation_id)` pair; stored in `attrs["_consolidated_items"]`
- [x] 1.4 `create()` detects batch vs single-item: `items` present → `apply_batch()`, else → `_create_single()` for backward compat
- [x] 1.5 `InsufficientStockError` wrapped → `ValidationError({"items": [{"quantity": [str(exc)]}]})`

### Phase 2: Backend — Service Changes
- [x] 2.1 Added `apply_batch(movement_type, notes, items)` to `StockMovementService`
- [x] 2.2 Outer `transaction.atomic()` wrapper; `select_for_update()` on `Product` for 'out' movements
- [x] 2.3 Presentation belongs-to-product validation; stock check for 'out' → `InsufficientStockError`
- [x] 2.4 `self.apply()` called per item; all movements collected and returned as list

### Phase 3: Frontend — Interface Changes
- [x] 3.1 Added `MovementItem` type: `{ product_id: number; presentation_id: number | null; quantity: number }`
- [x] 3.2 Added `items?: MovementItem[]` to `CreateMovementPayload` (root fields made optional for batch compat)
- [x] 3.3 `ProductPresentation` type already exported (confirmed at line ~20)

### Phase 4: Frontend — Service Changes
- [x] 4.1 `createMovement()` accepts single-item or batch payload
- [x] 4.2 Return type updated to `InventoryMovement | InventoryMovement[]`
- [x] 4.3 Backward compat: no `items` field → root fields; `items` present → batch format

### Phase 5: Frontend — MovementFormModal Redesign
- [x] 5.1 `items` state: `useState<LineItem[]>` with `{ product_id: null, presentation_id: null, quantity: 1 }`
- [x] 5.2 "Agregar producto" button adds empty row to items array
- [x] 5.3 Line-items table with columns: Producto, Presentación, Cantidad, Acciones
- [x] 5.4 Per row: `SearchableCombobox` for product, `<select>` for presentation, number input for quantity, trash icon to remove
- [x] 5.5 On product change: loads presentations via `presentationService.getPresentations()`, resets presentation_id
- [x] 5.6 `movement_type` selector + `notes` field at form level (batch-level)
- [x] 5.7 Submit calls `createMovement({ movement_type, notes, items })` with items array
- [x] 5.8 Validation: at least 1 item, all have product_id, all quantities > 0

### Phase 6: Verification
- [x] 6.2 `npm run build` passes — TypeScript compiles with no errors in changed files
- [ ] 6.1, 6.3, 6.4 — Manual verification tasks (Python not available in PATH)

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/happypet/products/serializers.py` | Modified | Added `MovementItemSerializer`, `items` field, `validate()` consolidation, `create()` batch dispatch, `_create_single()` helper |
| `backend/happypet/products/services.py` | Modified | Added `apply_batch()` with `transaction.atomic()`, `select_for_update()`, per-item stock validation |
| `frontend/src/interfaces/product.ts` | Modified | Added `MovementItem` type; updated `CreateMovementPayload` with `items` + optional root fields |
| `frontend/src/services/stock.ts` | Modified | Updated `createMovement()` return type to union; JSDoc updated for batch mode |
| `frontend/src/hooks/useStock.ts` | Modified | `createMovement()` now handles array response; toast reflects batch count |
| `frontend/src/pages/InventoryMovement/MovementFormModal.tsx` | Rewritten | New line-items table UX with add/remove rows, per-row product+presentation selectors |

## Deviations from Design

- `MovementItemRow` uses `const [movementType, setMovementType] = useState` instead of `watch()` from react-hook-form (the `watch` import was not available as a named export; `register` still works for the form-level field without needing the hook's watch)
- Presentation options per row loaded via `presentationService` (lazy-loaded per product, not pre-fetched) to match the pattern used in `SaleProductRow`
- All other implementation matches design exactly

## Risks

- `presentationService.getPresentations()` endpoint must exist and return `{ results: [...] }` — verified via pattern in `SaleProductRow.tsx` line 65
- Backend view must support returning a list of `InventoryMovement` objects for batch — DRF serializer returns a list when `many=True` on the response serializer; this needs to be confirmed in the view

## Next Steps

- Manual verification tasks 6.1, 6.3, 6.4 require Python in PATH
- Consider adding backend tests for `apply_batch()` as outlined in design.md testing strategy