# Delta for sale-read-view

## MODIFIED Requirements

### Requirement: Layout Structure

The page MUST use a single-column layout with a hero card at the top. The layout MUST replace any sidebar-based 12-column grid with a full-width `SaleHeroCard` followed by a two-column items grid below. On mobile (viewport < 768px), the two columns MUST stack vertically into a single column.

(Previously: desktop-only 12-col grid with sidebar stat grid on left)

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

(Previously: back button at bottom of page)

#### Scenario: Back navigation from header

- GIVEN the user is on `/sales/{id}`
- WHEN the user clicks "Volver" in the PageHeader action slot
- THEN the browser navigates back to `/sales`

---

### Requirement: SaleHeroCard — Content

The `SaleHeroCard` MUST display: Sale ID, date/time (localized), payment method, status badge, and total amount. It MUST include a financial breakdown (subtotal, discount/recargo, total). The hero card MUST NOT duplicate information shown elsewhere on the page.

(Previously: sidebar stat grid + separate financial summary card — duplication existed)

#### Scenario: Hero card displays all required fields

- GIVEN a completed sale with ID 42, date 2026-06-01T14:30:00Z, payment cash, total $150.00, subtotal $160.00, discount 6.25%
- WHEN the page renders
- THEN the `SaleHeroCard` shows: "Venta #42", "01/06/2026 14:30", "Efectivo", status badge "Completada", and total "$150.00"
- AND displays financial breakdown: Subtotal $160.00, Descuento 6.25% ($10.00), Total $150.00

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

(Previously: mixed items table with no separation, supplies not visually nested)

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
- THEN the services column displays "Sin artículos" message

#### Scenario: Empty products section

- GIVEN a sale with no products
- WHEN the page renders
- THEN the products column displays "Sin artículos" message

---

### Requirement: No Information Duplication

Information displayed in the `SaleHeroCard` MUST NOT appear again in the item sections or any other part of the page. Specifically: sale ID, date/time, payment method, status badge, subtotal, discount/recargo, and total MUST appear only in the hero card.

(Previously: stat grid duplicated sale ID, total, and payment method in sidebar AND content area)

---

### Requirement: StatusBanner (unchanged behavior preserved)

The system MUST display a colored status banner immediately below the PageHeader: pending=amber, completed=emerald, cancelled=red.

(Previously: same requirement — no change)

#### Scenario: Status banner display

- GIVEN a sale with status `pending`
- WHEN the page renders
- THEN a amber banner appears below the header with text "Pago Pendiente"

---

### Requirement: Cash Session Card (unchanged behavior preserved)

The system MUST display a nested `cash_session` card showing register name, opened_at (localized), and status badge.

(Previously: same requirement — no change)

---

### Requirement: Responsive Behavior (unchanged behavior preserved)

The layout MUST adapt to mobile (stacked single column below 768px). Page MUST render primary content within 2s on a 3G connection. Color contrast MUST meet WCAG 2.1 AA.

(Previously: NF1, NF2, NF3 — no change)