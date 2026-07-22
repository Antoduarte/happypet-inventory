from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, SalePrintView

router = DefaultRouter()
router.register(r"sales", SaleViewSet, basename="sale")

urlpatterns = [
    path("sales/<int:pk>/print/", SalePrintView(), name="sale-print"),
    path("", include(router.urls)),
]
