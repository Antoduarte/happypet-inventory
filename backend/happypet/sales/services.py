"""
sales/services.py
=================
Orquesta la creación de ventas completas.

Flujo (por ítem):
  - Producto con presentación → usa PresentationSaleService.deduct()
    (descuenta stock respetando el multiplicador, atómico + select_for_update)
  - Producto sin presentación → descuenta directamente con select_for_update
  - Servicio → no descuenta stock del producto (los insumos del servicio
    ya vienen aplanados como ítems de producto por el frontend)
"""

from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError

from happypet.products.constants import (
    SALE_ITEM_PRODUCT,
    SALE_ITEM_SERVICE,
    PAYMENT_CASH,
    SAILE_STATUS_PENDING,
    SAILE_STATUS_COMPLETED,
    SAILE_STATUS_CANCELLED,
    MOVEMENT_IN,
    MOVEMENT_OUT,
)
from happypet.products.models import Product, ProductPresentation, InventoryMovement, MovementBatch
from happypet.cash.models import CashSession, CashMovement
from happypet.products.services import (
    InsufficientStockError,
    stock_movement_service,
)

from .models import Sale, SaleItem
from happypet.products.constants import SALE_ITEM_SERVICE


class SaleService:
    """
    Orquesta la creación de una venta completa de forma atómica.

    Flujo:
    1. Construir la cabecera Sale (sin guardar aún).
    2. Iterar ítems → calcular precios y descontar stock.
    3. Calcular subtotal de ítems y aplicar ajuste global.
    4. Persistir Sale + SaleItem en una sola transacción.
    """

    @transaction.atomic
    def create_sale(self, validated_data: dict) -> Sale:
        """Crea una venta completa dentro de una transacción atómica."""

        items_data: list[dict] = validated_data.pop("items")

        has_stock_movements = any(
            item.get("product") and item.get("type", SALE_ITEM_PRODUCT) == SALE_ITEM_PRODUCT
            for item in items_data
        )
        batch = None
        if has_stock_movements:
            batch = MovementBatch.objects.create(
                movement_type=MOVEMENT_OUT,
                notes="Venta en proceso",
            )

        # 1. Construir cabecera sin guardar
        sale = Sale(
            payment_type=validated_data.get("payment_type", "cash"),
            discount_percentage=validated_data.get("discount_percentage", 0),
            surcharge_percentage=validated_data.get("surcharge_percentage", 0),
            surcharge_reason=validated_data.get("surcharge_reason") or None,
        )

        # 2. Procesar ítems → calcular totales y descontar stock
        sale_items, items_subtotal = self._process_items(sale, items_data, batch)

        # 3. Calcular total global con ajuste de cabecera
        grand_total = self._apply_global_adjustment(
            items_subtotal,
            sale.discount_percentage,
            sale.surcharge_percentage,
        )

        # 4. Persistir cabecera
        sale.subtotal = items_subtotal
        sale.total_price = grand_total
        sale.quantity = len(sale_items)
        sale.save()

        if batch:
            batch.notes = f"Venta #{sale.pk}"
            batch.save(update_fields=["notes"])

        # 5. Persistir ítems en dos fases para soportar parent_service_item
        service_items = [si for si in sale_items if si.type == SALE_ITEM_SERVICE]
        supply_items = [si for si in sale_items if si.type == SALE_ITEM_PRODUCT and si.service_id]
        product_items = [si for si in sale_items if si not in service_items and si not in supply_items]

        # Fase A: guardar servicios primero para obtener IDs
        for si in service_items:
            si.save()

        # Mapear Service catalog ID → SaleItem
        service_map = {si.service_id: si for si in service_items if si.service_id}

        # Fase B: guardar insumos vinculados a su servicio padre
        for si in supply_items:
            parent = service_map.get(si.service_id)
            if parent:
                si.parent_service_item = parent
            si.save()

        # Fase C: guardar productos regulares
        for si in product_items:
            si.save()

        return sale

    # ── Item processing ──────────────────────────────────────────────────────

    def _process_items(
        self, sale_instance: Sale, items_data: list[dict], batch: MovementBatch | None = None
    ) -> tuple[list[SaleItem], Decimal]:
        """
        Itera sobre cada ítem del payload, crea SaleItem en memoria y
        descuenta stock cuando corresponde.

        Returns
        -------
        (list[SaleItem], Decimal)  →  (ítems a persistir, subtotal acumulado)
        """
        items_to_create: list[SaleItem] = []
        total_accumulated = Decimal("0.00")

        for item in items_data:
            product: Product | None = item.get("product")
            presentation: ProductPresentation | None = item.get("presentation")
            service = item.get("service")

            quantity = Decimal(str(item["quantity"]))
            discount_pct = int(item.get("discount_percentage", 0))
            surcharge_pct = int(item.get("surcharge_percentage", 0))
            surcharge_reason = item.get("surcharge_reason") or None
            item_type = item.get("type", SALE_ITEM_PRODUCT)

            # ── Resolver precio base ─────────────────────────────────────────
            if presentation:
                base_price = Decimal(str(presentation.price))
            elif product:
                base_price = Decimal(str(product.price))
            elif service:
                base_price = Decimal(str(service.price))
            else:
                base_price = Decimal("0.00")

            subtotal = base_price * quantity
            line_total = self._calculate_total_price(
                base_price, quantity, discount_pct, surcharge_pct
            )

            # ── Descontar stock ──────────────────────────────────────────────
            if product and item_type == SALE_ITEM_PRODUCT:
                product_locked = Product.objects.select_for_update().get(pk=product.pk)
                stock_movement_service.apply(
                    product=product_locked,
                    movement_type=MOVEMENT_OUT,
                    quantity=quantity,
                    presentation=presentation,
                    notes=f"Venta #{sale_instance.pk or 'nueva'}",
                    batch=batch,
                )

            # ── Snapshot de presentación ─────────────────────────────────────
            pres_name = presentation.name if presentation else ""
            pres_price_snap = presentation.price if presentation else base_price
            pres_mult_snap = presentation.multiplier if presentation else Decimal("1.0000")

            sale_item = SaleItem(
                sale=sale_instance,
                product=product,
                presentation=presentation,
                service=service,
                type=item_type,
                # Snapshots históricos
                presentation_name=pres_name,
                presentation_price_snapshot=pres_price_snap,
                presentation_multiplier_snap=pres_mult_snap,
                # Precios
                quantity=quantity,
                price_per_item=base_price,
                subtotal=subtotal,
                total_price=line_total,
                discount_percentage=discount_pct,
                surcharge_percentage=surcharge_pct,
                surcharge_reason=surcharge_reason,
            )

            items_to_create.append(sale_item)

            # -- Skip supplies from total accumulation ---------------------
            if not item.get('is_supply', False):
                total_accumulated += line_total

        return items_to_create, total_accumulated

    # ── Math helpers ─────────────────────────────────────────────────────────

    def _calculate_total_price(
        self,
        unit_price: Decimal,
        qty: Decimal,
        discount_pct: int = 0,
        surcharge_pct: int = 0,
    ) -> Decimal:
        """Calcula el total de línea aplicando descuento o recargo (excluyentes)."""
        subtotal = unit_price * qty
        if discount_pct > 0:
            return subtotal * (1 - Decimal(discount_pct) / 100)
        if surcharge_pct > 0:
            return subtotal * (1 + Decimal(surcharge_pct) / 100)
        return subtotal

    def _apply_global_adjustment(
        self,
        subtotal: Decimal,
        discount_pct: int = 0,
        surcharge_pct: int = 0,
    ) -> Decimal:
        """Aplica el ajuste global al subtotal de la venta."""
        if discount_pct > 0:
            return subtotal * (1 - Decimal(discount_pct) / 100)
        if surcharge_pct > 0:
            return subtotal * (1 + Decimal(surcharge_pct) / 100)
        return subtotal


# ──────────────────────────────────────────────────────────────────────────────
# SaleStatusService — state-machine transitions with side effects
# ──────────────────────────────────────────────────────────────────────────────


class SaleStatusService:
    """
    Orquesta las transiciones de estado de una venta de forma atómica.

    Flujo:
      pending → completed   → opcionalmente crea CashMovement (cash + sesión abierta)
      completed → cancelled → revierte stock, crea InventoryMovement(type=in), egreso en caja
      cancelled             → bloqueado (estado terminal)
    """

    @transaction.atomic
    def transition(self, sale: Sale, target_status: str, user) -> Sale:
        """Ejecuta una transición de estado atómica con side effects."""
        # Bloquear la fila de la venta para evitar transiciones concurrentes
        locked_sale = Sale.objects.select_for_update().get(pk=sale.pk)

        # ── Validar máquina de estados ───────────────────────────────────────
        if locked_sale.status == SAILE_STATUS_CANCELLED:
            raise ValidationError("Terminal state cannot be changed.")
        if target_status not in (SAILE_STATUS_COMPLETED, SAILE_STATUS_CANCELLED):
            raise ValidationError("Invalid status transition.")
        if target_status == locked_sale.status:
            raise ValidationError("Invalid status transition.")

        # ── Ejecutar side effects ────────────────────────────────────────────
        if target_status == SAILE_STATUS_COMPLETED:
            self._complete_sale(locked_sale, user)
        elif target_status == SAILE_STATUS_CANCELLED:
            self._cancel_sale(locked_sale, user)

        # ── Persistir nuevo estado ───────────────────────────────────────────
        locked_sale.status = target_status
        locked_sale.save(update_fields=["status"])
        return locked_sale

    # ── Complete ─────────────────────────────────────────────────────────────

    def _complete_sale(self, sale: Sale, user) -> None:
        """Crea CashMovement si el pago es en efectivo y hay sesión abierta."""
        if sale.payment_type == PAYMENT_CASH and sale.cash_session:
            if sale.cash_session.status != CashSession.STATUS_OPEN:
                raise ValidationError(
                    {"cash_session": "Cash session is not open."}
                )
            self._create_cash_movement(sale, user)

    def _create_cash_movement(self, sale: Sale, user) -> None:
        """Registra un CashMovement de tipo income para una venta completada."""
        CashMovement.objects.create(
            cash_session=sale.cash_session,
            type=CashMovement.TYPE_INCOME,
            amount=sale.total_price,
            reason=f"Sale #{sale.pk} completed",
            created_by=user,
        )

    # ── Cancel ───────────────────────────────────────────────────────────────

    def _cancel_sale(self, sale: Sale, user) -> None:
        """Revierte el stock de cada ítem, crea InventoryMovement(type=in) y registra egreso en caja si aplica."""
        items = list(
            sale.items.select_related("product", "presentation").all()
        )
        for item in items:
            if item.type == SALE_ITEM_PRODUCT:
                self._revert_stock_for_item(item)

        # Registra egreso si fue en efectivo y está asociada a una sesión de caja
        if sale.payment_type == PAYMENT_CASH and sale.cash_session:
            if sale.cash_session.status != CashSession.STATUS_OPEN:
                raise ValidationError(
                    {"cash_session": "Cash session is not open."}
                )
            CashMovement.objects.create(
                cash_session=sale.cash_session,
                type=CashMovement.TYPE_EXPENSE,
                amount=sale.total_price,
                reason=f"Sale #{sale.pk} cancelled",
                created_by=user,
            )

    def _revert_stock_for_item(self, item) -> None:
        """Bloquea el producto, restaura stock usando snapshot_multiplier y audita."""
        from happypet.products.models import Product as ProductModel

        if not item.product:
            raise ValidationError(
                f"Cannot cancel sale: product for item '{item}' was deleted."
            )

        with transaction.atomic():
            product = ProductModel.objects.select_for_update().get(
                pk=item.product.pk
            )

            qty = Decimal(str(item.quantity))
            mult = item.presentation_multiplier_snap or Decimal("1.0000")
            base_units = qty * mult

            previous_stock = product.stock
            new_stock = previous_stock + base_units

            InventoryMovement.objects.create(
                product=product,
                presentation=item.presentation,
                movement_type=MOVEMENT_IN,
                quantity=base_units,
                previous_stock=previous_stock,
                new_stock=new_stock,
                notes=f"Revert from cancelled sale #{item.sale.pk}",
            )

            ProductModel.objects.filter(pk=product.pk).update(stock=new_stock)


# ──────────────────────────────────────────────────────────────────────────────
# PriceCalculator — static math helpers (kept for backwards compatibility)
# ──────────────────────────────────────────────────────────────────────────────


class PriceCalculator:
    """
    Lightweight static helpers for discount/surcharge arithmetic.
    Retained for backwards compatibility with existing test suite.
    """

    @staticmethod
    def calculate_discount(amount: Decimal | int, percentage: int) -> Decimal:
        """Returns the discount amount (not the net price)."""
        amount = Decimal(str(amount))
        return amount * Decimal(percentage) / Decimal("100")

    @staticmethod
    def calculate_net_amount(amount: Decimal | int, percentage: int) -> Decimal:
        """Returns the amount after applying a discount."""
        amount = Decimal(str(amount))
        return amount - PriceCalculator.calculate_discount(amount, percentage)

    @staticmethod
    def calculate_surcharge(
        amount: Decimal | int,
        surcharge_percentage: int,
        discount_percentage: int = 0,
    ) -> Decimal:
        """
        Returns the surcharge amount.
        Returns 0 if a discount is also present (mutually exclusive).
        """
        if discount_percentage > 0:
            return Decimal("0.00")
        amount = Decimal(str(amount))
        return amount * Decimal(surcharge_percentage) / Decimal("100")
