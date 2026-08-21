from rest_framework.permissions import BasePermission

from happypet.users.permissions import ROLE_ADMIN, ROLE_MANAGER, ROLE_ACCOUNTANT


class CanManageGeneralMovement(BasePermission):
    """
    Permisos para movimientos generales de ingresos/egresos.

    - Admin: puede crear, editar, eliminar (soft delete) y listar.
    - Manager y Contador: solo pueden listar y ver detalle.
    - Otros roles: sin acceso.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == ROLE_ADMIN:
            return True

        if user.role in (ROLE_MANAGER, ROLE_ACCOUNTANT):
            return request.method in ("GET", "HEAD", "OPTIONS")

        return False
