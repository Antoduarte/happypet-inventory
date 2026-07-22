# Design: cash-session-flow

## Technical Approach

The change closes the UX gap between login and cash operations by adding a session-check endpoint, auto-linking sales to active sessions, and redirecting cashiers post-login based on session state. Backend uses DRF custom actions; frontend uses React Query + AuthContext.

## Architecture Decisions

### Decision 1: Active session endpoint — custom action vs list filter

**Choice**: Custom action `GET /api/cash/sessions/active/` (`@action(detail=False)`)
**Alternatives**: Filter on list view (`/cash/sessions/?user=me&date=today&status=open`)
**Rationale**: List filters expose internal model fields (date, user) to the URL surface. A dedicated `active/` endpoint gives a stable, intentional API contract. DRF custom actions are the established pattern for this codebase (see `current`, `open`, `close` actions already on `CashSessionViewSet`).

---

### Decision 2: `is_today` computed field — `SerializerMethodField` vs `MethodField`

**Choice**: `SerializerMethodField` named `get_is_today`
**Alternatives**: `ReadOnlyField` with lambda in Meta, property on model
**Rationale**: `SerializerMethodField` is the DRF-idiomatic way to compute a value per serialization. The model has `is_open` as a property; `is_today` follows the same pattern but at serializer level. The lambda-in-Meta pattern is fragile and not used elsewhere in this codebase.

---

### Decision 3: Auto-linking sale to session — how to inject user context

**Choice**: `self.context['request'].user` in `SaleCreateSerializer.create()`
**Alternatives**: Require frontend to pass `cash_session_id` explicitly; use ViewSet-level logic before serializer call
**Rationale**: The ViewSet already has `request.user` available. Passing it through `context` is the standard DRF serializer pattern — used by `SaleStatusSerializer` already in this codebase (`self.context["request"].user`). No ViewSet changes needed; `create()` gains 5 lines. Graceful degradation (no session → sale has null FK) is spec requirement.

---

### Decision 4: Post-login redirect — where to run session check

**Choice**: `AuthProvider.login()` callback triggers redirect
**Alternatives**: Dedicated `useSessionRedirect` hook in `App.tsx`; `useEffect` in Dashboard
**Rationale**: Login is centralized in `AuthProvider` — adding session check there keeps the redirect logic co-located with auth state. The `login` function is async and called by routed login forms; redirecting from there keeps the flow linear. Network errors default to dashboard (not blocking login) per spec scenario 3.

---

### Decision 5: OpenSessionPage redirect target

**Choice**: Redirect to `/` (dashboard) on success, per spec requirement
**Alternatives**: Keep redirect to `/cash-session/{session.id}` (current behavior)
**Rationale**: Proposal spec says "On success: redirect to `/`". Current `navigate(\`/cash-session/${session.id}\`)` navigates to session detail, not dashboard. Tasks phase will update the `onSuccess` callback. The session detail page can still be accessed via the cash session list.

## Data Flow

```
User logs in
  │ AuthProvider.login() sets auth state
  │ ▼
  ├─► GET /api/cash/sessions/active/
  │     ├─ 200 (session exists) → redirect /
  │     └─ 404 (no session)     → redirect /cash/open
  │     └─ network error        → redirect / (graceful)
  │
  └─► OpenSessionPage (/cash/open)
        │ POST /api/cash/sessions/open/
        │ ▼
        └─► SaleCreateSerializer.create()
              ├─ active session found → sale.cash_session = session
              └─ no session → sale.cash_session = null
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/happypet/cash/views.py` | Modify | Add `get_active_session` action to `CashSessionViewSet` |
| `backend/happypet/cash/serializers.py` | Modify | Add `is_today = SerializerMethodField()` to `CashSessionSerializer` |
| `backend/happypet/sales/serializers.py` | Modify | Auto-lookup active session in `SaleCreateSerializer.create()` |
| `frontend/src/services/cash/index.ts` | Modify | Add `getActiveSession()` to `CashSessionService` |
| `frontend/src/context/AuthProvider.tsx` | Modify | Call `getActiveSession()` post-login, redirect based on response |
| `frontend/src/pages/CashSession/OpenSessionPage.tsx` | Modify | Change `onSuccess` redirect from `/cash-session/{id}` to `/` |

## Interfaces

### `GET /api/cash/sessions/active/`

Returns the authenticated user's open session for today, or 404.

```python
@action(detail=False, methods=["get"], url_path="active")
def get_active_session(self, request):
    today = timezone.now().date()
    session = self.queryset.filter(
        user=request.user,
        opened_at__date=today,
        status=CashSession.STATUS_OPEN,
    ).first()
    if not session:
        return Response(status=status.HTTP_404_NOT_FOUND)
    return Response(CashSessionSerializer(session).data)
```

### `is_today` field

```python
class CashSessionSerializer(serializers.ModelSerializer):
    is_today = serializers.SerializerMethodField()

    def get_is_today(self, obj):
        return obj.opened_at.date() == timezone.now().date()
```

### Auto-link in `SaleCreateSerializer.create()`

```python
def create(self, validated_data):
    if "cash_session" not in validated_data:
        from happypet.cash.models import CashSession
        today = timezone.now().date()
        active = CashSession.objects.filter(
            user=self.context["request"].user,
            opened_at__date=today,
            status=CashSession.STATUS_OPEN,
        ).first()
        if active:
            validated_data["cash_session"] = active

    cash_session = validated_data.pop("cash_session", None)
    # ... rest of create()
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `get_active_session` action | DRF APIClient test: auth user with/without session |
| Unit | `is_today` serializer field | Unit test: session opened today vs yesterday |
| Unit | `SaleCreateSerializer` auto-link | Unit test: with active session, without, with explicit ID |
| Integration | Post-login redirect flow | E2E: login → verify redirect to `/cash/open` or `/` |

## Migration

No migration required. No schema changes. Existing sales remain with null `cash_session` (FK is nullable). Feature is additive.

## Open Questions

- [ ] `OpenSessionPage` currently redirects to `/cash-session/{id}` on success. Confirm this should change to `/` per proposal spec, or keep as session detail page.
- [ ] Should `OpenSessionPage` also check for an existing session for today and skip the form if one exists? Proposal says "no duplicate" but doesn't specify UX for existing-session case.