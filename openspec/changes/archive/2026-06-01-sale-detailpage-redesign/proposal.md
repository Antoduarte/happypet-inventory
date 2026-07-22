# Proposal: SaleDetailPage Redesign

## Intent

Solve 5 critical UX problems on the sale detail page: (1) info duplication between sidebar and content, (2) invisible supply items (insumos), (3) services/products mixed without separation, (4) back button buried at page bottom, (5) overall layout confusion. Approach: replace 12-col sidebar+content grid with a clean single-column hierarchy — hero summary card + two-column services/products split.

## Scope

### In Scope
- Remove left sidebar (col-span 4 stat grid)
- Build unified `SaleHeroCard` (full-width) consolidating sale meta + financial breakdown + status
- Move "Volver" button into `PageHeader` action slot (top-right, always visible)
- Split line items into Services (left column) and Products (right column)
- Nest supply items (insumos) under each service with visual indent + "Insumos incluidos:" label
- Add `StatusBanner` after header, before hero card

### Out of Scope
- Backend changes (API, serializers, data model)
- New functionality or business logic
- Routing changes
- New pages or components beyond listed

## Capabilities

### New Capabilities
None — pure layout refactor, no new functionality introduced.

### Modified Capabilities
- `sale-read-view`: Layout restructuring changes UI behavior but preserves all existing requirements (status banner, financial stats, line items, cash session). The spec's Given/When/Then scenarios remain valid; only the visual arrangement changes.

## Approach

1. **New `SaleHeroCard` component** — replaces sidebar stats + financial summary card. Full-width, contains: sale date, payment method, cash session register, article count, subtotal/discount/total breakdown.
2. **PageHeader action slot** — inject `<Button variant="secondary"><ArrowLeft /> Volver</Button>` as `action` prop. Removes bottom-of-page back button.
3. **Two-column items grid** — left col: services with nested `SuppliesList`; right col: products. Clear section headers "SERVICIOS" / "PRODUCTOS".
4. **`ServiceItemCard`** — renders service row + indented supplies sub-list.
5. **`ProductItemCard`** — renders product row (no nesting).

Reuse existing: `PageHeader`, `Card`, `Button`, `StatusBanner`, `sale.ts` interfaces.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/pages/Sales/SaleDetailPage.tsx` | Modified | Complete layout restructure; remove sidebar grid, add hero card + two-column split |
| `frontend/src/components/ui/PageHeader.tsx` | Modified | Add `action` slot usage on SaleDetailPage (component already supports it) |
| `openspec/specs/sale-read-view/spec.md` | Modified | Delta spec documents layout change; existing F1–F5, NF1–NF3 preserved |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User muscle memory (back button position) | Low | Top-right is industry standard; brief walkthrough confirms improvement |
| Information density in hero card | Low | Clear visual hierarchy with separators; large prominent total |
| Column height mismatch (services taller) | Low | CSS grid auto-sizing; no critical alignment dependency |

## Rollback Plan

1. `git checkout HEAD -- frontend/src/pages/Sales/SaleDetailPage.tsx`
2. Revert any PageHeader usage changes
3. Restore original sidebar grid layout

## Dependencies

None — pure frontend, no backend, no external services.

## Success Criteria

- [ ] `npm run build` passes with no TypeScript errors
- [ ] `npm run lint` passes
- [ ] `cd backend && python manage.py test` passes (no regression)
- [ ] Page renders: hero card, services column, products column, back button in header
- [ ] User confirms UX improvements (info no longer duplicated, supplies visible, back button accessible)