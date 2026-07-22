from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet,
    CategoryViewSet,
    InventoryMovementViewSet,
    MovementBatchViewSet,
    ProductPresentationViewSet,
)

router = DefaultRouter()
router.register(r"products", ProductViewSet, basename="product")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(
    r"inventory-movements", InventoryMovementViewSet, basename="inventorymovement"
)
router.register(
    r"movement-batches", MovementBatchViewSet, basename="movementbatch"
)
router.register(
    r"product-presentations", ProductPresentationViewSet, basename="productpresentation"
)

urlpatterns = [
    path("", include(router.urls)),
]

