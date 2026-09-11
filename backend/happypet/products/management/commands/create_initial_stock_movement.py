"""
Management command: create_initial_stock_movement
==================================================

Backfills a missing "initial stock" inventory movement for a product whose
``Product.stock`` does not match the net balance of its ``InventoryMovement``
records.

This is useful when products were created with an initial stock value but no
matching ``in`` movement was generated, leaving the movement history incomplete.

Usage::

    python manage.py create_initial_stock_movement --code 035
    python manage.py create_initial_stock_movement --name "VETPRO DERMACARE 50ML"
    python manage.py create_initial_stock_movement --code 035 --dry-run
"""

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum, Q

from happypet.products.models import Product, InventoryMovement, MovementBatch
from happypet.products.constants import MOVEMENT_IN
from happypet.users.models import User


class Command(BaseCommand):
    help = (
        "Creates an IN inventory movement that reconciles Product.stock with "
        "the net balance of existing InventoryMovement records."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--code",
            type=str,
            help="Exact product code to look up.",
        )
        parser.add_argument(
            "--name",
            type=str,
            help="Product name (partial, case-insensitive match).",
        )
        parser.add_argument(
            "--user-id",
            type=int,
            help="User id to record as the creator of the movement batch.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without saving anything.",
        )

    def handle(self, *args, **options):
        code = options.get("code")
        name = options.get("name")
        dry_run = options["dry_run"]
        user_id = options.get("user_id")

        if not code and not name:
            raise CommandError("Provide either --code or --name.")

        product = self._lookup_product(code, name)
        self.stdout.write(f"Product: [{product.code}] {product.name} (id={product.pk})")
        self.stdout.write(f"Current stock: {product.stock}")

        net_movements = self._calculate_net_movements(product)
        self.stdout.write(f"Net movement balance: {net_movements}")

        initial_amount = product.stock - net_movements
        self.stdout.write(f"Missing initial stock movement: {initial_amount}")

        if initial_amount <= 0:
            if initial_amount < 0:
                raise CommandError(
                    f"Negative gap ({initial_amount}). There are more outgoing "
                    "movements than the current stock can justify. Investigate manually."
                )
            self.stdout.write(self.style.SUCCESS("Product stock is already reconciled. No movement created."))
            return

        if dry_run:
            self.stdout.write(
                self.style.NOTICE(
                    f"[DRY-RUN] Would create IN movement of {initial_amount} units "
                    f"(previous_stock=0, new_stock={initial_amount})."
                )
            )
            return

        created_by = self._resolve_created_by(user_id)
        movement = self._create_initial_movement(product, initial_amount, created_by)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created initial stock movement: IN {movement.quantity} units "
                f"(batch_id={movement.batch_id}, movement_id={movement.pk})."
            )
        )

    def _lookup_product(self, code: str | None, name: str | None) -> Product:
        """Resolve a single product by code or name."""
        if code:
            try:
                return Product.objects.get(code=code, deleted_at__isnull=True)
            except Product.DoesNotExist as exc:
                raise CommandError(f"Product with code '{code}' not found.") from exc

        # name lookup (partial, case-insensitive)
        qs = Product.objects.filter(name__icontains=name, deleted_at__isnull=True)
        count = qs.count()
        if count == 0:
            raise CommandError(f"No product found matching name '{name}'.")
        if count > 1:
            matches = "\n".join(f"  - [{p.code}] {p.name} (id={p.pk})" for p in qs)
            raise CommandError(
                f"Multiple products match '{name}'. Use --code with the exact code:\n{matches}"
            )
        return qs.first()

    def _calculate_net_movements(self, product: Product) -> Decimal:
        """Return sum(in) - sum(out) for the product, or 0 if no movements exist."""
        aggregates = InventoryMovement.objects.filter(product=product).aggregate(
            total_in=Sum("quantity", filter=Q(movement_type=MOVEMENT_IN)),
            total_out=Sum("quantity", filter=~Q(movement_type=MOVEMENT_IN)),
        )
        total_in = aggregates["total_in"] or Decimal("0")
        total_out = aggregates["total_out"] or Decimal("0")
        return total_in - total_out

    def _resolve_created_by(self, user_id: int | None) -> User | None:
        """Return the requested user, the first superuser, or None."""
        if user_id:
            try:
                return User.objects.get(pk=user_id, is_active=True)
            except User.DoesNotExist as exc:
                raise CommandError(f"User with id={user_id} not found.") from exc

        return User.objects.filter(is_superuser=True, is_active=True).first()

    def _create_initial_movement(
        self, product: Product, quantity: Decimal, created_by: User | None
    ) -> InventoryMovement:
        """Atomically create the batch and the IN movement without touching Product.stock."""
        with transaction.atomic():
            batch = MovementBatch.objects.create(
                movement_type=MOVEMENT_IN,
                notes=f"Ajuste de stock inicial - [{product.code}] {product.name}",
                created_by=created_by,
            )

            movement = InventoryMovement.objects.create(
                batch=batch,
                product=product,
                presentation=None,
                movement_type=MOVEMENT_IN,
                quantity=quantity,
                previous_stock=Decimal("0"),
                new_stock=quantity,
                notes="Ajuste de stock inicial",
            )

        return movement
