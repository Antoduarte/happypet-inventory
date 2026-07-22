from django.utils import timezone
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CashRegister, CashSession, CashMovement, CashSessionClosure
from .serializers import (
    CashRegisterSerializer,
    CashSessionSerializer,
    CashSessionOpenSerializer,
    CashSessionCloseSerializer,
    CashSessionReportSerializer,
    CashMovementSerializer,
    CashMovementCreateSerializer,
    CashSessionActiveSerializer,
    CashSessionClosureSerializer,
)
from .services import CashSessionService, CashMovementService
from happypet.users.permissions import ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER


class CashRegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.all()
    serializer_class = CashRegisterSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == "true")
        return queryset


class CashSessionViewSet(viewsets.ModelViewSet):
    queryset = CashSession.objects.select_related("cash_register", "user").prefetch_related(
        "movements", "sales"
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "current":
            return CashSessionSerializer
        if self.action == "open":
            return CashSessionOpenSerializer
        if self.action == "close":
            return CashSessionCloseSerializer
        if self.action == "report":
            return CashSessionReportSerializer
        if self.action == "active":
            return CashSessionActiveSerializer
        return CashSessionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == ROLE_CASHIER:
            queryset = queryset.filter(user=user)

        user_id = self.request.query_params.get("user_id")
        if user_id and user.role in (ROLE_ADMIN, ROLE_MANAGER):
            queryset = queryset.filter(user_id=user_id)

        cash_register_id = self.request.query_params.get("cash_register_id")
        if cash_register_id:
            queryset = queryset.filter(cash_register_id=cash_register_id)

        return queryset

    @action(detail=False, methods=["post"], url_path="open")
    def open(self, request):
        serializer = CashSessionOpenSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        try:
            session = CashSessionService.open_session(
                cash_register_id=serializer.validated_data["cash_register_id"],
                user_id=request.user.id,
                opening_amount=serializer.validated_data["opening_amount"],
            )
            return Response(
                CashSessionSerializer(session).data,
                status=status.HTTP_201_CREATED,
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        register_id = request.query_params.get("cash_register_id")
        if not register_id:
            return Response(
                {"id": None},
                status=status.HTTP_200_OK,
            )

        user = request.user
        session = CashSessionService.get_current_session(int(register_id))

        if not session:
            return Response(
                {"id": None},
                status=status.HTTP_200_OK,
            )

        if user.role == ROLE_CASHIER and session.user_id != user.id:
            return Response(
                {"id": None},
                status=status.HTTP_200_OK,
            )

        return Response({"id": session.id})

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request, pk=None):
        session = CashSession.objects.get(pk=pk)

        if session.status == CashSession.STATUS_CLOSED:
            return Response(
                {"error": "Session is already closed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if session.status == CashSession.STATUS_SUSPENDED:
            return Response(
                {"error": "Session is already suspended."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only close your own sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CashSessionCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            session = CashSessionService.close_session(
                session_id=pk,
                counted_amount=serializer.validated_data["counted_amount"],
                notes=serializer.validated_data.get("notes", ""),
            )
            return Response(CashSessionSerializer(session).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        session = CashSession.objects.get(pk=pk)

        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only resume your own sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = CashSessionService.resume_session(pk)
            return Response(CashSessionSerializer(session).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="final-close")
    def final_close(self, request, pk=None):
        session = CashSession.objects.get(pk=pk)

        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only final-close your own sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = CashSessionService.final_close_session(pk)
            return Response(CashSessionSerializer(session).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"], url_path="report")
    def report(self, request, pk=None):
        session = CashSession.objects.get(pk=pk)

        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only view your own session reports."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            session = CashSessionService.get_session_report(pk)
            return Response(CashSessionReportSerializer(session).data)
        except CashSession.DoesNotExist:
            return Response(
                {"error": "Session not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        """Return today's open or suspended session for the current user, or null if none."""
        user = request.user
        today = timezone.now().date()
        session = (
            CashSession.objects
            .filter(user=user)
            .filter(opened_at__date=today)
            .filter(
                models.Q(status=CashSession.STATUS_OPEN) |
                models.Q(status=CashSession.STATUS_SUSPENDED)
            )
            .select_related("cash_register", "user")
            .order_by("-opened_at")
            .first()
        )
        if session:
            return Response({
                "id": session.id,
                "status": session.status,
                "opened_at": session.opened_at,
                "user_id": session.user_id,
            })
        return Response({
            "id": None,
            "status": None,
            "opened_at": None,
            "user_id": None,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="closures")
    def closures(self, request, pk=None):
        session = CashSession.objects.get(pk=pk)

        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only view your own session closures."},
                status=status.HTTP_403_FORBIDDEN,
            )

        closures = session.closures.all().order_by("-closed_at")
        return Response(CashSessionClosureSerializer(closures, many=True).data)


class CashMovementViewSet(viewsets.ModelViewSet):
    queryset = CashMovement.objects.select_related("cash_session", "created_by")
    serializer_class = CashMovementSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == ROLE_CASHIER:
            queryset = queryset.filter(cash_session__user=user)

        session_id = self.request.query_params.get("cash_session")
        if session_id:
            queryset = queryset.filter(cash_session_id=session_id)

        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return CashMovementCreateSerializer
        return CashMovementSerializer

    def create(self, request, *args, **kwargs):
        serializer = CashMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = request.data.get("cash_session")
        if not session_id:
            return Response(
                {"error": "cash_session is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = CashSession.objects.get(pk=session_id)
        if request.user.role == ROLE_CASHIER and session.user_id != request.user.id:
            return Response(
                {"error": "You can only add movements to your own sessions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            movement = CashMovementService.create_movement(
                session_id=session_id,
                movement_type=serializer.validated_data["type"],
                amount=serializer.validated_data["amount"],
                reason=serializer.validated_data["reason"],
                user_id=request.user.id,
            )
            return Response(
                CashMovementSerializer(movement).data,
                status=status.HTTP_201_CREATED,
            )
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    def list(self, request, *args, **kwargs):
        session_id = request.query_params.get("cash_session")
        if session_id:
            self.queryset = self.queryset.filter(cash_session_id=session_id)
        return super().list(request, *args, **kwargs)
