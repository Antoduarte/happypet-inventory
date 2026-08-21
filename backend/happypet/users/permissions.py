from rest_framework.permissions import BasePermission

ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_CASHIER = "cashier"
ROLE_ACCOUNTANT = "accountant"


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


class IsManagerOrAdminOrAccountant(BasePermission):
    """Admin, manager y contador pueden acceder."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_ACCOUNTANT)
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
        if not (request.user and request.user.is_authenticated):
            return False
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


class CanViewCatalog(BasePermission):
    """
    Catalog (products/categories/services) access.

    - Authenticated users except accountants may read.
    - Admin and manager may write freely.
    - Cashier may write; each view enforces the manager authorization code.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user.role != ROLE_ACCOUNTANT
        return request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER)


class CanOperateCashSession(BasePermission):
    """Only seller roles (admin/manager/cashier) may open or operate cash sessions."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER)
        )


class HasSellerRole(BasePermission):
    """Admin, manager and cashier may access sales; accountant and others are denied."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER)
        )


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