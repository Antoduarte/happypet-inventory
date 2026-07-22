from decimal import Decimal

from django.db import models
from django.conf import settings
from happypet.products.models import Product, ProductPresentation
from happypet.services.models import Service
from happypet.products.constants import (
    DISCOUNT_CHOICES,
    PAYMENT_CHOICES,
    PAYMENT_CASH,
    SALE_STATUS_CHOICES,
    SAILE_STATUS_PENDING,
    SALE_ITEM_TYPE_CHOICES,
    SALE_ITEM_PRODUCT,
)

from happypet.cash.models import CashSession


class Sale(models.Model):
    cash_session = models.ForeignKey(
        CashSession,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="sales",
    )
    quantity = models.IntegerField()
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, default=Decimal("0.00")
    )
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, default=Decimal("0.00")
    )
    discount_percentage = models.IntegerField(
        choices=DISCOUNT_CHOICES,
        default=0,
    )
    surcharge_percentage = models.IntegerField(
        choices=DISCOUNT_CHOICES,
        default=0,
    )
    surcharge_reason = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(
        choices=SALE_STATUS_CHOICES,
        default=SAILE_STATUS_PENDING,
        max_length=50,
        blank=True,
        null=True,
    )
    payment_type = models.CharField(
        choices=PAYMENT_CHOICES,
        default=PAYMENT_CASH,
        max_length=50,
        blank=True,
        null=True,
    )
    sale_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sale #{self.pk} — {self.sale_date:%Y-%m-%d}"


class SaleItem(models.Model):
    """
    Detalle de un ítem de venta.

    Cuando el ítem corresponde a un producto vendido por presentación, se
    registra la FK a ``ProductPresentation`` y además se guardan tres campos
    de snapshot que preservan el estado histórico aunque la presentación
    cambie en el futuro:

      - ``presentation_name``             → nombre en el momento de la venta
      - ``presentation_price_snapshot``   → precio en el momento de la venta
      - ``presentation_multiplier_snap``  → multiplicador usado para el cálculo

    El campo ``quantity`` se almacena como Decimal para soportar ventas
    fraccionadas (ej: 2.5 libras sueltas).
    """

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")

    # ── Tipo de ítem ──────────────────────────────────────────────────────
    type = models.CharField(
        choices=SALE_ITEM_TYPE_CHOICES, default=SALE_ITEM_PRODUCT, max_length=10
    )

    # ── Producto y su presentación ────────────────────────────────────────
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, blank=True, null=True
    )
    presentation = models.ForeignKey(
        ProductPresentation,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        help_text="Presentación seleccionada al momento de la venta",
    )

    # Snapshots históricos — no cambian si se edita la presentación en el catálogo
    presentation_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="Nombre de la presentación en el momento de la venta",
    )
    presentation_price_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        help_text="Precio de la presentación en el momento de la venta",
    )
    presentation_multiplier_snap = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0000"),
        help_text="Multiplicador usado para calcular el descuento de stock",
    )

    # ── Servicio (si aplica) ──────────────────────────────────────────────
    service = models.ForeignKey(
        Service,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )

    # ── Cantidad y precios ────────────────────────────────────────────────
    # Decimal para soportar ventas fraccionadas (ej: 2.5 lb)
    quantity = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=Decimal("1.0000"),
    )
    price_per_item = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, default=Decimal("0.00")
    )
    total_price = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, default=Decimal("0.00")
    )

    discount_percentage = models.IntegerField(choices=DISCOUNT_CHOICES, default=0)
    surcharge_percentage = models.IntegerField(choices=DISCOUNT_CHOICES, default=0)
    surcharge_reason = models.CharField(max_length=255, blank=True, null=True)

    # ── Parent service item (for supplies) ────────────────────────────────
    parent_service_item = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='supplies',
        help_text="If this is a supply item, references the parent service SaleItem",
    )

    def __str__(self):
        label = self.presentation_name or (
            self.product.name if self.product else "servicio"
        )
        return f"{self.quantity} × {label}"
