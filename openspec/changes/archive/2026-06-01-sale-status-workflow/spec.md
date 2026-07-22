# Delta Spec: Sale Status Workflow

## ADDED Requirements

### Requirement: Status Transition Endpoint
The system MUST expose a PATCH endpoint to transition a sale from `pending` to `completed` or `cancelled`.

#### Scenario: Complete a pending sale
- GIVEN a sale with `status=pending`
- WHEN an authorized user sends `PATCH /api/sales/{id}/` with `{status: "completed"}`
- THEN the sale status becomes `completed`
- AND the response returns `200 OK` with the updated sale

#### Scenario: Cancel a pending sale
- GIVEN a sale with `status=pending` and product items that deducted stock
- WHEN an authorized user sends `PATCH /api/sales/{id}/` with `{status: "cancelled"}`
- THEN the sale status becomes `cancelled`
- AND stock is restored for all product items
- AND reversing `InventoryMovement` records (type=`in`) are created

### Requirement: State Machine Guard
The system MUST reject invalid status transitions.

#### Scenario: Invalid transition from completed
- GIVEN a sale with `status=completed`
- WHEN a user attempts to PATCH the status to `cancelled`
- THEN the API returns `400 Bad Request` with error `"Invalid status transition"`

#### Scenario: Terminal state mutation
- GIVEN a sale with `status=cancelled`
- WHEN a user attempts to PATCH the status to any value
- THEN the API returns `400 Bad Request` with error `"Terminal state cannot be changed"`

### Requirement: Stock Revert on Cancel
The system MUST revert all stock deductions when a sale is cancelled.

#### Scenario: Revert presentation sale stock
- GIVEN a cancelled sale item with a presentation where `quantity=2` and `multiplier=5`
- WHEN the cancel transition executes
- THEN `Product.stock` increases by `10` base units
- AND an `InventoryMovement` (type=`in`) is created with `quantity=10`

#### Scenario: Revert direct product stock
- GIVEN a cancelled sale item without a presentation where `quantity=3`
- WHEN the cancel transition executes
- THEN `Product.stock` increases by `3` base units
- AND an `InventoryMovement` (type=`in`) is created with `quantity=3`

### Requirement: Cash Session Link on Complete
The system MAY link a completed sale to an open `CashSession` and create a `CashMovement`.

#### Scenario: Cash payment with open session
- GIVEN a pending sale with `payment_type=cash` and a linked open `CashSession`
- WHEN the sale is completed
- THEN a `CashMovement` (type=`income`) is created with `amount=total_price`

#### Scenario: Non-cash payment
- GIVEN a pending sale with `payment_type=card`
- WHEN the sale is completed
- THEN no `CashMovement` is created

### Requirement: Permission Guard
The system MUST allow only Admin, Manager, and Cashier roles to execute transitions.

#### Scenario: Unauthorized transition attempt
- GIVEN an authenticated user with an unauthorized role
- WHEN they attempt to PATCH a sale status
- THEN the API returns `403 Forbidden`

## MODIFIED Requirements

### Requirement: Sale List UI
The system MUST render status-action buttons in the sales list.
(Previously: `SalesList` displayed status as a read-only badge with no actions.)

#### Scenario: Show actions for pending sales
- GIVEN the sales list page
- WHEN a sale has `status=pending`
- THEN "Complete" and "Cancel" action buttons are visible in that row

#### Scenario: Hide actions for terminal sales
- GIVEN the sales list page
- WHEN a sale has `status=completed` or `status=cancelled`
- THEN no status-action buttons are rendered for that row

## Data Model Changes

| Model | Change |
|-------|--------|
| `Sale.status` | Constant spelling fix: backend `canceled` → `cancelled` (migration) |
| `InventoryMovement` | No schema change; new `in` records created on cancel |
| `CashMovement` | No schema change; new `income` records created on complete (cash only) |

## API Contract

```
PATCH /api/sales/{id}/

Request body:
{
  "status": "completed" | "cancelled"
}

Response 200:
{
  "id": 1,
  "status": "completed",
  // ... full SaleSerializer response
}

Response 400:
{ "status": ["Invalid status transition."] }

Response 403:
{ "detail": "You do not have permission to perform this action." }
```

## Frontend Rules

- `SalesList` renders Complete/Cancel buttons only when `sale.status === 'pending'`.
- Buttons invoke `patchSale(id, { status })` via `useSale.updateSale`.
- On success, the local sales list is updated via the existing hook state reducer.
- On error, a toast displays the backend error message.
- The `SaleStatus` type already includes `'cancelled'`; backend constant MUST align.

## Error Cases

| Case | Trigger | Response |
|------|---------|----------|
| Invalid transition | `completed` → `cancelled`, `cancelled` → any, any → same | `400` + clear message |
| Permission denied | User role not in [admin, manager, cashier] | `403` |
| Race condition | Concurrent sale creation + cancel on same product | Atomic transaction + `select_for_update` prevents stock drift |
| Cash session closed | Sale linked to closed session on complete | `400` (session must be open) |

## Acceptance Criteria

- [ ] PATCH `pending` → `completed` returns `200` with updated sale
- [ ] PATCH `pending` → `cancelled` reverts stock and creates `InventoryMovement(type=in)`
- [ ] PATCH from terminal state returns `400`
- [ ] PATCH with invalid status value returns `400`
- [ ] Cash payment on complete creates `CashMovement(type=income)` if session is open
- [ ] Non-cash payment on complete does not create `CashMovement`
- [ ] Frontend shows Complete/Cancel buttons only for `pending` sales
- [ ] Admin, Manager, Cashier can execute transitions; others get `403`
- [ ] All backend tests pass

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stock revert race condition | Low | `select_for_update` + atomic transaction, same pattern as deduction |
| CashMovement double-count | Med | Only create on complete; verify session expected amount logic in tests |
| Spelling mismatch | Med | Fix backend constant to `cancelled` in same migration |
