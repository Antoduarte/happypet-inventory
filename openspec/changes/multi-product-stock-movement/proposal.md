# Proposal: Multi-Product Stock Movement

## Intent

Allow a single stock movement request to include multiple products, processed atomically. Users need to record several product stock changes (e.g., initial inventory) in one operation without creating separate API calls per product.

## Scope

### In Scope
- Backend: `MovementFormSerializer` accepts `items[]` array with `product_id`, `presentation_id`, `quantity`
- Backend: `StockMovementService.apply_batch()` processes all items in single `transaction.atomic`
- Frontend: `MovementFormModal.tsx` — line-items UX with add/remove/edit rows, presentation selector, quantity input
- Frontend: shared `movement_type` selector and shared `notes` field for entire batch
- All-or-nothing: any item failure rolls back entire batch

### Out of Scope
- New movement types beyond 'in'/'out'
- Per-item notes
- Different movement types within same batch
- Reports/analytics changes

## Capabilities

> Capabilities whose spec-level behavior is changing.

### New Capabilities
- `stock-movement-batch`: Accept multiple products per movement request with atomic all-or-nothing semantics

### Modified Capabilities
- None (model unchanged, existing single-product path deprecated internally)

## Approach

**Extend serializer only (Approach 3)** — no model changes.

`InventoryMovement` stays as single-product audit record. `MovementFormSerializer` accepts:
```json
{
  "movement_type": "in",
  "notes": "Initial stock",
  "items": [
    { "product_id": 1, "presentation_id": 2, "quantity": 10 },
    { "product_id": 3, "presentation_id": null, "quantity": 5 }
  ]
}
```

`StockMovementService.apply_batch()` loops items, creates one `InventoryMovement` per item — all in one DB transaction. On any failure, full rollback.

Reference: `SaleService._process_items()` already implements this pattern (loop → deduct → create audit).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/happypet/products/serializers.py` | Modified | MovementFormSerializer accepts items array |
| `backend/happypet/products/services.py` | Modified | apply_batch() in StockMovementService |
| `frontend/src/pages/InventoryMovement/MovementFormModal.tsx` | Modified | Line-items UX redesign |
| `frontend/src/interfaces/product.ts` | Modified | CreateMovementPayload interface |
| `frontend/src/services/stock.ts` | Modified | API call shape |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking API change for existing single-product consumers | Medium | Versioned endpoint or backward-compat layer (defer) |
| Transaction failure — partial commit | Low | Django transaction.atomic with explicit rollback |
| Frontend UX complexity — line-items form | Medium | Reuse existing product-table patterns from other modals |

## Rollback Plan

- Revert `MovementFormSerializer` to accept single-product payload
- Revert `MovementFormModal.tsx` to single-product form
- No database migration needed (model unchanged)

## Dependencies

- `SaleService._process_items()` — reference pattern for atomic multi-item processing
- No external dependencies

## Success Criteria

- [ ] API accepts `items[]` array and processes all in atomic transaction
- [ ] Failed item rolls back entire batch
- [ ] Line-items table shows all added products with edit/delete actions
- [ ] All items share same `movement_type`
- [ ] Notes field applies to entire batch
- [ ] Build passes, no TS errors