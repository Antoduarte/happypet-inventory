## Exploration: Sale Read View

### Current State

The HappyPet Inventory system already has a full sales backend with models, serializers, a viewset (with retrieve/list/create/patch), and a frontend with a sales list (`SalesList`) and a create form (`SaleFormPage`). However, there is **no read-only detail view** for an individual sale. Users can list sales and transition their status from the list, but they cannot inspect the full details of a completed or pending sale, including its line items, snapshots, cash session, payment method, and financial breakdown.

The backend already supports `GET /api/sales/{id}/` via the standard DRF `ModelViewSet.retrieve` action. The `SaleSerializer` returns nested `SaleItemSerializer` data, which includes product, presentation, service, snapshot fields, and price details. The frontend `saleService` already has a typed `getSaleById(id)` method, and the `useSale` hook exposes `fetchSaleById`. Therefore, the API and service layers are **ready**; only the UI page is missing.

### Affected Areas

- `frontend/src/routes/Routes.tsx` — add route `/sales/:id`
- `frontend/src/pages/Sales/SalesList.tsx` — add row click navigation to detail
- `frontend/src/pages/Sales/SaleDetailPage.tsx` — **new** read-only sale detail page
- `frontend/src/hooks/useSale.ts` — `fetchSaleById` already exists; may need to expose `currentSale` state
- `frontend/src/interfaces/sale.ts` — already complete; no changes required
- `frontend/src/services/sale.ts` — already complete; no changes required
- `backend/happypet/sales/views.py` — already supports retrieve; no changes required
- `backend/happypet/sales/serializers.py` — already returns nested data; no changes required

### Approaches

#### 1. Minimal Page with Reused Components
Build a single `SaleDetailPage` using existing `PageHeader`, `Card`, `FormSection`, `DataTable`, and `Button` components. Display sale metadata in a top summary card, items in a `DataTable`, and financials in a side/bottom card.

- **Pros**: Fast to implement, consistent with existing codebase, zero new dependencies.
- **Cons**: Slightly generic look; may not highlight the sale status as prominently as a dedicated layout.
- **Effort**: Low

#### 2. Custom Layout with StatCards and Grouped Item Lists
Create a richer layout inspired by `SessionReportPage` — use `StatCard`-like mini cards for totals, a dedicated grouped list for items (products vs services vs supplies), and a prominent status badge banner. Add a sticky header with back navigation.

- **Pros**: Better information hierarchy, more scannable, consistent with the Cash Session Report design language.
- **Cons**: Slightly more JSX, but still entirely within existing component patterns.
- **Effort**: Medium

### Recommendation

Go with **Approach 2** (Custom Layout with StatCards and Grouped Item Lists). The codebase already demonstrates this pattern in `SessionReportPage.tsx`, which uses `PageHeader`, `Card`, inline stat grids, and payment-method breakdowns. Replicating that visual language for the sale detail view ensures consistency and a better user experience. The effort is still low because no new external libraries or complex state management are needed.

### Risks

1. **Missing `currentSale` state in `useSale` hook**: `fetchSaleById` currently does not store the fetched sale in state; it only returns it. The detail page will need to either keep its own local state or the hook should be extended with a `currentSale` field. Extending the hook is the cleaner approach.
2. **Responsive overflow on wide tables**: The item list includes many columns (product name, presentation snapshot, quantity, unit price, discounts, subtotal). On mobile, a `DataTable` may overflow horizontally. Recommendation: switch to a stacked card layout per item on small screens (`hidden md:block` for table, `md:hidden` for stacked cards).
3. **Cash session data is only an ID**: The `SaleSerializer` returns `cash_session` as a raw FK integer, not a nested object. If the detail page needs to show the cash register name or session status, the backend serializer must be updated to nest a minimal cash session representation (e.g., `id`, `cash_register_name`, `opened_at`). Without this, the UI can only display "Session #42" as a link.
4. **No existing pattern for read-only "detail" pages**: Every other entity (products, services, users, categories, movements) uses a *form* page for both create and edit (`/edit/:id`). The sale detail page will be the first true read-only detail view. This is fine, but it means we are establishing a new pattern — ensure it is documented in code comments.

### Ready for Proposal

**Yes.** The backend is fully prepared. The frontend service layer is fully prepared. The main work is a single new page component and a minor route addition. The only open question is whether to augment the `SaleSerializer` to nest a minimal `CashSession` object; this should be decided in the proposal or design phase.

---

## Detailed Findings

### 1. Data Model (Backend)

**`Sale` model fields:**
- `id` (PK)
- `cash_session` (FK → `CashSession`, nullable)
- `quantity` (int — total line item count)
- `total_price` / `subtotal` (Decimal)
- `discount_percentage` / `surcharge_percentage` (int, choices 0–30%)
- `surcharge_reason` (string, nullable)
- `status` (`pending` | `completed` | `cancelled`)
- `payment_type` (`cash` | `card` | `transfer` | `qr` | `credit`)
- `sale_date` (datetime)
- `items` (reverse FK → `SaleItem[]`)

**`SaleItem` model fields:**
- `id`, `type` (`product` | `service`)
- `product` (FK → `Product`, nullable)
- `presentation` (FK → `ProductPresentation`, nullable)
- `presentation_name`, `presentation_price_snapshot`, `presentation_multiplier_snap` (historical snapshots)
- `service` (FK → `Service`, nullable)
- `parent_service_item` (self-referential FK for supplies)
- `quantity` (Decimal, supports fractions)
- `price_per_item`, `subtotal`, `total_price` (Decimal)
- `discount_percentage`, `surcharge_percentage`, `surcharge_reason`

**Serializer output (`SaleSerializer`):**
- Returns all `Sale` fields plus nested `items: SaleItemSerializer[]`
- `product` is serialized via `ProductSerializer`
- `service` is serialized via `ServiceSerializer`
- `cash_session` is returned as a **raw integer** (not nested)

**API endpoint:** `GET /api/sales/{id}/` is already supported by `SaleViewSet` (inherited from `ModelViewSet`).

### 2. Frontend Architecture

**Existing routes in `Routes.tsx`:**
- `/sales` → `SalesList`
- `/sales/new` → `SaleFormPage`
- **Missing:** `/sales/:id` → `SaleDetailPage` (new)

**`SalesList.tsx` navigation:**
- Uses `useNavigate` from `react-router-dom`
- Row clicks are currently **not wired** to navigation; only action buttons (Complete / Cancel) exist
- Recommendation: make each row clickable (or add an eye/detail icon) that navigates to `/sales/${sale.id}`

**`useSale` hook:**
- Already has `fetchSaleById(id: number): Promise<Sale | null>`
- Does **not** persist the result in state; returns it directly
- For the detail page, a dedicated local state or a new `currentSale` field in the hook is needed

**`saleService`:**
- `getSaleById(id)` already calls `api.get<Sale>(\`/sales/\${id}/\`)`
- Fully typed and ready

### 3. Existing Patterns to Reuse

**`SessionReportPage`** is the best reference:
- Uses `PageHeader` with breadcrumbs and back navigation
- Uses `Card` containers with `StatCard` subcomponents for financial summaries
- Groups data into logical sections (summary, reconciliation, payment breakdown)
- Handles loading and error states explicitly

**Reusable UI components:**
- `PageHeader` — title + breadcrumbs + optional action
- `Card` — white container with optional title/action header
- `FormSection` — labeled group with optional icon (ideal for "Información General", "Artículos", etc.)
- `DataTable` — for rendering line items in a tabular format
- `Button` — for back navigation and print/export actions (future)
- `Loading` — spinner component (exists in `components/ui/Loading.tsx`)

### 4. Proposed UI Layout

**Route:** `/sales/:id`

**Page structure (desktop, top-to-bottom):**

1. **PageHeader**
   - Title: "Detalle de Venta #42"
   - Breadcrumbs: Panel → Ventas → Detalle
   - Action: "Volver" button (secondary, with ArrowLeft icon)

2. **Status Banner** (full-width, colored background)
   - Large status badge: `Pendiente` (yellow), `Completado` (green), `Cancelado` (red)
   - Date + payment method as secondary text

3. **Summary Cards Grid** (2-col on mobile, 4-col on desktop)
   - "Subtotal" → `$xx.xx`
   - "Descuento / Recargo" → `-5%` or `+10%` (with reason tooltip)
   - "Total" → `$xx.xx` (highlighted, larger font)
   - "Método de Pago" → `Efectivo` (with icon)

4. **Cash Session Card** (conditional — only if `cash_session` is not null)
   - Show session ID as a link to `/cash-session/:sessionId`
   - If serializer is enhanced: show register name and session date

5. **Items Section** (`Card` + `FormSection` with `ShoppingCart` icon)
   - **Desktop:** `DataTable` with columns:
     - Tipo (Producto / Servicio)
     - Artículo (product name or service name)
     - Presentación (presentation_name snapshot)
     - Cantidad
     - Precio Unit.
     - Descuento / Recargo
     - Subtotal
     - Total
   - **Mobile:** stacked cards per item (hide table, show card list)

6. **Totals Breakdown Card**
   - Subtotal
   - Global discount / surcharge (if any)
   - Final total
   - Number of items

**Responsive strategy:**
- Summary grid: `grid-cols-2 md:grid-cols-4`
- Items table: `hidden md:block`; mobile card list: `md:hidden`
- Page padding and font sizes scale with Tailwind defaults

### 5. Design Decisions

**Status display:**
- Use the same color classes as `SalesList.tsx`:
  - `pending` → `bg-yellow-100 text-yellow-700`
  - `completed` → `bg-emerald-100 text-emerald-700`
  - `cancelled` → `bg-red-100 text-red-700`
- Place the status badge prominently in a top banner or next to the page title.

**Item grouping:**
- Do **not** group by type in separate tables — a single unified table is simpler and avoids empty states.
- Use conditional rendering in the "Artículo" column: show `product.name` if type is `product`, else `service.name`.
- Supplies (`parent_service_item` not null) can be indicated with a subtle label/badge (e.g., "Insumo" pill) or indented under their parent service row.

**Cash session information:**
- As noted, the serializer currently returns only the raw `cash_session` ID.
- **Decision for proposal phase:** either (a) display a simple text link "Sesión de Caja #42" or (b) enhance the backend serializer to include `cash_register_name` and `opened_at`.

**Navigation flow:**
1. User is on `/sales` (SalesList)
2. User clicks a row (or a detail icon) → navigates to `/sales/:id`
3. Detail page loads sale via `fetchSaleById`
4. User clicks "Volver" → navigates back to `/sales`

### 6. API Contract

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/sales/{id}/` | GET | Retrieve full sale with nested items | JWT (IsAuthenticated) |

The endpoint already exists and returns:

```json
{
  "id": 42,
  "cash_session": 7,
  "quantity": 3,
  "subtotal": "100.00",
  "total_price": "95.00",
  "discount_percentage": 5,
  "surcharge_percentage": 0,
  "surcharge_reason": null,
  "status": "completed",
  "payment_type": "cash",
  "sale_date": "2025-05-20T14:30:00Z",
  "items": [
    {
      "id": 101,
      "type": "product",
      "product": { "id": 1, "name": "Alimento Premium", ... },
      "presentation": { "id": 5, "name": "Bolsa 20kg", ... },
      "presentation_name": "Bolsa 20kg",
      "presentation_price_snapshot": "85.00",
      "presentation_multiplier_snap": "1.0000",
      "service": null,
      "parent_service_item": null,
      "quantity": "1.0000",
      "price_per_item": "85.00",
      "subtotal": "85.00",
      "total_price": "80.75",
      "discount_percentage": 5,
      "surcharge_percentage": 0,
      "surcharge_reason": null
    }
  ]
}
```

### 7. Components Needed

| Component | Source | Notes |
|-----------|--------|-------|
| `PageHeader` | Existing | Breadcrumbs: Panel → Ventas → Detalle |
| `Card` | Existing | Wrap each logical section |
| `FormSection` | Existing | Use for "Artículos", "Totales", "Información General" |
| `DataTable` | Existing | Desktop items table |
| `Button` | Existing | "Volver" action |
| `Loading` | Existing | Loading spinner |
| `SaleDetailPage` | **New** | Main page component |
| `SaleItemCard` | **New** (optional) | Mobile stacked item representation |
| `StatCard` | **New** (or inline) | Already used in `SessionReportPage` — can extract or inline |

---

## Artifacts Created

- `openspec/changes/sale-read-view/exploration.md`

## Next Recommended Phase

**sdd-propose** — the exploration has confirmed the change is feasible, the backend is ready, and the frontend pattern is clear. The proposal should decide on the open question of whether to nest `CashSession` data in the `SaleSerializer`.
