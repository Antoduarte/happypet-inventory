from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from happypet.cash.models import CashRegister, CashSession
from happypet.products.models import (
    Category,
    InventoryMovement,
    MovementBatch,
    Product,
)
from happypet.products.constants import MOVEMENT_IN

User = get_user_model()


class MovementBatchRoleFilterTests(APITestCase):
    """Integration tests for GET /api/movement-batches/ role-based filtering."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.cashier_a = User.objects.create_user(
            email="ana@test.com", password="testpass", role="cashier"
        )
        self.cashier_b = User.objects.create_user(
            email="beto@test.com", password="testpass", role="cashier"
        )

        self.batch_a = MovementBatch.objects.create(
            movement_type=MOVEMENT_IN,
            notes="Batch A",
            created_by=self.cashier_a,
        )
        self.batch_b = MovementBatch.objects.create(
            movement_type=MOVEMENT_IN,
            notes="Batch B",
            created_by=self.cashier_b,
        )
        self.batch_admin = MovementBatch.objects.create(
            movement_type=MOVEMENT_IN,
            notes="Batch admin",
            created_by=self.admin,
        )

    def test_admin_sees_all_batches(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/movement-batches/")
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {self.batch_a.id, self.batch_b.id, self.batch_admin.id})

    def test_cashier_sees_only_own_batches(self):
        self.client.force_authenticate(user=self.cashier_a)
        response = self.client.get("/api/movement-batches/")
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {self.batch_a.id})


class InventoryMovementRoleFilterTests(APITestCase):
    """Integration tests for GET /api/inventory-movements/ role-based filtering."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.cashier_a = User.objects.create_user(
            email="ana@test.com", password="testpass", role="cashier"
        )
        self.cashier_b = User.objects.create_user(
            email="beto@test.com", password="testpass", role="cashier"
        )

        category = Category.objects.create(name="Test Cat", type="product")
        product = Product.objects.create(
            name="Test Product",
            category=category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )

        self.batch_a = MovementBatch.objects.create(
            movement_type=MOVEMENT_IN,
            notes="Batch A",
            created_by=self.cashier_a,
        )
        self.batch_b = MovementBatch.objects.create(
            movement_type=MOVEMENT_IN,
            notes="Batch B",
            created_by=self.cashier_b,
        )

        self.movement_a = InventoryMovement.objects.create(
            batch=self.batch_a,
            product=product,
            movement_type=MOVEMENT_IN,
            quantity=Decimal("5.0000"),
            previous_stock=Decimal("100.0000"),
            new_stock=Decimal("105.0000"),
        )
        self.movement_b = InventoryMovement.objects.create(
            batch=self.batch_b,
            product=product,
            movement_type=MOVEMENT_IN,
            quantity=Decimal("3.0000"),
            previous_stock=Decimal("105.0000"),
            new_stock=Decimal("108.0000"),
        )

    def test_admin_sees_all_movements(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/inventory-movements/")
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {self.movement_a.id, self.movement_b.id})

    def test_cashier_sees_only_own_movements(self):
        self.client.force_authenticate(user=self.cashier_a)
        response = self.client.get("/api/inventory-movements/")
        self.assertEqual(response.status_code, 200)
        ids = {row["id"] for row in response.json()["results"]}
        self.assertEqual(ids, {self.movement_a.id})


class ProductInitialStockMovementTests(APITestCase):
    """
    Tests that creating a Product with stock > 0 generates the matching
    IN inventory movement, keeping the audit trail complete from day one.
    """

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.category = Category.objects.create(name="Test Cat", type="product")

    def test_create_product_with_stock_creates_initial_in_movement(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Product With Stock",
            "code": "PWS001",
            "category_id": self.category.id,
            "price": "10.00",
            "stock": "15.0000",
            "base_unit": "u",
            "is_sale_product": True,
            "is_service_supply": False,
        }

        response = self.client.post("/api/products/", payload, format="json")
        self.assertEqual(response.status_code, 201)

        product = Product.objects.get(code="PWS001")
        self.assertEqual(product.stock, Decimal("15.0000"))

        movements = InventoryMovement.objects.filter(product=product)
        self.assertEqual(movements.count(), 1)

        movement = movements.first()
        self.assertEqual(movement.movement_type, MOVEMENT_IN)
        self.assertEqual(movement.quantity, Decimal("15.0000"))
        self.assertEqual(movement.previous_stock, Decimal("0"))
        self.assertEqual(movement.new_stock, Decimal("15.0000"))
        self.assertIn("Stock inicial", movement.notes)

    def test_create_product_with_zero_stock_does_not_create_movement(self):
        self.client.force_authenticate(user=self.admin)
        payload = {
            "name": "Product Without Stock",
            "code": "PWS000",
            "category_id": self.category.id,
            "price": "10.00",
            "stock": "0.0000",
            "base_unit": "u",
            "is_sale_product": True,
            "is_service_supply": False,
        }

        response = self.client.post("/api/products/", payload, format="json")
        self.assertEqual(response.status_code, 201)

        product = Product.objects.get(code="PWS000")
        self.assertEqual(InventoryMovement.objects.filter(product=product).count(), 0)


class CreateInitialStockMovementCommandTests(APITestCase):
    """Tests for the create_initial_stock_movement management command."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.category = Category.objects.create(name="Test Cat", type="product")

    def _create_product(self, code: str, stock: str) -> Product:
        return Product.objects.create(
            name=f"Product {code}",
            code=code,
            category=self.category,
            stock=Decimal(stock),
            base_unit="u",
        )

    def test_command_creates_missing_initial_movement(self):
        product = self._create_product("GAP001", "5.0000")
        # No movements yet: missing = 5

        from django.core.management import call_command

        call_command("create_initial_stock_movement", code="GAP001")

        movement = InventoryMovement.objects.filter(product=product).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.movement_type, MOVEMENT_IN)
        self.assertEqual(movement.quantity, Decimal("5.0000"))
        self.assertEqual(movement.previous_stock, Decimal("0"))
        self.assertEqual(movement.new_stock, Decimal("5.0000"))

    def test_command_does_nothing_when_already_reconciled(self):
        product = self._create_product("GAP002", "0.0000")

        from django.core.management import call_command

        call_command("create_initial_stock_movement", code="GAP002")

        self.assertEqual(InventoryMovement.objects.filter(product=product).count(), 0)

    def test_dry_run_does_not_create_movement(self):
        product = self._create_product("GAP003", "7.0000")

        from django.core.management import call_command

        call_command("create_initial_stock_movement", code="GAP003", dry_run=True)

        self.assertEqual(InventoryMovement.objects.filter(product=product).count(), 0)

    def test_command_fails_when_existing_movements_exceed_stock(self):
        product = self._create_product("GAP004", "1.0000")
        batch = MovementBatch.objects.create(movement_type=MOVEMENT_IN, notes="Manual entry")
        InventoryMovement.objects.create(
            batch=batch,
            product=product,
            movement_type=MOVEMENT_IN,
            quantity=Decimal("5.0000"),
            previous_stock=Decimal("0"),
            new_stock=Decimal("5.0000"),
        )
        # product.stock = 1 but recorded movements say +5 => missing = -4

        from django.core.management import CommandError
        from django.core.management import call_command

        with self.assertRaises(CommandError):
            call_command("create_initial_stock_movement", code="GAP004")

    def test_command_fails_without_code_or_name(self):
        from django.core.management import CommandError
        from django.core.management import call_command

        with self.assertRaises(CommandError):
            call_command("create_initial_stock_movement")
