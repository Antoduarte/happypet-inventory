# Sale Read View Specification

## Purpose
Read-only detail page for an individual sale. Displays status banner, financial stats, line items, and linked cash session metadata.

## Requirements

### Functional

| ID | Requirement |
|---|---|
| F1 | The system MUST display a colored status banner: pending=amber, completed=emerald, cancelled=red. |
| F2 | The system MUST show a stat grid with: items count, subtotal, discount/recargo, total, payment method. |
| F3 | The system MUST render line items in a table on desktop and stacked cards on mobile. |
| F4 | The system MUST display a nested `cash_session` object with register name, opened_at, and status. |
| F5 | The system MUST support navigation from `SalesList` row click to `/sales/:id`. |

### Non-functional

| ID | Requirement |
|---|---|
| NF1 | Page MUST render primary content within 2s on a 3G connection. |
| NF2 | Layout MUST be responsive down to 320px width without horizontal scroll. |
| NF3 | Color contrast for status banners MUST meet WCAG 2.1 AA. |

## Scenarios

### Scenario: View pending sale
- GIVEN a sale with status `pending`
- WHEN the user navigates to `/sales/{id}`
- THEN the banner is amber and all data, items, and totals are visible

### Scenario: View completed sale
- GIVEN a completed sale linked to a cash session
- WHEN the user navigates to `/sales/{id}`
- THEN the banner is emerald and the cash session card shows register name, opened_at, status

### Scenario: View cancelled sale
- GIVEN a cancelled sale
- WHEN the user navigates to `/sales/{id}`
- THEN the banner is red and cancellation info is visible

### Scenario: Navigate from SalesList
- GIVEN the user is on `/sales`
- WHEN the user clicks a row
- THEN the browser navigates to `/sales/{id}`

### Scenario: Responsive mobile layout
- GIVEN the viewport is < 768px
- WHEN the detail page loads
- THEN items render as stacked cards and the desktop table is hidden

### Scenario: Cash session display
- GIVEN a sale linked to a cash session
- WHEN the page renders
- THEN a card shows register name, opened_at datetime, and session status

### Scenario: Product item with presentation
- GIVEN a product item with a presentation snapshot
- WHEN the page renders
- THEN the row shows type icon, name, presentation, qty, unit price, discount, total

### Scenario: Sale not found
- GIVEN a non-existent sale ID
- WHEN the user navigates to `/sales/{id}`
- THEN a 404-friendly message and a back button are shown

### Scenario: Network error
- GIVEN the API is unreachable
- WHEN the page requests the sale
- THEN an error message and a retry button are displayed

## API Contract

### GET /api/sales/{id}/

Response 200 OK:
```json
{
  "id": 1,
  "cash_session": {
    "id": 5,
    "register_name": "Caja Principal",
    "opened_at": "2026-06-01T09:00:00Z",
    "status": "open"
  },
  "quantity": 3,
  "subtotal": "45.00",
  "total_price": "42.75",
  "discount_percentage": 5,
  "surcharge_percentage": 0,
  "surcharge_reason": null,
  "status": "completed",
  "payment_type": "cash",
  "sale_date": "2026-06-01T14:30:00Z",
  "items": [ ... ]
}
```

Nested `cash_session` fields: `id`, `register_name`, `opened_at`, `status`.

## UI/UX Rules

- Status colors: `pending` = amber, `completed` = emerald, `cancelled` = red.
- Stat grid: 5 stats in a responsive grid (2 cols mobile, 5 cols desktop).
- Items table columns: Type, Name, Presentation, Quantity, Unit Price, Discount, Total.
- Mobile fallback: stacked cards with type icon, name, qty × price, total.
- Cash session card: register name, opened_at (localized), status badge.

## Data Model Changes

### SaleSerializer
- Add read-only nested `cash_session` using a minimal serializer with `id`, `register_name`, `opened_at`, `status`.
- `register_name` sourced from `cash_session.cash_register.name`.

### SaleViewSet
- `retrieve` MUST use `select_related('cash_session__cash_register')` to avoid N+1.

## Error Cases

| Case | Behavior |
|---|---|
| 404 Sale not found | Friendly message "Venta no encontrada" + back button |
| Network error | Inline error message + retry button |
| Loading | Skeleton stat cards and shimmer table rows |

## Accessibility

- Semantic HTML: `<section>` for stats, `<article>` for items, `<table>` with `<caption>` for desktop items.
- Status badges: `aria-label` describing status (e.g., "Estado: Pendiente").
- Items table: keyboard-navigable rows with visible focus ring.
