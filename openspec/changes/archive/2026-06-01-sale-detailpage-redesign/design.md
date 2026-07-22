# Design: sale-detailpage-redesign

## Technical Approach

Restructure `SaleDetailPage` from a 12-column sidebar+content grid to a single-column hero + two-column items layout. Replace the `StatCard` sidebar and `SaleItemsList` with three new components (`SaleHeroCard`, `ServiceItemCard`, `ProductItemCard`). The back button moves from page bottom to `PageHeader` action slot.

## Architecture Decisions

### Decision: Hero Card Composition

**Choice**: `SaleHeroCard` consolidates sale metadata + financial breakdown in one full-width card.
**Alternatives considered**: Separate hero card for metadata + financial summary card. Rejected — causes duplication of subtotal/discount/total.
**Rationale**: Spec requires no duplication. Single card removes redundancy and keeps financial info visible without scrolling.

### Decision: Two-Column Layout Strategy

**Choice**: CSS Grid `grid-template-columns: 1fr 1fr` for desktop, collapsing to single column at 768px (`md:grid-cols-1`).
**Alternatives considered**: Flexbox two-column. Rejected — grid is cleaner for equal-width columns with independent row sizing.
**Rationale**: Same breakpoint used in current 12-col layout (`md:`), consistent with existing responsive patterns.

### Decision: ServiceItemCard Structure

**Choice**: Single card containing service row + indented supplies sub-list.
**Alternatives considered**: Supply items as separate sibling cards. Rejected — spec requires "Insumos incluidos:" label with visual nesting.
**Rationale**: Parent-child relationship is a single conceptual unit. Indented list preserves hierarchy without complex composition.

### Decision: Supply Nesting Visual

**Choice**: Indented `<ul>` with left border (`border-l-2 border-violet-200`) and "Insumos incluidos:" label header.
**Alternatives considered**: Accordion/collapse for supplies. Rejected — not required by spec, adds interaction complexity.
**Rationale**: Mirrors existing `SaleItemsList` pattern (line 209 of current code), preserves existing visual language.

### Decision: Financial Summary Location

**Choice**: Lives inside `SaleHeroCard` — subtotal, discount, surcharge, total rows.
**Alternatives considered**: Separate card below two-column grid. Rejected — spec says hero card "MUST display financial breakdown".
**Rationale**: Eliminates redundant card, keeps totals visible at a glance.

## Data Flow

```
SaleDetailPage
├── PageHeader (action={BackButton})
├── StatusBanner
├── SaleHeroCard
│     ├── Sale meta: id, date, payment, status badge
│     └── Financial: subtotal, discount/surcharge, total
└── TwoColumn Grid
      ├── Services Column
      │     └── items.filter(type=service) → ServiceItemCard[]
      │           └── parent_service_item supplies nested
      └── Products Column
            └── items.filter(type=product) → ProductItemCard[]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/ui/SaleHeroCard.tsx` | Create | Hero card with sale metadata + financial breakdown |
| `frontend/src/components/ui/ServiceItemCard.tsx` | Create | Service row with nested supplies sub-list |
| `frontend/src/components/ui/ProductItemCard.tsx` | Create | Standalone product row |
| `frontend/src/pages/Sales/SaleDetailPage.tsx` | Modify | Remove sidebar grid, StatCard, SaleItemsList; add hero + two-col grid |

## Component Interfaces

### SaleHeroCard
```typescript
interface SaleHeroCardProps {
  sale: Sale; // from sale.ts interface
}
```

### ServiceItemCard
```typescript
interface ServiceItemCardProps {
  item: SaleItem;  // type === 'service'
  supplies: SaleItem[];  // filtered by parent_service_item
}
```

### ProductItemCard
```typescript
interface ProductItemCardProps {
  item: SaleItem;  // type === 'product'
}
```

## Layout Implementation

```
PageHeader (title="Venta #{id}", action=BackButton)
StatusBanner
SaleHeroCard (full width)
  └── Header row: Sale #{id} | date | payment icon + label
  └── StatusBadge
  └── Financial rows: Subtotal / Descuento / Total
Grid (2 cols desktop → 1 col mobile)
  ├── Col 1: SERVICIOS header + ServiceItemCard[]
  └── Col 2: PRODUCTOS header + ProductItemCard[]
```

## Migration / Rollout

No migration required. No backend changes. Design uses existing `Sale` interface and existing component patterns (`Card`, `Button`, `StatusBanner`).

## Open Questions

- [ ] None — spec and proposal are complete and unambiguous.