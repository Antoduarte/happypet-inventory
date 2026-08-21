from datetime import date, datetime, time as dtime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from django.db.models import Count, Q, Case, DecimalField, Sum, Value, When
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils.dateparse import parse_date
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CashRegister, CashSession, CashMovement, CashSessionClosure, GeneralMovement
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
    CashSessionClosedListSerializer,
    GeneralMovementSerializer,
    GeneralMovementWriteSerializer,
    GeneralMovementSummarySerializer,
    CashReportSerializer,
)
from .services import CashSessionService, CashMovementService
from .permissions import CanManageGeneralMovement
from happypet.products.constants import SAILE_STATUS_CANCELLED
from happypet.users.permissions import ROLE_ADMIN, ROLE_MANAGER, ROLE_CASHIER, ROLE_ACCOUNTANT, IsManagerOrAdmin, IsManagerOrAdminOrAccountant, CanOperateCashSession
from happypet.utils.pagination import StandardResultsSetPagination

User = get_user_model()


class CashRegisterViewSet(viewsets.ModelViewSet):
    queryset = CashRegister.objects.all()
    serializer_class = CashRegisterSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        """Only admin/manager may create, update or delete cash registers."""
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManagerOrAdmin()]
        return super().get_permissions()

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

    def get_permissions(self):
        """Only seller roles may open, resume or close cash sessions."""
        if self.action in (
            "create",
            "open",
            "close",
            "resume",
            "final-close",
            "update",
            "partial_update",
            "destroy",
        ):
            return [CanOperateCashSession()]
        return super().get_permissions()

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
        if user_id and user.role in (ROLE_ADMIN, ROLE_MANAGER, ROLE_ACCOUNTANT):
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
        from happypet.cash.utils import get_today_range
        user = request.user
        today_start, today_end = get_today_range()
        session = (
            CashSession.objects
            .filter(user=user)
            .filter(opened_at__gte=today_start, opened_at__lt=today_end)
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

    @action(detail=False, methods=["get"], url_path="closed",
            permission_classes=[IsManagerOrAdminOrAccountant])
    def closed(self, request):
        """Historial de cajas cerradas (solo admin/manager, solo lectura).

        Filtros: ``date_from``/``date_to`` por fecha de apertura y ``user_id``.
        ``sales_count`` y ``sales_total`` excluyen ventas canceladas.
        """
        queryset = (
            CashSession.objects
            .filter(status=CashSession.STATUS_CLOSED)
            .select_related("cash_register", "user")
            .annotate(
                sales_count=Count(
                    "sales",
                    filter=~Q(sales__status=SAILE_STATUS_CANCELLED),
                    distinct=True,
                ),
                sales_total=Sum(
                    "sales__total_price",
                    filter=~Q(sales__status=SAILE_STATUS_CANCELLED),
                    default=Decimal("0.00"),
                ),
            )
        )

        date_from = request.query_params.get("date_from")
        if date_from:
            parsed = parse_date(date_from)
            if parsed:
                queryset = queryset.filter(
                    opened_at__gte=timezone.make_aware(datetime.combine(parsed, dtime.min))
                )

        date_to = request.query_params.get("date_to")
        if date_to:
            parsed = parse_date(date_to)
            if parsed:
                queryset = queryset.filter(
                    opened_at__lte=timezone.make_aware(datetime.combine(parsed, dtime.max))
                )

        user_id = request.query_params.get("user_id")
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        queryset = queryset.order_by("-opened_at")

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = CashSessionClosedListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = CashSessionClosedListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="users",
            permission_classes=[IsManagerOrAdminOrAccountant])
    def users(self, request):
        """Usuarios con al menos una sesión de caja (para filtros del historial)."""
        user_ids = (CashSession.objects.values_list("user_id", flat=True).distinct())
        users = (
            User.objects
            .filter(id__in=user_ids, is_active=True)
            .order_by("name")
        )
        return Response([
            {"id": user.id, "name": user.name or user.email}
            for user in users
        ])


class CashMovementViewSet(viewsets.ModelViewSet):
    queryset = CashMovement.objects.select_related("cash_session", "created_by")
    serializer_class = CashMovementSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post"]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if user.role == ROLE_CASHIER:
            queryset = queryset.filter(cash_session__user=user)

        session_id = self.request.query_params.get("cash_session")
        if session_id:
            queryset = queryset.filter(cash_session_id=session_id)

        movement_type = self.request.query_params.get("type")
        if movement_type:
            queryset = queryset.filter(type=movement_type)

        cashier_id = self.request.query_params.get("cashier_id")
        if cashier_id:
            queryset = queryset.filter(cash_session__user_id=cashier_id)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            parsed = parse_date(date_from)
            if parsed:
                queryset = queryset.filter(created_at__date__gte=parsed)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            parsed = parse_date(date_to)
            if parsed:
                queryset = queryset.filter(created_at__date__lte=parsed)

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
        return super().list(request, *args, **kwargs)


class GeneralMovementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para movimientos generales de ingresos y egresos del negocio.

    Permisos:
      - Admin: crear, editar, eliminar (soft delete) y listar.
      - Manager: listar y ver detalle.
      - Otros roles: sin acceso.
    """

    queryset = (
        GeneralMovement.objects
        .filter(deleted_at__isnull=True)
        .select_related("created_by")
    )
    serializer_class = GeneralMovementSerializer
    permission_classes = [CanManageGeneralMovement]
    pagination_class = StandardResultsSetPagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return GeneralMovementWriteSerializer
        return GeneralMovementSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        read_serializer = GeneralMovementSerializer(serializer.instance)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        queryset = super().get_queryset()

        movement_type = self.request.query_params.get("type")
        if movement_type:
            queryset = queryset.filter(type=movement_type)

        payment_method = self.request.query_params.get("payment_method")
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            queryset = queryset.filter(date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Resumen agregado de movimientos generales según los filtros aplicados."""
        queryset = self.get_queryset()

        amount_field = DecimalField(
            max_digits=12,
            decimal_places=2,
            default=Decimal("0.00"),
        )

        totals = queryset.aggregate(
            total_income=Sum(
                Case(When(type=GeneralMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
            ),
            total_expense=Sum(
                Case(When(type=GeneralMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
            ),
            count=models.Count("id"),
        )
        total_income = totals["total_income"] or Decimal("0.00")
        total_expense = totals["total_expense"] or Decimal("0.00")
        balance = total_income - total_expense

        by_payment = []
        for method, label in GeneralMovement.PAYMENT_CHOICES:
            total = (
                queryset.filter(payment_method=method).aggregate(total=Sum("amount"))["total"]
                or Decimal("0.00")
            )
            by_payment.append(
                {
                    "type": method,
                    "label": label,
                    "total": str(total),
                }
            )

        granularity = request.query_params.get("granularity", "day")

        bucket_map = {
            "day": "date",
            "week": TruncWeek,
            "month": TruncMonth,
        }
        bucket_expr = bucket_map.get(granularity, "date")

        if bucket_expr == "date":
            aggregated = (
                queryset.values("date")
                .annotate(
                    income=Sum(
                        Case(When(type=GeneralMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
                    ),
                    expense=Sum(
                        Case(When(type=GeneralMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
                    ),
                )
                .order_by("date")
            )
        else:
            aggregated = (
                queryset.annotate(bucket=bucket_expr("date"))
                .values("bucket")
                .annotate(
                    income=Sum(
                        Case(When(type=GeneralMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
                    ),
                    expense=Sum(
                        Case(When(type=GeneralMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
                    ),
                )
                .order_by("bucket")
            )

        by_period = []
        for row in aggregated:
            bucket = row["date"] if bucket_expr == "date" else row["bucket"]
            if isinstance(bucket, datetime):
                period = timezone.localtime(bucket).date().isoformat()
            else:
                period = bucket.isoformat()
            by_period.append(
                {
                    "period": period,
                    "income": str(row["income"]),
                    "expense": str(row["expense"]),
                }
            )

        data = {
            "total_income": str(total_income),
            "total_expense": str(total_expense),
            "balance": str(balance),
            "count": totals["count"],
            "by_payment": by_payment,
            "by_period": by_period,
        }
        return Response(GeneralMovementSummarySerializer(data).data)


class CashReportView(APIView):
    """
    Aggregated cash movement report for accounting.

    Returns income/expense totals, a period breakdown, and a per-cashier
    breakdown for the requested date range. Admins, managers and accountants
    can access this report.
    """

    permission_classes = [IsManagerOrAdminOrAccountant]

    def _parse_date(self, value, fallback):
        """Parse a YYYY-MM-DD query param, returning fallback if invalid."""
        if not value:
            return fallback
        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return fallback

    def _format_money(self, value):
        """Format a numeric value as a string with exactly two decimal places."""
        return f"{Decimal(str(value)):.2f}"

    def get(self, request):
        today = date.today()
        start = self._parse_date(request.query_params.get("start"), today)
        end = self._parse_date(request.query_params.get("end"), today)

        if end < start:
            start, end = end, start

        granularity = request.query_params.get("granularity", "day")
        if granularity not in ("day", "week", "month"):
            granularity = "day"

        cashier_id = request.query_params.get("cashier_id") or None

        qs = CashMovement.objects.filter(
            created_at__date__gte=start,
            created_at__date__lte=end,
        )

        if cashier_id:
            qs = qs.filter(cash_session__user_id=cashier_id)

        amount_field = DecimalField(
            max_digits=12,
            decimal_places=2,
            default=Decimal("0.00"),
        )

        totals = qs.aggregate(
            total_income=Sum(
                Case(When(type=CashMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
            ),
            total_expense=Sum(
                Case(When(type=CashMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
            ),
            count=Count("id"),
        )
        total_income = totals["total_income"] or Decimal("0.00")
        total_expense = totals["total_expense"] or Decimal("0.00")
        balance = total_income - total_expense

        trunc_map = {
            "day": TruncDay,
            "week": TruncWeek,
            "month": TruncMonth,
        }
        trunc = trunc_map[granularity]

        aggregated = (
            qs.annotate(period=trunc("created_at"))
            .values("period")
            .annotate(
                income=Sum(
                    Case(When(type=CashMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
                ),
                expense=Sum(
                    Case(When(type=CashMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
                ),
            )
            .order_by("period")
        )

        by_period = []
        for row in aggregated:
            bucket = row["period"]
            if isinstance(bucket, datetime):
                period = timezone.localtime(bucket).date().isoformat()
            else:
                period = bucket.isoformat()
            by_period.append(
                {
                    "period": period,
                    "income": self._format_money(row["income"] or 0),
                    "expense": self._format_money(row["expense"] or 0),
                }
            )

        by_cashier = []
        for row in (
            qs.values("cash_session__user", "cash_session__user__name")
            .annotate(
                income=Sum(
                    Case(When(type=CashMovement.TYPE_INCOME, then="amount"), default=Value(0), output_field=amount_field),
                ),
                expense=Sum(
                    Case(When(type=CashMovement.TYPE_EXPENSE, then="amount"), default=Value(0), output_field=amount_field),
                ),
            )
            .order_by("-income")
        ):
            by_cashier.append(
                {
                    "user_id": row["cash_session__user"],
                    "name": row["cash_session__user__name"] or "Sin caja",
                    "income": self._format_money(row["income"] or 0),
                    "expense": self._format_money(row["expense"] or 0),
                }
            )

        data = {
            "granularity": granularity,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "total_income": self._format_money(total_income),
            "total_expense": self._format_money(total_expense),
            "balance": self._format_money(balance),
            "count": totals["count"] or 0,
            "by_period": by_period,
            "by_cashier": by_cashier,
        }
        return Response(CashReportSerializer(data).data)
