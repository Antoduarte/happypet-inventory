from rest_framework.permissions import BasePermission

from happypet.users.permissions import ROLE_ADMIN, ROLE_MANAGER


class CanManageGeneralMovement(BasePermission):
    """
    Permisos para movimientos generales de ingresos/egresos.

    - Admin: puede crear, editar, eliminar y listar.
    - Manager: solo puede listar y ver detalle.
    - Cajero y otros roles: sin acceso.
    """

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role == ROLE_ADMIN:
            return True

        if user.role == ROLE_MANAGER:
            return request.method in ("GET", "HEAD", "OPTIONS")

        return False
