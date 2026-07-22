from decimal import Decimal

from django.db import models
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .constants import PAYMENT_METHOD_CHOICES
from .models import CashRegister, CashSession, CashMovement, CashSessionClosure
from happypet.sales.models import Sale


class CashRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashRegister
        fields = ["id", "name", "branch", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class CashMovementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    type_display = serializers.CharField(source="get_type_display", read_only=True)

    class Meta:
        model = CashMovement
        fields = [
            "id",
            "cash_session",
            "type",
            "type_display",
            "amount",
            "reason",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "created_by_name", "type_display"]


class CashMovementCreateSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=CashMovement.TYPE_CHOICES)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    reason = serializers.CharField(max_length=255)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


class CashSessionSaleSerializer(serializers.ModelSerializer):
    class Meta:
        from happypet.sales.models import Sale
        model = Sale
        fields = ["id", "payment_type", "total_price", "status"]


class CashSessionSerializer(serializers.ModelSerializer):
    cash_register_name = serializers.CharField(source="cash_register.name", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    movements = CashMovementSerializer(many=True, read_only=True)
    sales = CashSessionSaleSerializer(many=True, read_only=True)
    expected_amount = serializers.SerializerMethodField()
    is_today = serializers.SerializerMethodField()

    class Meta:
        model = CashSession
        fields = [
            "id",
            "cash_register",
            "cash_register_name",
            "user",
            "user_name",
            "opening_amount",
            "expected_amount",
            "counted_amount",
            "difference",
            "status",
            "status_display",
            "notes",
            "opened_at",
            "closed_at",
            "suspended_at",
            "movements",
            "sales",
            "is_today",
        ]
        read_only_fields = [
            "id",
            "user",
            "user_name",
            "expected_amount",
            "counted_amount",
            "difference",
            "opened_at",
            "closed_at",
            "suspended_at",
            "movements",
            "sales",
            "is_today",
        ]

    def get_expected_amount(self, obj):
        if obj.status == obj.STATUS_CLOSED:
            return obj.expected_amount
        from .services import CashSessionService
        return CashSessionService._calculate_expected_amount(obj)

    def get_is_today(self, obj):
        return obj.opened_at.date() == timezone.now().date()


class CashSessionActiveSerializer(serializers.Serializer):
    id = serializers.IntegerField(allow_null=True)
    status = serializers.CharField(allow_null=True)
    opened_at = serializers.DateTimeField(allow_null=True)
    user_id = serializers.IntegerField(allow_null=True)


class CashSessionOpenSerializer (serializers.Serializer):
    cash_register_id = serializers.IntegerField(required=False)
    opening_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        default=Decimal("0.00"),
    )

    def validate_cash_register_id(self, value):
        if value is None:
            return None
        try:
            register = CashRegister.objects.get(pk=value)
        except CashRegister.DoesNotExist:
            raise serializers.ValidationError("Cash register not found.")

        if not register.is_active:
            raise serializers.ValidationError("Cash register is not active.")

        if CashSession.objects.filter(
            cash_register=register,
            status__in=[CashSession.STATUS_OPEN, CashSession.STATUS_SUSPENDED],
        ).exists():
            raise serializers.ValidationError(
                "There is already an open or suspended session for this cash register."
            )
        return value

    def validate(self, attrs):
        if attrs.get("cash_register_id") is None:
            user = self.context["request"].user
            register, _ = CashRegister.objects.get_or_create(
                name=f"Caja de {user.email}",
                defaults={"branch": "", "is_active": True},
            )
            attrs["cash_register_id"] = register.pk
        return attrs


class CashSessionCloseSerializer(serializers.Serializer):
    counted_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class CashSessionReportSerializer(serializers.ModelSerializer):
    cash_register_name = serializers.CharField(source="cash_register.name", read_only=True)
    user_name = serializers.CharField(source="user.name", read_only=True)

    sales_count = serializers.SerializerMethodField()
    sales_total = serializers.SerializerMethodField()
    cash_sales_total = serializers.SerializerMethodField()
    card_sales_total = serializers.SerializerMethodField()
    transfer_sales_total = serializers.SerializerMethodField()
    qr_sales_total = serializers.SerializerMethodField()
    credit_sales_total = serializers.SerializerMethodField()

    income_total = serializers.SerializerMethodField()
    expense_total = serializers.SerializerMethodField()
    movements_count = serializers.SerializerMethodField()

    class Meta:
        model = CashSession
        fields = [
            "id",
            "cash_register",
            "cash_register_name",
            "user",
            "user_name",
            "opening_amount",
            "expected_amount",
            "counted_amount",
            "difference",
            "status",
            "notes",
            "opened_at",
            "closed_at",
            "sales_count",
            "sales_total",
            "cash_sales_total",
            "card_sales_total",
            "transfer_sales_total",
            "qr_sales_total",
            "credit_sales_total",
            "income_total",
            "expense_total",
            "movements_count",
        ]

    def get_sales_count(self, obj):
        return obj.sales.count()

    def get_sales_total(self, obj):
        return obj.sales.aggregate(total=models.Sum("total_price"))["total"] or Decimal("0.00")

    def _get_sales_by_payment(self, obj, payment_type):
        return (
            obj.sales.filter(payment_type=payment_type).aggregate(
                total=models.Sum("total_price")
            )["total"]
            or Decimal("0.00")
        )

    def get_cash_sales_total(self, obj):
        return self._get_sales_by_payment(obj, "cash")

    def get_card_sales_total(self, obj):
        return self._get_sales_by_payment(obj, "card")

    def get_transfer_sales_total(self, obj):
        return self._get_sales_by_payment(obj, "transfer")

    def get_qr_sales_total(self, obj):
        return self._get_sales_by_payment(obj, "qr")

    def get_credit_sales_total(self, obj):
        return self._get_sales_by_payment(obj, "credit")

    def get_income_total(self, obj):
        return (
            obj.movements.filter(type=CashMovement.TYPE_INCOME).aggregate(
                total=models.Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

    def get_expense_total(self, obj):
        return (
            obj.movements.filter(type=CashMovement.TYPE_EXPENSE).aggregate(
                total=models.Sum("amount")
            )["total"]
            or Decimal("0.00")
        )

    def get_movements_count(self, obj):
        return obj.movements.count()


class CashSessionClosureSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashSessionClosure
        fields = [
            "id",
            "session",
            "closed_at",
            "expected_amount",
            "counted_amount",
            "difference",
            "notes",
        ]
        read_only_fields = ["id", "session", "closed_at"]