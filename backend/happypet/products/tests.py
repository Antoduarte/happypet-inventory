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
