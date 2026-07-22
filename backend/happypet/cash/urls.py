from rest_framework.routers import SimpleRouter
from .views import CashRegisterViewSet, CashSessionViewSet, CashMovementViewSet

router = SimpleRouter()
router.register("cash-registers", CashRegisterViewSet, basename="cash-register")
router.register("cash-sessions", CashSessionViewSet, basename="cash-session")
router.register("cash-movements", CashMovementViewSet, basename="cash-movement")

urlpatterns = router.urls