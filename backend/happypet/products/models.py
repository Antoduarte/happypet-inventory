from decimal import Decimal
from django.db import models
from .constants import CATEGORY_TYPE_CHOICES, MOVEMENT_TYPE_CHOICES, MOVEMENT_IN, BASE_UNIT_CHOICES


class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(
        max_length=20, choices=CATEGORY_TYPE_CHOICES, default="product"
    )
    is_active = models.BooleanField(default=True)
    create_date = models.DateTimeField(auto_now_add=True)
    update_date = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    """
    Artículo base del inventario.

    ``stock`` se almacena en ``base_unit`` (la unidad de medida más pequeña
    del producto). Ejemplos:
      - base_unit='lb'  → stock=200  significa 200 libras disponibles.
      - base_unit='ml'  → stock=1000 significa 1 litro disponible.
      - base_unit='u'   → stock=50   significa 50 unidades disponibles.

    Nota: ``price`` es el precio de referencia de la unidad base.
    Cada ``ProductPresentation`` tiene su propio precio de venta.
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name="category_products",
        null=True,
        blank=True,
    )

    # ── Unidad base y stock ─────────────────────────────────────────────────
    # DecimalField permite fracciones (ej: 2.5 lb, 150.75 ml).
    base_unit = models.CharField(
        max_length=20,
        choices=BASE_UNIT_CHOICES,
        default="u",
        help_text="Unidad de medida base (ej: lb, kg, ml, u, caja)",
    )
    stock = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=Decimal("0.0000"),
        help_text="Stock disponible expresado en base_unit",
    )

    # Precio de referencia por unidad base (informativo; cada presentación tiene el suyo)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))

    is_active = models.BooleanField(default=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    # ── Rol del producto en la venta ────────────────────────────────────────
    # Un producto puede venderse directamente y/o usarse como insumo de un
    # servicio. Controla en qué selector del formulario de venta aparece.
    is_sale_product = models.BooleanField(
        default=True,
        help_text="Aparece como producto de venta directa.",
    )
    is_service_supply = models.BooleanField(
        default=False,
        help_text="Aparece como insumo de un servicio en la venta.",
    )

    def __str__(self):
        return f"{self.name} ({self.base_unit})"


class ProductPresentation(models.Model):
    """
    Una forma de vender el producto base (saco, caja, unidad suelta, ml, etc.).

    ``multiplier`` indica cuántas unidades base contiene esta presentación:
      - "Saco 100 lb"   → multiplier=100    (descuenta 100 lb del stock)
      - "Libra suelta"  → multiplier=1      (descuenta 1 lb)
      - "Media libra"   → multiplier=0.5    (descuenta 0.5 lb)
      - "Botella 500ml" → multiplier=500    (descuenta 500 ml)
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="presentations",
    )
    name = models.CharField(
        max_length=100,
        help_text="Nombre descriptivo (ej: 'Saco 100lb', 'Unidad', 'Botella 500ml')",
    )
    multiplier = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text="Cuántas unidades base representa esta presentación",
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Precio de venta de esta presentación",
    )
    barcode = models.CharField(max_length=100, unique=True, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("product", "name")]

    def __str__(self):
        return f"{self.product.name} — {self.name} (×{self.multiplier} {self.product.base_unit})"


class MovementBatch(models.Model):
    """
    Groups one or more InventoryMovement records created in a single operation.

    Acts as the parent record for batch stock movements, providing shared
    metadata (type, notes, timestamp) while each child InventoryMovement
    tracks the per-product stock change.
    """

    movement_type = models.CharField(
        max_length=3, choices=MOVEMENT_TYPE_CHOICES, default=MOVEMENT_IN
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Batch #{self.id} ({self.get_movement_type_display()}) "
            f"— {self.created_at:%Y-%m-%d %H:%M}"
        )


class InventoryMovement(models.Model):
    """
    Registro inmutable de cada entrada/salida de stock.
    ``quantity`` siempre se expresa en unidades base del producto.
    """

    batch = models.ForeignKey(
        MovementBatch,
        on_delete=models.CASCADE,
        related_name="items",
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="inventory_movements"
    )
    presentation = models.ForeignKey(
        ProductPresentation,
        on_delete=models.SET_NULL,
        related_name="inventory_movements",
        null=True,
        blank=True,
    )
    movement_type = models.CharField(
        max_length=3, choices=MOVEMENT_TYPE_CHOICES, default=MOVEMENT_IN
    )
    # En unidades base (Decimal para soportar fracciones)
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    previous_stock = models.DecimalField(max_digits=12, decimal_places=4)
    new_stock = models.DecimalField(max_digits=12, decimal_places=4)
    movement_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return (
            f"{self.movement_type} | {self.product.name} | "
            f"{self.quantity} {self.product.base_unit}"
        )

