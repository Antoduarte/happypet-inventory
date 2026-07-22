# Delta for stock-movement-batch

## Purpose

Accept multiple products in a single inventory movement request. All items are validated before any are processed, and all stock updates occur in a single atomic transaction. A failure on any item rolls back the entire batch.

## ADDED Requirements

### Requirement: Batch Movement Payload

`POST /api/inventory-movements/` accepts `items[]` alongside `movement_type` and `notes`.

The request payload MUST be:

```json
{
  "movement_type": "in" | "out",
  "notes": "string or null",
  "items": [
    {
      "product_id": 1,
      "presentation_id": 2,
      "quantity": "10.0000"
    }
  ]
}
```

- `movement_type` is **batch-level** — all items share the same type.
- `notes` is **batch-level** — applies to the entire movement.
- `items[]` elements: `product_id` (required), `presentation_id` (optional, null for base unit), `quantity` (required, decimal string or number).
- A minimum of **one item** is REQUIRED.

#### Scenario: Valid batch 'in' movement with three items

- GIVEN products P1, P2, P3 exist in the system
- WHEN the client sends `POST /api/inventory-movements/` with `movement_type: "in"`, `notes: "Initial stock"`, and `items: [{product_id: P1.id, quantity: 10}, {product_id: P2.id, presentation_id: null, quantity: 5}, {product_id: P3.id, presentation_id: some_presentation.id, quantity: 2}]`
- THEN the server creates **three** `InventoryMovement` records (one per item)
- AND each record references the correct product and presentation
- AND each record's `quantity` is converted to base units using the presentation multiplier (or is the direct quantity if no presentation)
- AND the stock of each product is updated accordingly
- AND the shared `notes` field is stored on each movement record
- AND the response returns HTTP 201 with an array of the three created movement objects

#### Scenario: Empty items array

- GIVEN the client sends `POST /api/inventory-movements/` with `movement_type: "in"`, `notes: null`, and `items: []`
- THEN the server returns HTTP 400 with `{"items": "At least one item is required."}`
- AND no `InventoryMovement` record is created

#### Scenario: Single-item batch (backward compatibility)

- GIVEN the client sends `POST /api/inventory-movements/` with `movement_type: "out"`, `notes: "Correction"`, and `items: [{product_id: P1.id, quantity: 2}]`
- THEN the behavior is identical to the existing single-product `InventoryMovementSerializer.create()`
- AND HTTP 201 is returned with a single movement object
- AND no existing behavior is changed for single-item payloads

---

### Requirement: All-or-Nothing Atomicity

All items in a batch MUST be validated before any are processed. If **any item** fails validation or processing, the **entire batch** MUST roll back — zero items created, zero stock changes.

The server MUST use Django's `transaction.atomic` to wrap all item processing in a single database transaction.

#### Scenario: Item 2 fails validation — full rollback

- GIVEN a batch with three items where item 2 has an invalid `presentation_id`
- WHEN the server processes the batch
- THEN all three items are rejected
- AND zero `InventoryMovement` records are created
- AND HTTP 422 is returned with a validation error for item 2
- AND no product stock is modified

#### Scenario: 'out' movement — item 3 has insufficient stock

- GIVEN a batch 'out' movement where product P3 has only 5 units in stock but item 3 requests 10 units
- WHEN the server processes the batch
- THEN zero `InventoryMovement` records are created
- AND no product stock is modified
- AND HTTP 422 is returned with `{"items": [{"quantity": "Stock insuficiente para 'P3': se requieren 10.0000 u, pero solo hay 5.0000 disponibles."}]}`

---

### Requirement: Duplicate Product+Presentation Consolidation

If the `items[]` array contains duplicate `{product_id, presentation_id}` pairs, the server MUST **consolidate** the quantities by summing them into a single item before processing.

#### Scenario: Duplicate product_id with different presentations — each kept separate

- GIVEN the client sends a batch with two items for the same `product_id` but different `presentation_id` values
- WHEN the server processes the batch
- THEN two separate `InventoryMovement` records are created (one per presentation)

#### Scenario: Duplicate product_id and presentation_id — quantities summed

- GIVEN the client sends a batch with `items: [{product_id: 1, presentation_id: 2, quantity: 5}, {product_id: 1, presentation_id: 2, quantity: 3}]`
- WHEN the server processes the batch
- THEN the quantities are consolidated to a single item: `{product_id: 1, presentation_id: 2, quantity: 8}`
- AND only **one** `InventoryMovement` record is created
- AND HTTP 201 is returned with one movement object

---

### Requirement: Batch-Level Movement Type Consistency

All items in a batch MUST share the **same** `movement_type`. The server MUST reject a batch where items would require different movement types.

#### Scenario: Mixed movement type intent rejected

- GIVEN the client sends a batch where the intent is to move some items in and some items out (based on negative quantities or other signal)
- WHEN the server processes the batch
- THEN the batch is rejected with HTTP 400
- AND the error message clarifies that all items must use the batch-level `movement_type`
- AND zero `InventoryMovement` records are created

---

### Requirement: Per-Item Stock Validation for 'out' Movements

For batch 'out' movements, the server MUST validate **each item individually** to ensure sufficient stock exists before committing any changes. The validation uses the product's current stock and the item's quantity (converted to base units via presentation multiplier if applicable).

#### Scenario: All items have sufficient stock — committed

- GIVEN a batch 'out' movement with three items, each product having sufficient stock
- WHEN the server processes the batch within the atomic transaction
- THEN each item's stock is validated before any deduction occurs
- AND if all pass, all three `InventoryMovement` records are created with `movement_type: 'out'`
- AND each product's `stock` is updated to `previous_stock - quantity`

---

## API Contract

### POST /api/inventory-movements/

**Request body (batch mode)**:

```json
{
  "movement_type": "in",
  "notes": "Initial stock fill",
  "items": [
    {"product_id": 1, "presentation_id": null, "quantity": 10},
    {"product_id": 2, "presentation_id": 5, "quantity": 3}
  ]
}
```

**Response 201 Created** (all items processed successfully):

```json
[
  {
    "id": 10,
    "product": { "id": 1, "name": "Harina", "stock": "110.0000", "base_unit": "kg" },
    "presentation": null,
    "movement_type": "in",
    "quantity": "10.0000",
    "previous_stock": "100.0000",
    "new_stock": "110.0000",
    "movement_date": "2026-06-02T10:00:00Z",
    "notes": "Initial stock fill"
  },
  {
    "id": 11,
    "product": { "id": 2, "name": "Azúcar", "stock": "53.0000", "base_unit": "kg" },
    "presentation": { "id": 5, "name": "Saco 50kg", "multiplier": "50.0000" },
    "movement_type": "in",
    "quantity": "150.0000",
    "previous_stock": "0.0000",
    "new_stock": "150.0000",
    "movement_date": "2026-06-02T10:00:00Z",
    "notes": "Initial stock fill"
  }
]
```

**Response 400 Bad Request** (empty items):

```json
{"items": ["At least one item is required."]}
```

**Response 400 Bad Request** (duplicate consolidation, quantities summed):

```json
{"note": "Duplicate items detected. Quantities have been consolidated."}
```

**Response 422 Unprocessable Entity** (validation failure — insufficient stock, invalid presentation):

```json
{
  "items": [
    {"quantity": "Stock insuficiente para 'Azúcar': se requieren 200.0000 kg, pero solo hay 150.0000 disponibles."}
  ]
}
```

---

## Data Model Changes

None. `InventoryMovement` remains a single-product audit record. Each item in the batch creates its own `InventoryMovement` record. No model changes are required.

### MovementFormSerializer (modified)

- Add `items` field: a list of nested item schemas containing `product_id`, `presentation_id`, `quantity`.
- `product_id` and `presentation_id` retain existing validators.
- `quantity` uses `DecimalField` with `max_digits=12`, `decimal_places=4`.
- Override `create()` to delegate to `StockMovementService.apply_batch()` instead of `apply()`.
- Reject `items: []` with a validation error.

### StockMovementService (modified)

- Add `apply_batch(movement_type, notes, items)` method.
  - Takes `movement_type` (str), `notes` (str|None), `items` (list[dict]).
  - Consolidates duplicates by summing quantities for matching `(product_id, presentation_id)` pairs.
  - Validates all items before any DB writes.
  - Wraps all writes in `transaction.atomic`.
  - Raises `ValidationError` on any item failure (triggers full rollback).
- Existing `apply()` method remains unchanged.

## Error Cases

| Case | HTTP | Body |
|------|------|------|
| Empty `items` array | 400 | `{"items": ["At least one item is required."]}` |
| Invalid `product_id` | 422 | Per-field validation error |
| Invalid `presentation_id` | 422 | Per-field validation error |
| `presentation_id` not owned by product | 422 | `{"presentation_id": ["La presentación seleccionada no pertenece al producto seleccionado."]}` |
| 'out' exceeds available stock | 422 | `{"items": [{"quantity": "Stock insuficiente..."}]}` |
| Unknown `movement_type` | 400 | `{"movement_type": ["Invalid choice."]}` |

## Acceptance Criteria

- [ ] `POST /api/inventory-movements/` with `items[]` array creates one `InventoryMovement` per item
- [ ] All items share the same `movement_type` and `notes` from the batch
- [ ] Duplicate `{product_id, presentation_id}` pairs are consolidated (quantities summed)
- [ ] Any item failure (validation, insufficient stock) causes full rollback of all items
- [ ] Empty `items` array returns HTTP 400
- [ ] Single-item batch produces identical behavior to existing single-product path
- [ ] All stock updates are atomic (single DB transaction)
- [ ] Each `InventoryMovement` record is individually auditable (has its own `previous_stock`, `new_stock`, `movement_date`)