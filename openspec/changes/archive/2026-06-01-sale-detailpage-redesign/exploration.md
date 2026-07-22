# Exploration: SaleDetailPage Redesign

### Topic
Rediseñar la pantalla de detalle de venta (`SaleDetailPage.tsx`) para corregir problemas de UX graves.

---

## Current State

### Layout Summary
The current page uses a 12-column grid with:
- **Left sidebar (col-span 4)**: Stat cards (articles, subtotal, discount, total, payment method) + Cash Session card
- **Right content (col-span 8)**: SaleItemsList card + Financial summary card

### Problems Identified

| # | Problem | Location |
|---|---------|----------|
| 1 | **Info duplication**: Payment method appears in sidebar stats AND in Financial summary right column | `StatCard` + `SaleItemsList` + `Financial summary` |
| 2 | **Missing supplies**: Insumos (supply items) are rendered via `SupplyRow` but visually tucked under parent service with minimal styling — not clearly visible as "included inputs" | `SupplyRow` inside `SaleItemsList` |
| 3 | **Services + products mixed**: Both appear in same `SaleItemsList` with only color differentiation (violet vs white). No section separation. | `SaleItemRow` type coloring only |
| 4 | **Back button at bottom**: Single "Volver a Ventas" button at bottom of page, far from top navigation | Bottom of component |
| 5 | **Confusing layout**: Breadcrumb says "Venta #X", but there's no prominent back affordance until very bottom |

### Data Structure (SaleItem)

Key fields from `sale.ts`:
- `parent_service_item: number | null` — indicates supply items (is_supply)
- `type: 'product' | 'service'` — differentiates articles
- `presentation_name`, `price_per_item`, `total_price`, `discount_percentage`

Services have supplies as children (filtered by `parent_service_item.id === parent.id`).

---

## Affected Areas

- `frontend/src/pages/Sales/SaleDetailPage.tsx` — main page (585 lines)
- `frontend/src/interfaces/sale.ts` — SaleItem interface (already well-structured)
- `frontend/src/components/ui/PageHeader.tsx` — supports `action` slot (unused in current page)
- `frontend/src/components/ui/Card.tsx` — supports `title` and `action` slots

---

## Proposed Layout Approach (Wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│  PageHeader: "Venta #123"                                   │
│  Breadcrumb: Panel > Ventas > Venta #123                    │
│  [← Volver]  (prominent back button as action slot)         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  StatusBanner (pending/completed/cancelled)                 │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ RESUMEN DE VENTA (full width hero card)              │   │
│  │                                                      │   │
│  │ Fecha: Jan 1, 2026 10:30  │  Metodo: Efectivo        │   │
│  │ Artículos: 5             │  Caja: Caja Principal     │   │
│  │                                                      │   │
│  │ ────────────────────────────────────────────────    │   │
│  │  Subtotal           $1,200.00                        │   │
│  │  Descuento (10%)    -$120.00                        │   │
│  │  ────────────────────────────────────────────────    │   │
│  │  TOTAL              $1,080.00  ← large, prominent   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────┐  ┌────────────────────────┐  │
│  │ SERVICIOS                 │  │ PRODUCTOS              │  │
│  │ ─────────────────────── │  │ ────────────────────── │  │
│  │ [Service card]            │  │ [Product card]          │  │
│  │   └─ Insumo A × 2        │  │ [Product card]          │  │
│  │   └─ Insumo B × 1        │  │ [Product card]          │  │
│  │ [Service card]            │  │                        │  │
│  │   └─ Insumo C × 3        │  │                        │  │
│  └──────────────────────────┘  └────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Back button moves to PageHeader action slot** — always visible, top-right
2. **Sidebar stats ELIMINATED** — data moved to hero card (Resumen de Venta)
3. **Single hero card** replaces duplicate stat display and financial summary
4. **Services and Products in separate columns** — clear visual separation
5. **Insumos clearly visible under each service** — indented with label "Insumos incluidos:"
6. **Status banner promoted** — appears after header, before content

---

## Information Architecture

| Info | Where | Why |
|------|-------|-----|
| Sale ID + Date + Status | Hero card header | Core identity |
| Payment method | Hero card (no duplication) | One place only |
| Cash session | Hero card (no duplication) | One place only |
| Subtotal / Discount / Total | Hero card financial section | Clear hierarchy |
| Article count | Hero card | Quick stat |
| **Services** | Left column | Grouped together |
| **Products** | Right column | Grouped together |
| **Insumos por servicio** | Nested under service | Shows what was used |

**No duplication**: payment method, cash session, article count all appear once now.

---

## Component Restructuring Plan

### New Components (or refactored)

| Component | Purpose |
|-----------|---------|
| `SaleHeroCard` | Replaces sidebar + financial summary. Contains sale meta, financial breakdown, status. Full width. |
| `ServiceItemCard` | Renders a service with its supplies nested inside |
| `ProductItemCard` | Renders a product line item |
| `SuppliesList` | Nested list of supplies under a service |
| `BackButton` (inline in PageHeader) | Wraps `Button` with arrow icon |

### Existing Components to Reuse
- `PageHeader` (with `action` slot for back button)
- `Card` (for ServiceItemCard / ProductItemCard wrappers)
- `Button` (secondary variant)
- `StatusBanner` (existing)

---

## Navigation Redesign

- **Current**: Breadcrumb only, back button at page bottom
- **Proposed**: PageHeader `action` slot holds a `Button variant="secondary"` with `<ArrowLeft /> Volver`

```tsx
<PageHeader
    title={`Venta #${sale.id}`}
    breadcrumbs={[...]}
    action={
        <Button variant="secondary" onClick={() => navigate('/sales')}>
            <ArrowLeft size={15} /> Volver
        </Button>
    }
/>
```

This puts navigation at the top, immediately accessible.

---

## Risks

1. **Breaking existing muscle memory**: Users accustomed to scrolling for back button may be confused initially — but top-right is industry standard
2. **Information density**: Hero card carries more info — needs clear visual hierarchy to avoid clutter
3. **Services column may be taller** than products column — grid alignment needs monitoring

---

## Estimated Effort

**Medium** — Refactor of single page, no backend changes, no routing changes.

- New components: 3–4 (SaleHeroCard, ServiceItemCard, ProductItemCard, SuppliesList)
- Page restructure: moderate (redraw grid, move stats)
- No API/hook changes needed

**Recommended approach**: Single PR, inline component refactor.

---

## Ready for Proposal

**Yes.** The exploration is complete. Ready for `sdd-propose` to define scope, approach, and constraints.