from collections import OrderedDict
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Product, Category, InventoryMovement, MovementBatch, ProductPresentation
from .services import stock_movement_service, InsufficientStockError


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "is_active", "type"]


class ProductPresentationSerializer(serializers.ModelSerializer):
    """Serializer para leer/escribir presentaciones de un producto."""

    # Write-only FK field (POST / PATCH)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(deleted_at__isnull=True),
        write_only=True,
        source="product",
    )

    class Meta:
        model = ProductPresentation
        fields = [
            "id",
            "product_id",
            "name",
            "multiplier",
            "price",
            "barcode",
            "is_active",
        ]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    # Presentaciones anidadas (solo lectura)
    presentations = ProductPresentationSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "price",
            "stock",
            "code",
            "base_unit",
            "category",
            "category_id",
            "presentations",
            "is_sale_product",
            "is_service_supply",
        ]


# ---------------------------------------------------------------------------
# Inventory Movement (read-only, individual items)
# ---------------------------------------------------------------------------


class InventoryMovementSerializer(serializers.ModelSerializer):
    """Read-only serializer for individual InventoryMovement records."""

    product = ProductSerializer(read_only=True)
    presentation = ProductPresentationSerializer(read_only=True)

    class Meta:
        model = InventoryMovement
        fields = [
            "id",
            "product",
            "presentation",
            "movement_type",
            "quantity",
            "previous_stock",
            "new_stock",
            "movement_date",
            "notes",
        ]
        read_only_fields = fields


# ---------------------------------------------------------------------------
# Movement Batch (read + write)
# ---------------------------------------------------------------------------


class MovementItemWriteSerializer(serializers.Serializer):
    """Inner serializer for batch movement items (write-only)."""

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(deleted_at__isnull=True),
        write_only=True,
        source="product",
    )
    presentation_id = serializers.PrimaryKeyRelatedField(
        queryset=ProductPresentation.objects.all(),
        source="presentation",
        write_only=True,
        required=False,
        allow_null=True,
    )
    quantity = serializers.DecimalField(
        max_digits=12,
        decimal_places=4,
        min_value=0,
    )


class MovementBatchSerializer(serializers.ModelSerializer):
    """
    Serializer for MovementBatch.

    Write path (POST):
        - Accepts ``items[]`` with one or more movement items.
        - Delegates stock calculation and persistence to ``StockMovementService``.

    Read path (GET):
        - Returns the batch with nested items (InventoryMovementSerializer).
    """

    # Read: nested items
    items = InventoryMovementSerializer(many=True, read_only=True)

    # Write: item payloads
    write_items = MovementItemWriteSerializer(
        many=True,
        write_only=True,
        source="input_items",
    )

    class Meta:
        model = MovementBatch
        fields = [
            "id",
            "movement_type",
            "notes",
            "created_at",
            "items",
            "write_items",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs: dict) -> dict:
        """
        Consolidate duplicate items: sum quantities for same (product_id, presentation_id).
        """
        items = attrs.get("input_items")
        if not items:
            raise serializers.ValidationError(
                {"write_items": "At least one item is required."}
            )

        seen: dict[tuple, dict] = OrderedDict()
        for item in items:
            product = item["product"]
            presentation = item.get("presentation")
            pres_key = presentation.id if presentation else None
            key = (product.id, pres_key)

            if key in seen:
                seen[key]["quantity"] += item["quantity"]
            else:
                seen[key] = dict(item)

        attrs["_consolidated_items"] = list(seen.values())
        return attrs

    def create(self, validated_data: dict) -> MovementBatch:
        """
        Create a MovementBatch with its child InventoryMovement records atomically.
        """
        movement_type: str = validated_data["movement_type"]
        notes: str | None = validated_data.get("notes")

        try:
            return stock_movement_service.apply_batch(
                movement_type=movement_type,
                notes=notes,
                items=validated_data["_consolidated_items"],
            )
        except InsufficientStockError as exc:
            raise serializers.ValidationError(
                {"write_items": [{"quantity": [str(exc)]}]}
            ) from exc
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            ) from exc
