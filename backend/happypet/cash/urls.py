from rest_framework.routers import SimpleRouter
from .views import (
    CashRegisterViewSet,
    CashSessionViewSet,
    CashMovementViewSet,
    GeneralMovementViewSet,
)

router = SimpleRouter()
router.register("cash-registers", CashRegisterViewSet, basename="cash-register")
router.register("cash-sessions", CashSessionViewSet, basename="cash-session")
router.register("cash-movements", CashMovementViewSet, basename="cash-movement")
router.register("general-movements", GeneralMovementViewSet, basename="general-movement")

urlpatterns = router.urls
