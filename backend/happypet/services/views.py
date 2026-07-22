from django.utils import timezone

# DRF
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


# DRF filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

# Utils
from happypet.utils.pagination import StandardResultsSetPagination
from happypet.utils.authorization import check_manager_authorization

# Models
from .models import Service

# Serializers
from .serializers import ServiceSerializer

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("category").all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active", "category"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "price", "is_active"]

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
        instance.is_active = False
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
