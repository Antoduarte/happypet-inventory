# Tasks: sale-detailpage-redesign

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

> Single large file (~585 lines) being heavily restructured. Precise line count hard to predict until apply begins. Given ask-on-risk strategy, confirming before apply.

## Phase 1: New Components (Foundation)

- [x] 1.1 Create `frontend/src/components/ui/SaleHeroCard.tsx` — full-width hero card with sale metadata (id, date, payment icon+label) + financial breakdown rows (subtotal, discount/surcharge, total), status badge, uses Card base
- [x] 1.2 Create `frontend/src/components/ui/ServiceItemCard.tsx` — service row with indented supplies sub-list under "Insumos incluidos:" label, indented with left border (`border-l-2 border-violet-200`), accepts `item: SaleItem` + `supplies: SaleItem[]`
- [x] 1.3 Create `frontend/src/components/ui/ProductItemCard.tsx` — standalone product row with icon, name+presentation, qty×price, total, discount badge; accepts `item: SaleItem`

## Phase 2: SaleDetailPage Restructure

- [x] 2.1 Remove `StatCard`, `SkeletonStatGrid`, `SaleItemsList`, `SaleItemRow`, `SupplyRow` inline components from `frontend/src/pages/Sales/SaleDetailPage.tsx`
- [x] 2.2 Remove 12-column `grid-cols-1 md:grid-cols-2 lg:grid-cols-12` sidebar layout and its `lg:col-span-4` / `lg:col-span-8` divs
- [x] 2.3 Add back button to `PageHeader` action slot: `action={<Button variant="secondary" onClick={() => navigate('/sales')}><ArrowLeft size={15} /> Volver</Button>}`. Remove bottom back button `<div>` at line 577–582
- [x] 2.4 Import `SaleHeroCard`, `ServiceItemCard`, `ProductItemCard`. Replace left sidebar StatCard grid + right content cards with: `SaleHeroCard` → two-column CSS Grid (`grid-cols-1 md:grid-cols-2`) with services/products filtered from `sale.items`
- [x] 2.5 Add `SERVICIOS` and `PRODUCTOS` column headers inside the two-column grid. Keep `StatusBanner` above hero card

## Phase 3: Verification

- [x] 3.1 Run `npm run build` in `frontend/` to verify TypeScript compiles without errors
- [x] 3.2 Run `npm run lint` in `frontend/` to verify no linting errors
- [x] 3.3 Manual browser test: load sale detail page, verify hero card, two-column items, back button in header, responsive collapse at <768px

## Implementation Order

Phase 1 components are independent and no other code depends on them yet. Build them first so Phase 2 can import and wire them. Phase 3 is verification only.