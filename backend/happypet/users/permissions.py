from rest_framework.permissions import BasePermission

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_CASHIER = "cashier"


class IsAdmin(BasePermission):
    """Solo admins pueden acceder."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == ROLE_ADMIN


class IsManagerOrAdmin(BasePermission):
    """Admin y manager pueden acceder."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (ROLE_ADMIN, ROLE_MANAGER)
        )


class IsManager(BasePermission):
    """Solo managers y admins."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == ROLE_ADMIN


class IsCashier(BasePermission):
    """Solo cajeros."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == ROLE_CASHIER


class IsOwnerOfSession(BasePermission):
    """
    Cashiers solo pueden cerrar/modificar sus propias sesiones.
    Admin y manager pueden cualquier sesión.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.role in (ROLE_ADMIN, ROLE_MANAGER):
            return True
        return obj.user_id == request.user.id


class CanManageProducts(BasePermission):
    """Admin y manager pueden crear/editar productos."""

    def has_permission(self, request, view):
        if request.user.role in (ROLE_ADMIN, ROLE_MANAGER):
            return True
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return False

    def has_object_permission(self, request, view, obj):
        if request.user.role == ROLE_ADMIN:
            return True
        if request.user.role == ROLE_MANAGER:
            return request.method in ("GET", "HEAD", "OPTIONS", "PUT", "PATCH")
        return False


class CanDeleteProducts(BasePermission):
    """Solo admin puede eliminar productos."""

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == ROLE_ADMIN


class CanTransitionSale(BasePermission):
    """Admin, manager y cajero pueden completar/cancelar ventas."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER)
        )