# Design: multi-product-stock-movement

## Technical Approach

Extend `InventoryMovementSerializer` to accept a **batch payload** (`items[]`) alongside the existing single-item fields. A new `apply_batch()` method on `StockMovementService` processes all items atomically using `transaction.atomic()`. The serializer consolidates duplicate product+presentation pairs before calling the service. The frontend converts the single-product form into a line-items table matching the sale form pattern.

## Architecture Decisions

### Decision: Where to consolidate duplicates

| Option | Location | Pros | Cons |
|--------|----------|------|------|
| A | Serializer `validate()` | Fail-fast before touching stock; no partial state | Duplicates validated twice (once normalized, once per-item) |
| B | Service `apply_batch()` | Single place for business logic | Stock already validated; service must undo or refuse |

**Choice**: **Option A** — serializer-level consolidation.
**Rationale**: Fail-fast prevents unnecessary DB reads. Duplicate summation is input normalization, not business logic — proper in the serializer layer.

### Decision: Root fields vs `items[]`

| Option | Behavior | Tradeoff |
|--------|----------|----------|
| Require `items[]` only | Deprecate root fields; break existing callers | Forcing all consumers to change |
| Keep both (fallback) | `items[]` present → batch mode; otherwise use root fields | Serializer complexity increases slightly |

**Choice**: **Keep both** — detect mode at serializer level.
**Rationale**: Existing single-item consumers (any existing API tests, scripts) continue to work unchanged. The fallback path is one `if items: ... else: ...` in `create()`.

### Decision: Invalid presentation_owned_by_product validation

**Choice**: In serializer `validate()` — same pattern already in `InventoryMovementSerializer.create()` (line 131-134):

```python
if presentation and presentation.product_id != product.id:
    raise serializers.ValidationError(
        {"presentation_id": "La presentación seleccionada no pertenece al producto seleccionado."}
    )
```

**Rationale**: Already implemented; reuse existing pattern.

## Data Flow

```
Client POST /api/inventory-movements/
         │
         ▼
┌──────────────────────────────────────────────────────┐
│  InventoryMovementSerializer                         │
│   ├── root fields (product_id, quantity, etc.)      │
│   │    └── if items absent → single-item fallback    │
│   └── items[]                                        │
│        ├── validate(): consolidate duplicates        │
│        └── create(): call apply_batch()              │
└──────────────────────┬───────────────────────────────┘
                       │ items[], movement_type, notes
                       ▼
┌──────────────────────────────────────────────────────┐
│  StockMovementService.apply_batch()                  │
│   ├── for item in consolidated items:               │
│   │    ├── validate presentation belongs to product │
│   │    └── for 'out': check InsufficientStockError  │
│   └── transaction.atomic():                         │
│        ├── create InventoryMovement per item        │
│        └── update Product.stock per item            │
└──────────────────────────────────────────────────────┘
```

## File Changes

### Backend

| File | Action | Description |
|------|--------|-------------|
| `products/serializers.py` | Modify | Add `MovementItemSerializer` (nested), add `items` field, duplicate consolidation in `validate()`, `create()` delegates to `apply_batch()` |
| `products/services.py` | Modify | Add `apply_batch(movement_type, notes, items[])` using `transaction.atomic()` with `select_for_update` per item |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `interfaces/product.ts` | Modify | Add `items: MovementItem[]` to `CreateMovementPayload`; define `MovementItem` type |
| `services/stock.ts` | Modify | `createMovement()` accepts batch payload; typed response as `InventoryMovement[]` |
| `pages/InventoryMovement/MovementFormModal.tsx` | Modify | Line-items table UX: `useState` array of `{product_id, presentation_id, quantity}`, add/remove/edit rows, batch submit |
| `hooks/useStock.ts` | Modify | `createMovement()` returns `InventoryMovement[]` for batch |

## Backend Details

### `products/serializers.py`

```python
class MovementItemSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(deleted_at__isnull=True),
        write_only=True,
        source="product",
    )
    presentation_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductPresentation.objects.all(),
        source="presentation",
        write_only=True,
        required=False,
        allow_null=True,
    )
    quantity = serializers.DecimalField(max_digits=12, decimal_places=4, min_value=0)

class InventoryMovementSerializer(serializers.ModelSerializer):
    # ... existing fields ...

    items = MovementItemSerializer(many=True, write_only=True, required=False)

    def validate(self, attrs):
        items = attrs.get("items")
        if not items:
            return attrs  # fallback to root fields

        # Consolidate duplicates: sum quantities for same (product_id, presentation_id)
        seen: dict[tuple, dict] = {}
        for item in items:
            key = (item["product"].id, (item["presentation"].id if item["presentation"] else None))
            if key in seen:
                seen[key]["quantity"] += item["quantity"]
            else:
                seen[key] = item
        attrs["_consolidated_items"] = list(seen.values())
        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items", None)
        if items is None:
            # BACKWARD COMPAT: single-item fallback using root fields
            return self._create_single(validated_data)

        movement_type = validated_data["movement_type"]
        notes = validated_data.get("notes")

        try:
            movements = stock_movement_service.apply_batch(
                movement_type=movement_type,
                notes=notes,
                items=validated_data["_consolidated_items"],
            )
        except InsufficientStockError as exc:
            raise serializers.ValidationError({"items": [{"quantity": str(exc)}]}) from exc

        return movements
```

### `products/services.py`

```python
def apply_batch(
    self,
    *,
    movement_type: str,
    notes: str | None,
    items: list[dict],
) -> list[InventoryMovement]:
    movements = []
    with transaction.atomic():
        for item in items:
            product = item["product"]
            presentation = item.get("presentation")
            quantity = Decimal(str(item["quantity"]))

            if presentation and presentation.product_id != product.id:
                raise ValidationError(
                    {"presentation_id": "La presentación no pertenece al producto."}
                )

            if movement_type == MOVEMENT_OUT:
                if presentation:
                    base_qty = quantity * presentation.multiplier
                else:
                    base_qty = quantity

                product = Product.objects.select_for_update().get(pk=product.pk)
                if product.stock < base_qty:
                    raise InsufficientStockError(product, base_qty, product.stock)

            movement = self.apply(
                product=product,
                presentation=presentation,
                movement_type=movement_type,
                quantity=quantity,
                notes=notes,
            )
            movements.append(movement)

    return movements
```

## Frontend Details

### State shape (line-items array)

```typescript
interface MovementItemState {
  product_id: number | null;
  presentation_id: number | null;
  quantity: number;
}

const [items, setItems] = useState<MovementItemState[]>([]);

// Add row
const addRow = () => setItems(prev => [...prev, { product_id: null, presentation_id: null, quantity: 1 }]);

// Remove row by index
const removeRow = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

// Update row
const updateRow = (index: number, field: keyof MovementItemState, value: number | null) =>
  setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
```

### API call

```typescript
// services/stock.ts
async createMovementBatch(payload: {
  movement_type: MovementType;
  notes: string | null;
  items: { product_id: number; presentation_id: number | null; quantity: number }[];
}): Promise<InventoryMovement[]> {
  return api.post<InventoryMovement[]>('/inventory-movements/', payload);
}
```

### Line-items table layout (inside `MovementFormModal.tsx`)

```
┌────────────────────────────────────────────────────────────────┐
│ movement_type  [Entrada ▼]    notes  [.................]      │
├────────────────────────────────────────────────────────────────┤
│ # │ Producto         │ Presentación │ Cant. │ 动作           │
│ 1 │ [SearchableCombo]│ [Combo ▼]    │ [  5] │ [🗑️]           │
│ 2 │ [SearchableCombo]│ [Combo ▼]    │ [ 10] │ [🗑️]           │
├────────────────────────────────────────────────────────────────┤
│                            [+ Agregar producto]                │
└────────────────────────────────────────────────────────────────┤
│                              [Registrar Movimiento]            │
```

Key differences from `SaleFormPage`:
- No price columns (stock movements are free — no monetary value)
- No subtotals or totals per row
- No discounts/surcharges
- Simpler: product selector → presentation selector → quantity per row
- Single shared `movement_type` + `notes` at the top

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `validate()` duplicate consolidation | Serializer tests: pass `[{p1, pres1, qty=5}, {p1, pres1, qty=3}]` → expect one item qty=8 |
| Unit | `apply_batch()` with 3 items | Service tests: mock Product; verify 3 `InventoryMovement` created, all in one transaction |
| Unit | `apply_batch()` rollback on insufficient stock | Service tests: set stock=5, request qty=10 → `InsufficientStockError`, verify 0 movements created |
| Integration | `POST /inventory-movements/` with `items[]` | Django test client: send batch, verify 201 + N movement records + stock updates |

No frontend test framework is configured per `openspec/config.yaml`.

## Open Questions

- [x] Single-item fallback backward compat — resolved in Decision 2 above
- [ ] Should the response return the array of movements or redirect to list? — Spec says 201 with array, no change needed
