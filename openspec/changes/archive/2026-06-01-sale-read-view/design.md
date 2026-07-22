# Design: Sale Read View

## Technical Approach

Build a read-only sale detail page (`/sales/:id`) that mirrors the existing `SessionReportPage` visual language: `PageHeader`, stat grid, sectioned cards, and responsive item display. Backend changes are minimal: nest a read-only `CashSession` mini-serializer inside `SaleSerializer` and optimize `retrieve` with `select_related`. All other layers (service, types, routing) already exist.

## Architecture Decisions

### Decision: CashSession Nesting Strategy

**Choice**: Add a `CashSessionMiniSerializer` (4 fields: `id`, `register_name`, `opened_at`, `status`) nested inside `SaleSerializer` as read-only.
**Alternatives considered**: (a) keep raw FK integer and link by ID only; (b) serialize the full `CashSession` with movements.
**Rationale**: The spec requires register name and status on the detail page. A full `CashSession` would bloat the payload and expose unrelated data. The mini-serializer is scoped to exactly what the UI needs.

### Decision: N+1 Prevention on List Endpoint

**Choice**: Override `SaleViewSet.retrieve` to apply `select_related('cash_session__cash_register')` on the instance queryset, leaving the base `queryset` untouched.
**Alternatives considered**: (a) add `select_related` to the base `queryset` used by list; (b) use a separate `RetrieveSaleSerializer`.
**Rationale**: The list endpoint is paginated and high-traffic; adding `select_related` there would penalize every list request for the benefit of a single retrieve. Overriding `retrieve` isolates the optimization to the path that actually needs it.

### Decision: State Management for Detail View

**Choice**: Extend `useSale` hook with `currentSale: Sale | null` and a `setCurrentSale` setter. `fetchSaleById` stores the result in `currentSale`.
**Alternatives considered**: (a) keep `fetchSaleById` returning the sale directly and use local React state in `SaleDetailPage`; (b) create a dedicated `useSaleDetail` hook.
**Rationale**: Centralizing sale state in the existing hook avoids duplicating loading/error patterns and keeps the codebase consistent with `useProduct` / `useService` patterns. A dedicated hook would be overkill for a single read-only page.

### Decision: Responsive Items Display

**Choice**: CSS-only responsive switch using Tailwind utilities (`hidden md:block` for desktop table, `md:hidden` for mobile stacked cards).
**Alternatives considered**: (a) JS breakpoint detection with conditional rendering; (b) a single responsive table with horizontal scroll.
**Rationale**: The project already uses Tailwind extensively. CSS-only avoids extra JS, extra renders, and matches the existing `DataTable` overflow handling. Horizontal scroll on mobile was explicitly rejected in the spec.

### Decision: Component Granularity

**Choice**: Keep `StatCard` and `SaleItemCard` as inline sub-components inside `SaleDetailPage`. Do not extract them to `components/ui/`.
**Alternatives considered**: Extract to shared `components/ui/StatCard.tsx`.
**Rationale**: `StatCard` is a 10-line presentational component with no reuse outside this page today. Premature extraction adds indirection. If another page needs it later, extract then. `SessionReportPage` already uses an inline `StatCard`, so this follows the established pattern.

## Data Flow

```
User clicks row in SalesList
        │
        ▼
navigate(/sales/:id)
        │
        ▼
SaleDetailPage mounts ──► useParams() extracts id
        │
        ▼
useSale.fetchSaleById(id)
        │
        ▼
saleService.getSaleById(id) ──► GET /api/sales/{id}/
        │                          (select_related optimization)
        ▼
API returns Sale + nested items + nested cash_session
        │
        ▼
useSale sets currentSale state
        │
        ▼
SaleDetailPage renders:
  - PageHeader
  - StatusBanner (from currentSale.status)
  - StatGrid (from currentSale totals / payment_type)
  - CashSessionCard (conditional on cash_session != null)
  - ItemsSection (desktop table / mobile cards)
  - TotalsBreakdown
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/happypet/sales/serializers.py` | Modify | Add `CashSessionMiniSerializer`; replace `cash_session` FK field in `SaleSerializer` with nested read-only serializer |
| `backend/happypet/sales/views.py` | Modify | Override `retrieve` to use `select_related('cash_session__cash_register')` on queryset |
| `frontend/src/interfaces/sale.ts` | Modify | Change `cash_session` from `number \| null` to `CashSessionMini \| null` |
| `frontend/src/interfaces/cash/index.ts` | Modify | Export `CashSessionMini` interface |
| `frontend/src/hooks/useSale.ts` | Modify | Add `currentSale` state + `setCurrentSale`; update `fetchSaleById` to store result |
| `frontend/src/pages/Sales/SaleDetailPage.tsx` | Create | New read-only detail page with status banner, stat grid, items section, totals |
| `frontend/src/pages/Sales/SalesList.tsx` | Modify | Add `onRowClick` to `DataTable` to navigate to `/sales/${id}` |
| `frontend/src/routes/Routes.tsx` | Modify | Add `/sales/:id` route mapping to `SaleDetailPage` |

## Interfaces / Contracts

### Backend

```python
class CashSessionMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    register_name = serializers.CharField(source="cash_register.name", read_only=True)
    opened_at = serializers.DateTimeField(read_only=True)
    status = serializers.CharField(read_only=True)
```

`SaleSerializer.cash_session` becomes:
```python
cash_session = CashSessionMiniSerializer(read_only=True)
```

### Frontend

```typescript
// frontend/src/interfaces/cash/index.ts
export interface CashSessionMini {
    id: number;
    register_name: string;
    opened_at: string;
    status: 'open' | 'closed';
}

// frontend/src/interfaces/sale.ts
export interface Sale {
    id: number;
    cash_session: CashSessionMini | null;
    // ... rest unchanged
}
```

## Responsive Design

- **Stat grid**: `grid-cols-2 md:grid-cols-5` (2 columns mobile, 5 desktop).
- **Items desktop**: `DataTable` wrapped in `hidden md:block`.
- **Items mobile**: Stacked `SaleItemCard` list wrapped in `md:hidden`.
- **Page padding**: Tailwind defaults (`px-4 md:px-6`).
- **Typography**: Scale using existing `text-sm` / `text-base` / `text-lg` utilities; no custom breakpoints.

## Accessibility

- `PageHeader` title includes sale ID for context.
- Status banner uses `role="status"` and `aria-label="Estado: {label}"`.
- `DataTable` already has semantic `<table>` markup; mobile cards use `<article>` with `aria-labelledby` pointing to item name.
- Focus management: on mount, focus moves to the status banner heading (`tabIndex={-1}` + `ref.focus()`).
- All interactive elements (back button, retry button) are keyboard-accessible.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `CashSessionMiniSerializer` output shape | Django `TestCase` — assert `register_name` resolved from `cash_register.name` |
| Unit | `SaleViewSet.retrieve` queryset uses `select_related` | Django `TestCase` — mock or inspect queryset, assert no extra queries |
| Integration | `GET /api/sales/{id}/` returns nested `cash_session` | Django `APITestCase` — create sale with session, assert 200 + nested object |
| Manual | Detail page renders without horizontal scroll on 320px | DevTools responsive mode |
| Manual | Build and lint pass | `npm run build && npm run lint` |

## Migration / Rollout

No migration required. This is a purely additive change:
- New serializer field is read-only and does not affect write operations.
- New route is additive; old routes remain unchanged.
- No feature flag needed — the page is safe to ship immediately.

## Open Questions

- None. All decisions were resolved in the proposal/spec phase.
