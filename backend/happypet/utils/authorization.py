"""Helpers de autorización compartidos entre apps."""

from rest_framework import status
from rest_framework.response import Response

from happypet.users.models import User, ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER


def check_manager_authorization(request):
    """Exige un código de autorización de gerente/admin cuando el usuario es cajero.

    El código puede venir en el body (``manager_code``) o en el query string
    (``?manager_code=``), esto último para peticiones DELETE que no llevan body.

    Devuelve una ``Response`` 403 si el código falta o es inválido; ``None`` si el
    usuario está autorizado (no es cajero, o presentó un código válido de un
    admin/manager activo).
    """
    if getattr(request.user, "role", None) != ROLE_CASHIER:
        return None

    manager_code = (
        request.data.get("manager_code")
        or request.query_params.get("manager_code")
        or ""
    )
    if not manager_code:
        return Response(
            {"error": "Se requiere código de autorización del gerente."},
            status=status.HTTP_403_FORBIDDEN,
        )

    valid_authorizer = User.objects.filter(
        code=manager_code,
        role__in=[ROLE_ADMIN, ROLE_MANAGER],
        is_active=True,
    ).exists()
    if not valid_authorizer:
        return Response(
            {"error": "Código de autorización inválido."},
            status=status.HTTP_403_FORBIDDEN,
        )

    return None
