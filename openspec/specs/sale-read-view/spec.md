# Sale Read View Specification

## Purpose
Read-only detail page for an individual sale. Displays status banner, financial stats, line items, and linked cash session metadata.

## Requirements

### Requirement: Layout Structure

The page MUST use a single-column layout with a hero card at the top. The layout MUST replace any sidebar-based 12-column grid with a full-width `SaleHeroCard` followed by a two-column items grid below. On mobile (viewport < 768px), the two columns MUST stack vertically into a single column.

#### Scenario: View completed sale with hero card layout

- GIVEN a completed sale with services, products, and supplies
- WHEN the user navigates to `/sales/{id}`
- THEN the page renders a full-width `SaleHeroCard` at the top, followed by a two-column items grid below
- AND the services column appears on the left, products column on the right

#### Scenario: Mobile stacked layout

- GIVEN a completed sale with multiple services and products
- WHEN the page renders on a device with viewport < 768px
- THEN the two-column layout collapses into a single stacked column
- AND services appear before products

---

### Requirement: Navigation — Back Button Placement

The "Volver" button MUST appear in the `PageHeader` action slot (top-right). The button MUST NOT appear at the bottom of the page. The button uses a secondary variant with a left-arrow icon.

#### Scenario: Back navigation from header

- GIVEN the user is on `/sales/{id}`
- WHEN the user clicks "Volver" in the PageHeader action slot
- THEN the browser navigates back to `/sales`

---

### Requirement: SaleHeroCard — Content

The `SaleHeroCard` MUST display: Sale ID, date/time (localized), payment method, and status badge. It MUST NOT include a financial breakdown — the financial summary appears as a separate card below the items grid. The hero card MUST NOT duplicate information shown elsewhere on the page.

#### Scenario: Hero card displays all required fields

- GIVEN a completed sale with ID 42, date 2026-06-01T14:30:00Z, payment cash
- WHEN the page renders
- THEN the `SaleHeroCard` shows: "Venta #42", "01/06/2026 14:30", "Efectivo", and status badge "Completada"

#### Scenario: Pending sale hero card

- GIVEN a sale with status `pending`
- WHEN the page renders
- THEN the hero card displays an amber status badge labeled "Pendiente"

#### Scenario: Cancelled sale hero card

- GIVEN a sale with status `cancelled`
- WHEN the page renders
- THEN the hero card displays a red status badge labeled "Cancelada"

---

### Requirement: Item Sections — Services and Products Separation

The content area below the hero card MUST be split into two visually distinct sections: Services (violeta left/top column) and Products (slate right/bottom column). Each section MUST have a visible header label ("SERVICIOS" / "PRODUCTOS"). Services MUST display nested supply items (insumos) indented beneath each service with a label "Insumos incluidos:".

#### Scenario: Services column with nested supplies

- GIVEN a service item with two supply sub-items
- WHEN the page renders
- THEN the service appears in the left column with its name, quantity, and unit price
- AND indented below the service row, the supplies appear with a label "Insumos incluidos:"
- AND each supply shows name, quantity, and unit price

#### Scenario: Products column standalone

- GIVEN a product item with no supplies
- WHEN the page renders
- THEN the product appears in the right column with name, presentation, quantity, unit price, discount, and total
- AND no nested supplies appear below the product

#### Scenario: Empty services section

- GIVEN a sale with no services
- WHEN the page renders
- THEN the services column displays "Sin servicios" message

#### Scenario: Empty products section

- GIVEN a sale with no products
- WHEN the page renders
- THEN the products column displays "Sin productos" message

---

### Requirement: No Information Duplication

Information displayed in the `SaleHeroCard` MUST NOT appear again in the item sections or any other part of the page. Specifically: sale ID, date/time, payment method, and status badge MUST appear only in the hero card.

---

### Requirement: Financial Summary Card

The system MUST display a `FinancialSummaryCard` below the two-column items grid. This card MUST show: subtotal, discount (if any), recargo (if any), surcharge reason (if any), and total. The card MUST have a "Resumen Financiero" title.

#### Scenario: Financial summary with discount

- GIVEN a sale with subtotal $160.00, discount 6.25%, total $150.00
- WHEN the page renders
- THEN the FinancialSummaryCard shows: Subtotal $160.00, Descuento 6.25% (-$10.00), Total $150.00

#### Scenario: Financial summary with surcharge

- GIVEN a sale with subtotal $100.00, surcharge 5%, surcharge reason "Tarifa urgente", total $105.00
- WHEN the page renders
- THEN the FinancialSummaryCard shows: Subtotal $100.00, Recargo 5% (+$5.00), Tarifa urgente (italic), Total $105.00

---

### Requirement: Surcharge Badges on Items

Service items and product items MUST display a surcharge badge when `surcharge_percentage > 0`. The badge MUST be amber and show "+{percentage}%". When `surcharge_reason` is set, the reason MUST display as italic text below the badge.

#### Scenario: Service with surcharge

- GIVEN a service item with surcharge_percentage 5 and surcharge_reason "Tarifa urgente"
- WHEN the page renders
- THEN the service card shows a "+5%" amber badge
- AND "Tarifa urgente" in italic below the badge

---

### Requirement: StatusBanner (unchanged behavior preserved)

The system MUST display a colored status banner immediately below the PageHeader: pending=amber, completed=emerald, cancelled=red.

#### Scenario: Status banner display

- GIVEN a sale with status `pending`
- WHEN the page renders
- THEN an amber banner appears with text "Pendiente"

---

### Requirement: Responsive Behavior

The layout MUST adapt to mobile (stacked single column below 768px). Page MUST render primary content within 2s on a 3G connection. Color contrast MUST meet WCAG 2.1 AA.

---

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
- Hero card: full-width, displays sale ID, date/time, payment method icon+label, status badge.
- Financial summary card: below two-column items grid, titled "Resumen Financiero".
- Two-column items grid: services (violet theme) left, products (slate theme) right.
- Services column: "SERVICIOS" header, ServiceItemCard with nested supplies via `border-l-2 border-violet-200`.
- Products column: "PRODUCTOS" header, ProductItemCard standalone.
- Mobile: `grid-cols-1 md:grid-cols-2` — stacks vertically below 768px.

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
| Loading | Skeleton hero card and shimmer item cards |

## Accessibility

- Semantic HTML: `<header>` for page header, `<section>` for hero card, `<article>` for item cards.
- Status badges: `aria-label` describing status (e.g., "Estado: Pendiente").
- Items: keyboard-navigable with visible focus ring.