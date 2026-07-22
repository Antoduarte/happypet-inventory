from decimal import Decimal as _Decimal

from django.contrib.auth import get_user_model

from rest_framework import serializers

from happypet.products.models import Product, ProductPresentation
from happypet.products.constants import DISCOUNT_CHOICES
from happypet.products.services import InsufficientStockError
from happypet.services.models import Service
from happypet.users.models import ROLE_ADMIN, ROLE_MANAGER

from .models import Sale, SaleItem
from .services import SaleService


# ---------------------------------------------------------------------------
# Write serializer for a single item (used only on CREATE)
# ---------------------------------------------------------------------------


class SaleItemCreateSerializer(serializers.Serializer):
    """
    Valida una línea de ítem enviada por el frontend.

    Acepta product_id / presentation_id / service_id (enteros FK)
    en vez de objetos anidados.
    """

    product_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    presentation_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    service_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    type = serializers.ChoiceField(choices=["product", "service"], required=False, default="product")
    is_supply = serializers.BooleanField(required=False, default=False)
    # Decimal para soportar fracciones (2.5 lb, 0.5 cajas, etc.)
    quantity = serializers.DecimalField(max_digits=10, decimal_places=4, min_value=_Decimal("0.0001"))
    discount_percentage = serializers.IntegerField(required=False, default=0)
    surcharge_percentage = serializers.IntegerField(required=False, default=0)
    surcharge_reason = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, default=None
    )

    def validate_discount_percentage(self, value):
        valid = [c[0] for c in DISCOUNT_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid discount percentage: {value}.")
        return value

    def validate_surcharge_percentage(self, value):
        valid = [c[0] for c in DISCOUNT_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid surcharge percentage: {value}.")
        return value

    def validate(self, data):
        product_id = data.get("product_id")
        presentation_id = data.get("presentation_id")
        service_id = data.get("service_id")
        discount = data.get("discount_percentage", 0)
        surcharge = data.get("surcharge_percentage", 0)

        # Debe tener producto o servicio
        if not product_id and not service_id:
            raise serializers.ValidationError(
                "Each item must include either product_id or service_id."
            )

        item_type = data.get("type", "product")
        # Service items cannot have a product
        if item_type == "service" and product_id:
            raise serializers.ValidationError(
                "A service item cannot have a product_id."
            )

        # Descuento y recargo son mutuamente excluyentes
        if discount > 0 and surcharge > 0:
            raise serializers.ValidationError(
                "An item cannot have both a discount and a surcharge."
            )

        # ── Resolver y validar producto ──────────────────────────────────────
        if product_id:
            try:
                product = Product.objects.get(pk=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product with id={product_id} does not exist."
                )
            data["product"] = product

            # ── Coherencia rol de producto (venta vs insumo) ─────────────────
            is_supply = data.get("is_supply", False)
            if is_supply and not product.is_service_supply:
                raise serializers.ValidationError(
                    f"Product '{product.name}' is not marked as a service supply."
                )
            if not is_supply and not product.is_sale_product:
                raise serializers.ValidationError(
                    f"Product '{product.name}' is not marked as a sale product."
                )

            # Si viene con presentación, validarla
            if presentation_id:
                try:
                    presentation = ProductPresentation.objects.get(
                        pk=presentation_id, product=product
                    )
                except ProductPresentation.DoesNotExist:
                    raise serializers.ValidationError(
                        f"Presentation id={presentation_id} does not belong to product id={product_id}."
                    )

                # Validar stock disponible anticipadamente
                from decimal import Decimal
                qty = Decimal(str(data["quantity"]))
                base_needed = qty * presentation.multiplier
                if product.stock < base_needed:
                    raise serializers.ValidationError(
                        f"Insufficient stock for '{product.name}' "
                        f"[{presentation.name}]: "
                        f"need {base_needed:.4f} {product.base_unit}, "
                        f"available {product.stock:.4f} {product.base_unit}."
                    )
                data["presentation"] = presentation
            else:
                data["presentation"] = None

        else:
            data["product"] = None
            data["presentation"] = None

        # ── Resolver servicio ────────────────────────────────────────────────
        if service_id:
            try:
                service = Service.objects.get(pk=service_id)
            except Service.DoesNotExist:
                raise serializers.ValidationError(
                    f"Service with id={service_id} does not exist."
                )
            data["service"] = service
        else:
            data["service"] = None

        return data


# ---------------------------------------------------------------------------
# Write serializer for the Sale (CREATE)
# ---------------------------------------------------------------------------


class SaleCreateSerializer(serializers.Serializer):
    """Valida el payload completo de creación de venta enviado por el frontend."""

    cash_session_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    manager_code = serializers.CharField(
        required=False, allow_blank=True, default="", write_only=True
    )
    items = SaleItemCreateSerializer(many=True)
    payment_type = serializers.ChoiceField(
        choices=["cash", "card", "transfer", "qr", "credit"], required=False, default="cash"
    )
    discount_percentage = serializers.IntegerField(required=False, default=0)
    surcharge_percentage = serializers.IntegerField(required=False, default=0)
    surcharge_reason = serializers.CharField(
        required=False, allow_null=True, allow_blank=True, default=None
    )

    def validate_discount_percentage(self, value):
        valid = [c[0] for c in DISCOUNT_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid discount percentage: {value}.")
        return value

    def validate_surcharge_percentage(self, value):
        valid = [c[0] for c in DISCOUNT_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f"Invalid surcharge percentage: {value}.")
        return value

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one item is required.")
        return value

    def validate(self, data):
        discount = data.get("discount_percentage", 0)
        surcharge = data.get("surcharge_percentage", 0)
        if discount > 0 and surcharge > 0:
            raise serializers.ValidationError(
                "A sale cannot have both a global discount and a surcharge."
            )

        cash_session_id = data.get("cash_session_id")
        if cash_session_id:
            from happypet.cash.models import CashSession
            try:
                session = CashSession.objects.get(pk=cash_session_id)
            except CashSession.DoesNotExist:
                raise serializers.ValidationError(
                    {"cash_session_id": "Cash session not found."}
                )
            if session.status != CashSession.STATUS_OPEN:
                raise serializers.ValidationError(
                    {"cash_session_id": "Cash session is not open."}
                )
            data["cash_session"] = session

        # ── Autorización gerente para desc/rec > 10% ──────────────
        request = self.context.get("request")
        if request and getattr(request.user, "is_cashier", False):
            def _needs_auth(v):
                return v.get("discount_percentage", 0) > 10 or v.get("surcharge_percentage", 0) > 10

            needs_auth = (
                discount > 10 or surcharge > 10
                or any(_needs_auth(item) for item in data.get("items", []))
            )
            if needs_auth:
                code = data.get("manager_code", "")
                if not get_user_model().objects.filter(
                    code=code, role__in=[ROLE_ADMIN, ROLE_MANAGER], is_active=True
                ).exists():
                    raise serializers.ValidationError(
                        {"manager_code": "Se requiere código de autorización del gerente para descuentos o recargos superiores al 10%."}
                    )

        data.pop("manager_code", None)
        return data

    def create(self, validated_data):
        cash_session = validated_data.pop("cash_session", None)
        # Phase 2.1: auto-lookup active session if no explicit cash_session provided
        if not cash_session:
            user = self.context["request"].user
            from django.utils import timezone
            from happypet.cash.models import CashSession
            today = timezone.now().date()
            active = CashSession.objects.filter(
                user=user,
                opened_at__date=today,
                status=CashSession.STATUS_OPEN,
            ).first()
            if active:
                cash_session = active
        try:
            service = SaleService()
            sale = service.create_sale(validated_data)
            if cash_session:
                sale.cash_session = cash_session
                sale.save(update_fields=["cash_session"])

            # Transition to completed automatically on creation
            from .services import SaleStatusService
            status_service = SaleStatusService()
            status_service.transition(sale, "completed", self.context["request"].user)

            return sale
        except InsufficientStockError as exc:
            raise serializers.ValidationError(
                {
                    "stock": str(exc),
                    "product": exc.product.name if exc.product else None,
                    "required": str(exc.required),
                    "available": str(exc.available),
                }
            ) from exc


class SaleStatusSerializer(serializers.Serializer):
    """Valida y ejecuta transiciones de estado de una venta (PATCH-only)."""

    status = serializers.ChoiceField(choices=["completed", "cancelled"])

    def update(self, instance, validated_data):
        from .services import SaleStatusService

        service = SaleStatusService()
        user = self.context["request"].user
        return service.transition(instance, validated_data["status"], user)
# ---------------------------------------------------------------------------
# Read serializers (for GET responses)
# ---------------------------------------------------------------------------


class SaleItemSerializer(serializers.ModelSerializer):
    """Read-only serializer for SaleItem (used in GET /sales/ and GET /sales/{id}/)."""

    """Read-only serializer for SaleItem (used in GET /sales/ and GET /sales/{id}/)."""

    product = None  # resolved below to avoid circular import at class-body time
    service = None

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "type",
            "product",
            "presentation",
            "presentation_name",
            "presentation_price_snapshot",
            "presentation_multiplier_snap",
            "service",
            "parent_service_item",
            "quantity",
            "price_per_item",
            "subtotal",
            "total_price",
            "discount_percentage",
            "surcharge_percentage",
            "surcharge_reason",
        ]

    def __init__(self, *args, **kwargs):
        from happypet.products.serializers import ProductSerializer, ProductPresentationSerializer
        from happypet.services.serializers import ServiceSerializer

        super().__init__(*args, **kwargs)
        self.fields["product"] = ProductSerializer(read_only=True)
        self.fields["presentation"] = ProductPresentationSerializer(read_only=True)
        self.fields["service"] = ServiceSerializer(read_only=True)


class CashSessionMiniSerializer(serializers.Serializer):
    """Minimal read-only serializer for CashSession (nested inside Sale)."""

    id = serializers.IntegerField(read_only=True)
    register_name = serializers.CharField(source="cash_register.name", read_only=True)
    opened_at = serializers.DateTimeField(read_only=True)
    status = serializers.CharField(read_only=True)


class SaleSerializer(serializers.ModelSerializer):
    """Read-only serializer for Sale (used in GET responses)."""

    items = SaleItemSerializer(many=True, read_only=True)
    cash_session = CashSessionMiniSerializer(read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "cash_session",
            "quantity",
            "subtotal",
            "total_price",
            "discount_percentage",
            "surcharge_percentage",
            "surcharge_reason",
            "status",
            "payment_type",
            "sale_date",
            "items",
        ]
        read_only_fields = fields
