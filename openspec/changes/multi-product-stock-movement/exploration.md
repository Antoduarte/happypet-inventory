# Exploration: Multi-Product Stock Movement

## Current State

### Model Structure
`InventoryMovement` (models.py:110-140) is a single-product movement:
- FK to `Product`
- FK to `ProductPresentation` (optional, for presentation-based movements)
- `movement_type` — `'in'` or `'out'`
- `quantity` — always in base units
- `previous_stock` / `new_stock` — auto-populated
- Immutable audit record (no update/delete on ViewSet)

### Serializer
`InventoryMovementSerializer` (serializers.py:65-147):
- Accepts `product_id`, `presentation_id`, `movement_type`, `quantity`, `notes`
- Delegates to `StockMovementService.apply()` for atomic stock update
- Returns nested `product` and `presentation` on read

### Service Layer
`StockMovementService` (services.py:49-148):
- `apply()` — creates one `InventoryMovement` + updates `Product.stock` atomically
- Raises `InsufficientStockError` if stock-out exceeds available
- Presentation-aware (multiplies quantity by `presentation.multiplier`)

### Frontend
Two components:
- `MovementFormModal.tsx` — single-product modal dialog
- `MovementFormPage.tsx` — single-product full page form

Both use `MovementFormData` schema (single product):
```typescript
product_id: number
movement_type: 'in' | 'out'
quantity: number
presentation_id?: number | null
notes?: string | null
```

### API
`POST /api/inventory-movements/` — creates one movement per request.

## Affected Areas

| File | Why Affected |
|------|-------------|
| `backend/happypet/products/models.py` | InventoryMovement is single-product |
| `backend/happypet/products/serializers.py` | Must accept items array |
| `backend/happypet/products/services.py` | StockMovementService must process batch |
| `backend/happypet/products/views.py` | ViewSet stays but serializer changes |
| `frontend/src/schemas/movement.ts` | Schema must support multi-item |
| `frontend/src/interfaces/product.ts` | CreateMovementPayload changes |
| `frontend/src/services/stock.ts` | API call shape changes |
| `frontend/src/hooks/useStock.ts` | Hook interface changes |
| `frontend/src/pages/InventoryMovement/MovementFormModal.tsx` | UX: line-items pattern |
| `frontend/src/pages/InventoryMovement/MovementFormPage.tsx` | UX: line-items pattern |

## Data Flow (Current)

```
Frontend: { product_id, movement_type, quantity, presentation_id } → POST /api/inventory-movements/
Backend: InventoryMovementSerializer.create() → stock_movement_service.apply()
  → InventoryMovement.objects.create() + Product.objects.update(stock)
```

## Movement Type Enum
Only `'in'` and `'out'` exist (constants.py:16-22). No `'ajuste'` type — corrections are done with `'in'` (stock return) or `'out'` (stock out) using the notes field.

## Approaches

### 1. **Batch Items on Existing Model** — Serializer accepts `items: [...]`
- Keep `InventoryMovement` as single-product audit record
- Add `items` list to create payload; create multiple `InventoryMovement` records in one transaction
- **Pros**: Minimal model change, existing history preserved
- **Cons**: No atomic grouping — each movement is independent audit record
- **Effort**: Medium

### 2. **Movement Header + Line Items** — New `StockMovement` model
- New `StockMovement` (header: notes, date, type) → `StockMovementItem` (product, presentation, quantity)
- `InventoryMovement` becomes internal only (for audit), new services work at StockMovement level
- **Pros**: True atomic batch, grouped audit trail
- **Cons**: Larger refactor, migration complexity
- **Effort**: High

### 3. **Extend Serializer Only** — Flat list items on same endpoint
- Reuse existing `InventoryMovement` model but create N records via single endpoint call
- Backend creates all movements in `transaction.atomic`, frontend sends `items[]`
- **Pros**: Simplest change, no model changes, easy rollback
- **Cons**: API payload changes significantly (breaking change for existing consumers)
- **Effort**: Low-Medium

## Recommendation

**Approach 3** — Extend Serializer Only.

Rationale:
- No model changes needed (lowest risk)
- Follows existing pattern from `SaleService` which processes `items[]` array and creates multiple `SaleItem` in one transaction
- Rollback is trivial (revert serializer + frontend payload)
- Effort is contained — frontend adds line-item UX, backend processes list
- Preserves full audit trail (N `InventoryMovement` records, one per product)

The backend `SaleService._process_items()` already demonstrates this pattern (loop items → deduct stock → create audit records). The stock movement service can be extended similarly.

### Changes Required

**Backend:**
1. New serializer `InventoryMovementCreateSerializer` accepting `{ movement_type, items: [{ product_id, presentation_id, quantity }], notes }`
2. `StockMovementService` gets `apply_batch(items, movement_type, notes)` method
3. All items processed in single `transaction.atomic`
4. Each item creates its own `InventoryMovement` record

**Frontend:**
1. New schema `movementBatchSchema` with `items: movementItemSchema[]`
2. New `useStock().createBatch()` hook method
3. `MovementFormPage.tsx` refactored to line-items UI (add/remove rows)
4. `MovementFormModal.tsx` refactored similarly

## Risks

- **Breaking API change**: Existing consumers of `POST /inventory-movements/` with single product payload must migrate
- **Validation complexity**: Must validate each item individually (stock check per product)
- **Partial failure**: If item 3 of 5 fails validation, items 1-2 already committed — needs explicit handling
- **Frontend complexity**: Line-items UX is more complex than single-product form

## Open Questions

1. Should a failed item in a batch roll back the entire batch (all-or-nothing) or commit valid items individually?
2. Should the movement type apply to all items or can some items be `'in'` and others `'out'` in the same batch?
3. Is there a use case for different notes per item, or one notes field shared across the batch?

## Ready for Proposal

**Yes** — enough understood to proceed to `sdd-propose`. The scope is clear and the approach follows an existing pattern in the codebase (SaleService multi-item processing).