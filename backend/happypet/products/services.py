"""
products/services.py
====================
Lógica de negocio para movimientos de stock.

Contiene dos servicios:
  - StockMovementService  → movimientos manuales (entradas/salidas de inventario)
  - PresentationSaleService → descuento atómico al vender por presentación
"""

from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError

from happypet.products.constants import MOVEMENT_IN, MOVEMENT_OUT
from happypet.products.models import InventoryMovement, MovementBatch, Product, ProductPresentation


# ──────────────────────────────────────────────────────────────────────────────
# Excepciones personalizadas
# ──────────────────────────────────────────────────────────────────────────────


class InsufficientStockError(ValidationError):
    """
    Se lanza cuando el stock no alcanza para cubrir el movimiento solicitado.
    Transporta datos estructurados para que la vista pueda devolver una
    respuesta 409 con información útil al cliente.
    """

    def __init__(self, product: Product, required: Decimal, available: Decimal):
        self.product = product
        self.required = required
        self.available = available
        message = (
            f"Stock insuficiente para '{product.name}': "
            f"se requieren {required:.4f} {product.base_unit}, "
            f"pero solo hay {available:.4f} disponibles."
        )
        super().__init__(message)


# ──────────────────────────────────────────────────────────────────────────────
# StockMovementService — movimientos manuales de inventario
# ──────────────────────────────────────────────────────────────────────────────


class StockMovementService:
    """
    Orquesta la creación de un InventoryMovement y la actualización de
    Product.stock de forma atómica.

    Uso::

        service = StockMovementService()
        movement = service.apply(
            product=product_instance,
            movement_type='in',
            quantity=Decimal('10'),
            notes='Recepción de proveedor',
        )
    """

    def apply(
        self,
        *,
        product: Product,
        movement_type: str,
        quantity: Decimal | int,
        presentation: ProductPresentation | None = None,
        notes: str | None = None,
        batch: MovementBatch | None = None,
    ) -> InventoryMovement:
        """
        Aplica un movimiento de stock al producto dado.

        Args:
            product:       Instancia de Product a modificar.
            movement_type: ``'in'`` (entrada) o ``'out'`` (salida).
            quantity:      Cantidad a mover (en la presentación o unidad base).
            presentation:  Presentación opcional usada para el movimiento.
            notes:         Nota libre para el registro.

        Returns:
            InventoryMovement recién creado.

        Raises:
            InsufficientStockError: Si la salida supera el stock disponible.
            ValueError: Si ``movement_type`` no es reconocido.
        """
        quantity = Decimal(str(quantity))
        
        # Calcular cantidad en unidades base
        if presentation:
            base_units_quantity = quantity * presentation.multiplier
        else:
            base_units_quantity = quantity

        new_stock = self._calculate_new_stock(
            current_stock=product.stock,
            movement_type=movement_type,
            quantity=base_units_quantity,
        )

        if presentation:
            automated_note = f"Registrado en presentación: {quantity} x {presentation.name} (x{presentation.multiplier} {product.base_unit})"
            if notes:
                notes = f"{notes} | {automated_note}"
            else:
                notes = automated_note

        with transaction.atomic():
            movement = InventoryMovement.objects.create(
                batch=batch,
                product=product,
                presentation=presentation,
                movement_type=movement_type,
                quantity=base_units_quantity,
                previous_stock=product.stock,
                new_stock=new_stock,
                notes=notes,
            )
            Product.objects.filter(pk=product.pk).update(stock=new_stock)

        return movement

    def apply_batch(
        self,
        *,
        movement_type: str,
        notes: str | None,
        items: list[dict],
    ) -> MovementBatch:
        """
        Apply a batch of inventory movements atomically.

        All movements succeed or all fail together via ``transaction.atomic()``.
        For 'out' movements, products are locked with ``select_for_update()`` to
        prevent race conditions.

        Args:
            movement_type: ``'in'`` (entrada) o ``'out'`` (salida).
            notes: Nota libre aplicada a cada movimiento.
            items: Lista de dicts con keys ``product``, ``presentation``, ``quantity``.

        Returns:
            Lista de ``InventoryMovement`` creados (en el mismo orden que ``items``).

        Raises:
            InsufficientStockError: Si el stock no alcanza para algún movimiento 'out'.
            ValueError: Si ``movement_type`` no es reconocido.
        """
        with transaction.atomic():
            batch = MovementBatch.objects.create(
                movement_type=movement_type,
                notes=notes,
            )

            for item in items:
                product: Product = item["product"]
                presentation: ProductPresentation | None = item.get("presentation")
                quantity: Decimal = Decimal(str(item["quantity"]))

                if presentation and presentation.product_id != product.id:
                    raise ValidationError(
                        {"presentation_id": "La presentación no pertenece al producto."}
                    )

                if movement_type == MOVEMENT_OUT:
                    if presentation:
                        base_qty = quantity * presentation.multiplier
                    else:
                        base_qty = quantity

                    # Lock product row to prevent race condition on stock
                    product = Product.objects.select_for_update().get(pk=product.pk)
                    if product.stock < base_qty:
                        raise InsufficientStockError(
                            product=product,
                            required=base_qty,
                            available=product.stock,
                        )

                self.apply(
                    product=product,
                    presentation=presentation,
                    movement_type=movement_type,
                    quantity=quantity,
                    notes=None,
                    batch=batch,
                )

        return batch

    # ── Private helpers ────────────────────────────────────────────────────

    def _calculate_new_stock(
        self,
        *,
        current_stock: Decimal,
        movement_type: str,
        quantity: Decimal,
    ) -> Decimal:
        if movement_type == MOVEMENT_IN:
            return current_stock + quantity

        if movement_type == MOVEMENT_OUT:
            new_stock = current_stock - quantity
            if new_stock < 0:
                raise InsufficientStockError(
                    product=None,  # type: ignore[arg-type]
                    required=quantity,
                    available=current_stock,
                )
            return new_stock

        raise ValueError(f"Unknown movement type '{movement_type}'.")


# ──────────────────────────────────────────────────────────────────────────────
# PresentationSaleService — descuento al vender por presentación
# ──────────────────────────────────────────────────────────────────────────────


class PresentationSaleService:
    """
    Descuenta stock del Product base cuando se vende una ProductPresentation.

    Fórmula:
        unidades_base_a_descontar = cantidad_vendida × presentation.multiplier

    Ejemplos:
        Vender 1 Saco 100 lb  →  1  × 100  = 100 lb descontadas
        Vender 2.5 Libras     →  2.5 × 1   = 2.5 lb descontadas
        Vender 3 Medias-Lb    →  3  × 0.5  = 1.5 lb descontadas

    Garantías:
    - ``transaction.atomic`` + ``select_for_update`` → sin condiciones de carrera.
    - Crea un ``InventoryMovement`` para auditoría completa.

    Uso::

        service = PresentationSaleService()
        movement = service.deduct(
            product_id=1,
            presentation_id=3,
            quantity=Decimal('2.5'),
            notes='Venta #42',
        )
    """

    def deduct(
        self,
        *,
        product_id: int,
        presentation_id: int,
        quantity: Decimal | int | float,
        notes: str | None = None,
    ) -> InventoryMovement:
        """
        Descuenta ``quantity`` presentaciones del stock del producto base.

        Args:
            product_id:      PK del Product.
            presentation_id: PK de la ProductPresentation elegida.
            quantity:        Cuántas presentaciones se venden (puede ser fracción).
            notes:           Texto libre para el registro de movimiento.

        Returns:
            El ``InventoryMovement`` recién creado.

        Raises:
            InsufficientStockError: Si el stock no alcanza.
            ProductPresentation.DoesNotExist: Si la presentación no existe.
        """
        quantity = Decimal(str(quantity))

        with transaction.atomic():
            # 1. Bloquear fila del producto (evita race conditions)
            product = Product.objects.select_for_update().get(pk=product_id)

            # 2. Obtener presentación con su multiplicador
            presentation = ProductPresentation.objects.get(pk=presentation_id)

            # 3. Calcular cuántas unidades base se deben descontar
            base_units_to_deduct = quantity * presentation.multiplier

            # 4. Validar stock suficiente
            if product.stock < base_units_to_deduct:
                raise InsufficientStockError(
                    product=product,
                    required=base_units_to_deduct,
                    available=product.stock,
                )

            # 5. Calcular nuevo stock
            previous_stock = product.stock
            new_stock = previous_stock - base_units_to_deduct

            # 6. Crear movimiento de auditoría
            movement = InventoryMovement.objects.create(
                product=product,
                movement_type=MOVEMENT_OUT,
                quantity=base_units_to_deduct,  # siempre en unidades base
                previous_stock=previous_stock,
                new_stock=new_stock,
                notes=notes or f"{quantity} × {presentation.name}",
            )

            # 7. Actualizar stock del producto
            Product.objects.filter(pk=product.pk).update(stock=new_stock)

        return movement


# ──────────────────────────────────────────────────────────────────────────────
# Singletons — importar directamente desde otros módulos
# ──────────────────────────────────────────────────────────────────────────────

stock_movement_service = StockMovementService()
presentation_sale_service = PresentationSaleService()
