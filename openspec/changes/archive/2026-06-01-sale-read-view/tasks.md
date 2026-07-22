# Tasks: Sale Read View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–450 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (backend + tests) → PR 2 (frontend + wiring) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend serializer + view optimization + tests | PR 1 | Targets `main`; autonomous, test-verified |
| 2 | Frontend types, hook, page, routing, list wiring | PR 2 | Targets `main` after PR 1 merges; includes build/lint |

---

## Phase 1: Foundation — Types & Backend Serializer

- [x] **T1** Create `CashSessionMiniSerializer` in `backend/happypet/sales/serializers.py` (`id`, `register_name`, `opened_at`, `status`). **Files:** `serializers.py`. **Deps:** None. **AC:** Serializer outputs correct JSON shape. **Effort:** small.
- [x] **T2** Replace `cash_session` FK field in `SaleSerializer` with nested `CashSessionMiniSerializer(read_only=True)`. **Files:** `serializers.py`. **Deps:** T1. **AC:** `GET /api/sales/{id}/` returns nested `cash_session` object. **Effort:** small.
- [x] **T3** Export `CashSessionMini` interface in `frontend/src/interfaces/cash/index.ts`. **Files:** `interfaces/cash/index.ts`. **Deps:** None. **AC:** Type matches serializer output. **Effort:** small.
- [x] **T4** Update `Sale` interface: change `cash_session` from `number | null` to `CashSessionMini | null`. **Files:** `interfaces/sale.ts`. **Deps:** T3. **AC:** Type-check passes. **Effort:** small.

## Phase 2: Backend API Optimization & Tests

- [x] **T5** Override `SaleViewSet.retrieve()` to apply `select_related('cash_session__cash_register')` on the instance queryset. **Files:** `views.py`. **Deps:** T2. **AC:** Retrieve triggers no extra queries for `cash_session`. **Effort:** small.
- [x] **T6** Write unit test: `CashSessionMiniSerializer` resolves `register_name` from `cash_register.name`. **Files:** `backend/happypet/sales/tests.py`. **Deps:** T1. **AC:** Test passes; asserts exact field set. **Effort:** small.
- [x] **T7** Write integration test: `GET /api/sales/{id}/` returns 200 with nested `cash_session` and no N+1. **Files:** `backend/happypet/sales/tests.py`. **Deps:** T2, T5. **AC:** Test passes; `assertNumQueries` guard included. **Effort:** medium.

## Phase 3: Frontend State, Page & Routing

- [x] **T8** Extend `useSale` hook: add `currentSale: Sale | null` to state; update `fetchSaleById` to store result; add `clearCurrentSale`. **Files:** `hooks/useSale.ts`. **Deps:** T4. **AC:** Hook returns new state + action; existing list logic untouched. **Effort:** small.
- [x] **T9** Create `SaleDetailPage.tsx` with: `PageHeader` + breadcrumbs, `StatusBanner` (amber/emerald/red), `StatGrid` (5 cards), `CashSessionCard`, `ItemsSection` (desktop table / mobile cards), `TotalsBreakdown`, loading skeleton, 404 and network error handling. **Files:** `pages/Sales/SaleDetailPage.tsx`. **Deps:** T8. **AC:** Matches spec scenarios S1–S9; responsive down to 320px. **Effort:** large.
- [x] **T10** Add `/sales/:id` route in `Routes.tsx` pointing to `SaleDetailPage`. **Files:** `routes/Routes.tsx`. **Deps:** T9. **AC:** Route resolves; 404 fallback still works. **Effort:** small.
- [x] **T11** Wire `SalesList` row click to `navigate(/sales/${id})`. **Files:** `pages/Sales/SalesList.tsx`. **Deps:** T10. **AC:** Click navigates; no regression in existing actions. **Effort:** small.

## Phase 4: Verification

- [x] **T12** Run backend tests: `cd backend && python manage.py test`. **Deps:** T6, T7. **AC:** All tests pass. **Effort:** small.
- [x] **T13** Build and lint frontend: `cd frontend && npm run build && npm run lint`. **Deps:** T9, T10, T11. **AC:** Zero build or lint errors. **Effort:** small.
- [x] **T14** Manual responsive check: open DevTools 320px–1440px on `/sales/:id`; confirm no horizontal scroll, mobile cards visible, desktop table hidden. **Deps:** T9. **AC:** Visual match to spec NF2. **Effort:** small.

---

## Dependency Graph

```
T1 ──► T2 ──► T5
 │
 └──► T6

T3 ──► T4 ──► T8 ──► T9 ──► T10 ──► T11
              │
              └──► T14

T2 + T5 ──► T7

T6 + T7 ──► T12
T9 + T10 + T11 ──► T13
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| `SaleDetailPage` may exceed 250 lines and push total >400 | Split frontend into PR 2; keep page focused, avoid premature extraction |
| Nested serializer could break list endpoint if base `queryset` is accidentally modified | Only override `retrieve`; leave `queryset` untouched |
| Mobile card layout may need iteration | Validate with T14 before merge |
