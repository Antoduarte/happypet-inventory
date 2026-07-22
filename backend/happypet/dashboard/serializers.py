from rest_framework import serializers

from happypet.sales.models import Sale, SaleItem


class SaleDetailItemSerializer(serializers.ModelSerializer):
    """
    Flat read-only line for the sales detail report.

    `name` resolves through the snapshot-first chain: presentation snapshot,
    live product name, live service name. Supplies (lines linked to a parent
    service item) are flagged via `is_supply`.
    """

    is_supply = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = [
            'id',
            'type',
            'is_supply',
            'name',
            'quantity',
            'price_per_item',
            'total_price',
            'discount_percentage',
            'surcharge_percentage',
        ]

    def get_is_supply(self, obj):
        return obj.parent_service_item_id is not None

    def get_name(self, obj):
        if obj.presentation_name:
            return obj.presentation_name
        if obj.product_id:
            return obj.product.name
        if obj.service_id:
            return obj.service.name
        return '—'


class SaleDetailRowSerializer(serializers.ModelSerializer):
    """Ticket-level row with nested items for the sales detail report."""

    seller_name = serializers.SerializerMethodField()
    items = SaleDetailItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id',
            'sale_date',
            'payment_type',
            'seller_name',
            'subtotal',
            'total_price',
            'discount_percentage',
            'surcharge_percentage',
            'items',
        ]

    def get_seller_name(self, obj):
        session = obj.cash_session
        if session is None or session.user_id is None:
            return '—'
        return session.user.name or session.user.email
