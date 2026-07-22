# Django imports
from rest_framework import filters, viewsets
from rest_framework import status
from django.utils import timezone

# DRF filters
from django_filters.rest_framework import DjangoFilterBackend

# Models
from happypet.products.models import Product, Category, InventoryMovement, MovementBatch, ProductPresentation

# Serializers
from happypet.products.serializers import (
    ProductSerializer,
    CategorySerializer,
    InventoryMovementSerializer,
    MovementBatchSerializer,
    ProductPresentationSerializer,
)

# Utils
from happypet.utils.pagination import StandardResultsSetPagination
from happypet.utils.authorization import check_manager_authorization
from rest_framework.response import Response


# Create your views here.
class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Products instances.
    Provides CRUD operations for products.
    """

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_sale_product', 'is_service_supply']
    search_fields = ["name", "category__name"]
    ordering_fields = ["price", "stock", "name", "category__name"]
    ordering = ["-id"]

    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

    def update(self, request, *args, **kwargs):
        auth_error = check_manager_authorization(request)
        if auth_error:
            return auth_error
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        auth_error = check_manager_authorization(request)
        if auth_error:
            return auth_error
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        auth_error = check_manager_authorization(request)
        if auth_error:
            return auth_error
        instance = self.get_object()
        instance.deleted_at = timezone.now()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductPresentationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing ProductPresentation instances.

    Endpoints:
      GET    /api/product-presentations/           → list
      POST   /api/product-presentations/           → create
      GET    /api/product-presentations/{id}/      → retrieve
      PUT    /api/product-presentations/{id}/      → update
      PATCH  /api/product-presentations/{id}/      → partial update
      DELETE /api/product-presentations/{id}/      → destroy

    Filter by product using ?product=<product_id>.
    """

    queryset = (
        ProductPresentation.objects
        .select_related("product")
        .filter(is_active=True)
    )
    serializer_class = ProductPresentationSerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product", "is_active"]
    search_fields = ["name", "barcode", "product__name"]
    ordering_fields = ["name", "price", "multiplier"]
    ordering = ["name"]

    def get_queryset(self):
        # Allow listing inactive presentations when explicitly requested
        if self.request.query_params.get("include_inactive"):
            return ProductPresentation.objects.select_related("product").all()
        return super().get_queryset()


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Category instances.
    Provides CRUD operations for categories.
    """

    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type']
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["-id"]

    def get_queryset(self):
        return super().get_queryset()


class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only ViewSet for individual InventoryMovement records.

    Useful for filtering movements by product regardless of batch.
    Creation is handled via MovementBatchViewSet.
    """

    queryset = (
        InventoryMovement.objects
        .select_related("product", "product__category", "presentation", "batch")
        .order_by("-movement_date")
    )
    serializer_class = InventoryMovementSerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["product", "movement_type"]
    search_fields = ["product__name", "movement_type"]
    ordering_fields = ["movement_date", "quantity", "product__name"]
    ordering = ["-movement_date"]


class MovementBatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MovementBatch records.

    Allowed operations:
        - LIST    (GET  /movement-batches/)
        - RETRIEVE (GET  /movement-batches/{id}/)
        - CREATE  (POST /movement-batches/)

    Update and delete are intentionally disabled: movement batches are
    immutable audit records.
    """

    queryset = (
        MovementBatch.objects
        .prefetch_related(
            "items",
            "items__product",
            "items__product__category",
            "items__presentation",
        )
        .order_by("-created_at")
    )
    serializer_class = MovementBatchSerializer
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["movement_type"]
    search_fields = ["notes", "items__product__name"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    http_method_names = ["get", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        auth_error = check_manager_authorization(request)
        if auth_error:
            return auth_error
        return super().create(request, *args, **kwargs)
