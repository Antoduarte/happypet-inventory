from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from .services import PriceCalculator
from .models import Sale, SaleItem
from .serializers import CashSessionMiniSerializer, SaleSerializer
from happypet.products.models import Category, Product
from happypet.cash.models import CashRegister, CashSession
from happypet.products.constants import (
    SAILE_STATUS_PENDING,
    PAYMENT_CASH,
    SALE_ITEM_PRODUCT,
)


class PriceCalculatorTests(TestCase):
    def test_calculate_discount_zero_percentage(self):
        amount = Decimal("100.00")
        percentage = 0
        expected_discount = Decimal("0.00")
        self.assertEqual(
            PriceCalculator.calculate_discount(amount, percentage), expected_discount
        )

    def test_calculate_discount_valid_percentage(self):
        amount = Decimal("100.00")
        percentage = 10
        expected_discount = Decimal("10.00")
        self.assertEqual(
            PriceCalculator.calculate_discount(amount, percentage), expected_discount
        )

    def test_calculate_net_amount(self):
        amount = Decimal("100.00")
        percentage = 10
        expected_net_amount = Decimal("90.00")
        self.assertEqual(
            PriceCalculator.calculate_net_amount(amount, percentage),
            expected_net_amount,
        )

    def test_calculate_discount_with_float_conversion(self):
        # Ensure it handles floats by converting to Decimal if passed as such, 
        # but our implementation strictly converts to Decimal.
        # However, passing float to Decimal constructor is safe but might have precision issues. 
        # The service converts inputs to Decimal.
        amount = 100
        percentage = 10
        expected_discount = Decimal("10.00")
        # result will be Decimal('10') or similar. 
        # Decimal(100) * Decimal(10) / Decimal(100) = 10.
        self.assertEqual(
            PriceCalculator.calculate_discount(amount, percentage), 10
        )

    def test_calculate_surcharge_with_discount(self):
        # Surcharge should be 0 if there is a discount
        amount = Decimal("100.00")
        surcharge_percentage = 10
        discount_percentage = 5
        self.assertEqual(
            PriceCalculator.calculate_surcharge(
                amount, surcharge_percentage, discount_percentage
            ),
            Decimal("0.00"),
        )

    def test_calculate_surcharge_no_discount(self):
        # Surcharge should be calculated if there is no discount
        amount = Decimal("100.00")
        surcharge_percentage = 10
        discount_percentage = 0
        expected_surcharge = Decimal("10.00")
        self.assertEqual(
            PriceCalculator.calculate_surcharge(
                amount, surcharge_percentage, discount_percentage
            ),
            expected_surcharge,
        )

    def test_calculate_surcharge_zero_surcharge(self):
        amount = Decimal("100.00")
        surcharge_percentage = 0
        discount_percentage = 0
        self.assertEqual(
            PriceCalculator.calculate_surcharge(
                amount, surcharge_percentage, discount_percentage
            ),
            Decimal("0.00"),
        )


# ──────────────────────────────────────────────────────────────────────────────
# SaleStatusService — state-machine & side-effect tests
# ──────────────────────────────────────────────────────────────────────────────

from django.core.exceptions import ValidationError
from happypet.products.constants import (
    SAILE_STATUS_COMPLETED,
    SAILE_STATUS_CANCELLED,
    PAYMENT_CARD,
)
from happypet.products.models import ProductPresentation, InventoryMovement
from happypet.cash.models import CashMovement
from .services import SaleStatusService

User = get_user_model()


class SaleStatusServiceTests(TestCase):
    """Unit tests for SaleStatusService state-machine logic."""

    def setUp(self):
        self.service = SaleStatusService()
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.user = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )

    def _create_pending_sale(self):
        sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            quantity=1,
        )
        SaleItem.objects.create(
            sale=sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("2.0000"),
            price_per_item=Decimal("25.00"),
            subtotal=Decimal("50.00"),
            total_price=Decimal("50.00"),
        )
        return sale

    # ── Valid transitions ──────────────────────────────────────────────────

    def test_pending_to_completed(self):
        sale = self._create_pending_sale()
        result = self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)
        self.assertEqual(result.status, SAILE_STATUS_COMPLETED)

    def test_pending_to_cancelled(self):
        sale = self._create_pending_sale()
        result = self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)
        self.assertEqual(result.status, SAILE_STATUS_CANCELLED)

    # ── Invalid / terminal transitions ─────────────────────────────────────

    def test_completed_to_cancelled_raises(self):
        sale = self._create_pending_sale()
        sale.status = SAILE_STATUS_COMPLETED
        sale.save()
        with self.assertRaisesMessage(ValidationError, "Terminal state cannot be changed."):
            self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)

    def test_cancelled_to_any_raises(self):
        sale = self._create_pending_sale()
        sale.status = SAILE_STATUS_CANCELLED
        sale.save()
        with self.assertRaisesMessage(ValidationError, "Terminal state cannot be changed."):
            self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)

    def test_same_status_raises(self):
        sale = self._create_pending_sale()
        with self.assertRaisesMessage(ValidationError, "Invalid status transition."):
            self.service.transition(sale, SAILE_STATUS_PENDING, self.user)

    def test_invalid_target_status_raises(self):
        sale = self._create_pending_sale()
        with self.assertRaisesMessage(ValidationError, "Invalid status transition."):
            self.service.transition(sale, "invalid", self.user)


class StockRevertTests(TestCase):
    """Tests for stock reversion on cancel."""

    def setUp(self):
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.presentation = ProductPresentation.objects.create(
            product=self.product,
            name="Box of 5",
            multiplier=Decimal("5.0000"),
            price=Decimal("10.00"),
        )
        self.user = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.service = SaleStatusService()

    def _create_sale_with_presentation(self):
        sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("20.00"),
            subtotal=Decimal("20.00"),
            quantity=1,
        )
        SaleItem.objects.create(
            sale=sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            presentation=self.presentation,
            presentation_name=self.presentation.name,
            presentation_price_snapshot=self.presentation.price,
            presentation_multiplier_snap=self.presentation.multiplier,
            quantity=Decimal("2.0000"),
            price_per_item=Decimal("10.00"),
            subtotal=Decimal("20.00"),
            total_price=Decimal("20.00"),
        )
        return sale

    def _create_sale_without_presentation(self):
        sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("30.00"),
            subtotal=Decimal("30.00"),
            quantity=1,
        )
        SaleItem.objects.create(
            sale=sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("3.0000"),
            price_per_item=Decimal("10.00"),
            subtotal=Decimal("30.00"),
            total_price=Decimal("30.00"),
        )
        return sale

    def test_cancel_reverts_stock_with_multiplier(self):
        sale = self._create_sale_with_presentation()
        self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)
        self.product.refresh_from_db()
        # 100 + (2 * 5) = 110
        self.assertEqual(self.product.stock, Decimal("110.0000"))

    def test_cancel_reverts_stock_without_multiplier(self):
        sale = self._create_sale_without_presentation()
        self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)
        self.product.refresh_from_db()
        # 100 + 3 = 103
        self.assertEqual(self.product.stock, Decimal("103.0000"))

    def test_cancel_creates_inventory_movement_in(self):
        sale = self._create_sale_with_presentation()
        self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)
        movement = InventoryMovement.objects.filter(
            product=self.product, movement_type="in"
        ).latest("movement_date")
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, Decimal("10.0000"))
        self.assertEqual(movement.previous_stock, Decimal("100.0000"))
        self.assertEqual(movement.new_stock, Decimal("110.0000"))

    def test_cancel_missing_product_raises(self):
        sale = self._create_sale_with_presentation()
        # Delete the product to simulate SET_NULL
        item = sale.items.first()
        item.product = None
        item.save()
        with self.assertRaisesMessage(ValidationError, "Cannot cancel sale"):
            self.service.transition(sale, SAILE_STATUS_CANCELLED, self.user)


class CashMovementTests(TestCase):
    """Tests for CashMovement creation on complete."""

    def setUp(self):
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.user = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.register = CashRegister.objects.create(name="Main Register")
        self.session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )
        self.service = SaleStatusService()

    def _create_sale(self, payment_type=PAYMENT_CASH, cash_session=None):
        sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=payment_type,
            total_price=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            quantity=1,
            cash_session=cash_session,
        )
        SaleItem.objects.create(
            sale=sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("1.0000"),
            price_per_item=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            total_price=Decimal("50.00"),
        )
        return sale

    def test_complete_cash_with_open_session_creates_movement(self):
        sale = self._create_sale(cash_session=self.session)
        self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)
        movement = CashMovement.objects.filter(cash_session=self.session).first()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.type, CashMovement.TYPE_INCOME)
        self.assertEqual(movement.amount, Decimal("50.00"))
        self.assertEqual(movement.created_by, self.user)

    def test_complete_card_does_not_create_movement(self):
        sale = self._create_sale(payment_type=PAYMENT_CARD, cash_session=self.session)
        self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)
        self.assertEqual(CashMovement.objects.filter(cash_session=self.session).count(), 0)

    def test_complete_cash_with_closed_session_raises(self):
        self.session.status = CashSession.STATUS_CLOSED
        self.session.save()
        sale = self._create_sale(cash_session=self.session)
        with self.assertRaisesMessage(ValidationError, "Cash session is not open."):
            self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)

    def test_complete_cash_without_session_does_not_create_movement(self):
        sale = self._create_sale(payment_type=PAYMENT_CASH, cash_session=None)
        self.service.transition(sale, SAILE_STATUS_COMPLETED, self.user)
        self.assertEqual(CashMovement.objects.count(), 0)


class SaleStatusPermissionTests(APITestCase):
    """Integration tests for PATCH endpoint permissions."""

    def setUp(self):
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            quantity=1,
        )
        SaleItem.objects.create(
            sale=self.sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("1.0000"),
            price_per_item=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            total_price=Decimal("50.00"),
        )

    def _create_user(self, email, role):
        return User.objects.create_user(email=email, password="testpass", role=role)

    def _authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_transition(self):
        user = self._create_user("admin@test.com", "admin")
        self._authenticate(user)
        response = self.client.patch(
            f"/api/sales/{self.sale.id}/", {"status": "completed"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "completed")

    def test_manager_can_transition(self):
        user = self._create_user("manager@test.com", "manager")
        self._authenticate(user)
        response = self.client.patch(
            f"/api/sales/{self.sale.id}/", {"status": "completed"}
        )
        self.assertEqual(response.status_code, 200)

    def test_cashier_can_transition(self):
        user = self._create_user("cashier@test.com", "cashier")
        self._authenticate(user)
        response = self.client.patch(
            f"/api/sales/{self.sale.id}/", {"status": "completed"}
        )
        self.assertEqual(response.status_code, 200)

    def test_vendor_gets_403(self):
        user = self._create_user("vendor@test.com", "vendor")
        self._authenticate(user)
        response = self.client.patch(
            f"/api/sales/{self.sale.id}/", {"status": "completed"}
        )
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_gets_401(self):
        response = self.client.patch(
            f"/api/sales/{self.sale.id}/", {"status": "completed"}
        )
        self.assertEqual(response.status_code, 401)


# ──────────────────────────────────────────────────────────────────────────────
# CashSessionMiniSerializer tests
# ──────────────────────────────────────────────────────────────────────────────

class CashSessionMiniSerializerTests(TestCase):
    """Unit tests for CashSessionMiniSerializer output shape."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.register = CashRegister.objects.create(name="Main Register")
        self.session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

    def test_serializer_outputs_expected_fields(self):
        serializer = CashSessionMiniSerializer(instance=self.session)
        data = serializer.data
        self.assertEqual(data["id"], self.session.id)
        self.assertEqual(data["register_name"], "Main Register")
        self.assertIn("opened_at", data)
        self.assertEqual(data["status"], "open")

    def test_register_name_resolves_from_cash_register(self):
        serializer = CashSessionMiniSerializer(instance=self.session)
        self.assertEqual(serializer.data["register_name"], self.register.name)


# ──────────────────────────────────────────────────────────────────────────────
# SaleViewSet retrieve optimization tests
# ──────────────────────────────────────────────────────────────────────────────

class SaleRetrieveTests(APITestCase):
    """Integration tests for GET /api/sales/{id}/ with nested cash_session."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin"
        )
        self.client.force_authenticate(user=self.user)
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.register = CashRegister.objects.create(name="Caja Principal")
        self.session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )
        self.sale = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            quantity=1,
            cash_session=self.session,
        )
        SaleItem.objects.create(
            sale=self.sale,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("1.0000"),
            price_per_item=Decimal("50.00"),
            subtotal=Decimal("50.00"),
            total_price=Decimal("50.00"),
        )

    def test_retrieve_returns_nested_cash_session(self):
        response = self.client.get(f"/api/sales/{self.sale.id}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("cash_session", data)
        self.assertEqual(data["cash_session"]["id"], self.session.id)
        self.assertEqual(data["cash_session"]["register_name"], "Caja Principal")
        self.assertIn("opened_at", data["cash_session"])
        self.assertEqual(data["cash_session"]["status"], "open")

    def test_retrieve_no_extra_queries_for_cash_session(self):
        with self.assertNumQueries(5):
            # 1) Sale + cash_session + cash_register (select_related)
            # 2) items
            # 3) items__product
            # 4) product.category (via ProductSerializer)
            # 5) items.presentation (via ProductPresentationSerializer)
            response = self.client.get(f"/api/sales/{self.sale.id}/")
        self.assertEqual(response.status_code, 200)

    def test_retrieve_sale_without_session(self):
        sale_no_session = Sale.objects.create(
            status=SAILE_STATUS_PENDING,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("30.00"),
            subtotal=Decimal("30.00"),
            quantity=1,
            cash_session=None,
        )
        SaleItem.objects.create(
            sale=sale_no_session,
            type=SALE_ITEM_PRODUCT,
            product=self.product,
            quantity=Decimal("1.0000"),
            price_per_item=Decimal("30.00"),
            subtotal=Decimal("30.00"),
            total_price=Decimal("30.00"),
        )
        response = self.client.get(f"/api/sales/{sale_no_session.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["cash_session"])

# ──────────────────────────────────────────────────────────────────────────────
# SaleService creation tests
# ──────────────────────────────────────────────────────────────────────────────

from happypet.products.models import MovementBatch
from .services import SaleService

class SaleCreationInventoryMovementTests(TestCase):
    """Tests that creating a sale generates MovementBatch and InventoryMovement records."""

    def setUp(self):
        self.category = Category.objects.create(name="Test Cat", type="product")
        self.product = Product.objects.create(
            name="Test Product",
            category=self.category,
            stock=Decimal("100.0000"),
            base_unit="u",
        )
        self.presentation = ProductPresentation.objects.create(
            product=self.product,
            name="Box of 5",
            multiplier=Decimal("5.0000"),
            price=Decimal("10.00"),
        )
        self.service = SaleService()

    def test_create_sale_without_presentation_creates_batch_and_movement(self):
        sale_data = {
            "payment_type": PAYMENT_CASH,
            "items": [
                {
                    "product": self.product,
                    "type": SALE_ITEM_PRODUCT,
                    "quantity": 2,
                    "price_per_item": 10,
                }
            ]
        }
        sale = self.service.create_sale(sale_data)
        
        # Check stock deducted
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, Decimal("98.0000"))
        
        # Check MovementBatch created
        batch = MovementBatch.objects.latest("created_at")
        self.assertEqual(batch.movement_type, "out")
        self.assertIn(f"Venta #{sale.pk}", batch.notes)
        
        # Check InventoryMovement created and linked
        movement = InventoryMovement.objects.get(batch=batch)
        self.assertEqual(movement.product, self.product)
        self.assertEqual(movement.quantity, Decimal("2.0000"))
        self.assertEqual(movement.previous_stock, Decimal("100.0000"))
        self.assertEqual(movement.new_stock, Decimal("98.0000"))

    def test_create_sale_with_presentation_creates_batch_and_movement(self):
        sale_data = {
            "payment_type": PAYMENT_CASH,
            "items": [
                {
                    "product": self.product,
                    "presentation": self.presentation,
                    "type": SALE_ITEM_PRODUCT,
                    "quantity": 2,
                    "price_per_item": 10,
                }
            ]
        }
        sale = self.service.create_sale(sale_data)
        
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, Decimal("90.0000"))
        
        batch = MovementBatch.objects.latest("created_at")
        movement = InventoryMovement.objects.get(batch=batch)
        self.assertEqual(movement.quantity, Decimal("10.0000"))
        self.assertEqual(movement.previous_stock, Decimal("100.0000"))
        self.assertEqual(movement.new_stock, Decimal("90.0000"))


# ──────────────────────────────────────────────────────────────────────────────
# SaleItemCreateSerializer — product role coherence (sale vs supply)
# ──────────────────────────────────────────────────────────────────────────────

from .serializers import SaleItemCreateSerializer


class ProductRoleCoherenceTests(TestCase):
    """A product must match the section it is used in (sale vs service supply)."""

    def setUp(self):
        self.category = Category.objects.create(name="Cat", type="product")
        self.sale_only = Product.objects.create(
            name="Solo venta", category=self.category, stock=Decimal("100.0000"),
            base_unit="u", is_sale_product=True, is_service_supply=False,
        )
        self.supply_only = Product.objects.create(
            name="Solo insumo", category=self.category, stock=Decimal("100.0000"),
            base_unit="u", is_sale_product=False, is_service_supply=True,
        )
        self.both = Product.objects.create(
            name="Ambos", category=self.category, stock=Decimal("100.0000"),
            base_unit="u", is_sale_product=True, is_service_supply=True,
        )

    def _item(self, product, is_supply):
        return SaleItemCreateSerializer(data={
            "product_id": product.id, "type": SALE_ITEM_PRODUCT,
            "is_supply": is_supply, "quantity": "1",
        })

    def test_sale_only_as_direct_sale_ok(self):
        self.assertTrue(self._item(self.sale_only, is_supply=False).is_valid())

    def test_sale_only_as_supply_rejected(self):
        s = self._item(self.sale_only, is_supply=True)
        self.assertFalse(s.is_valid())

    def test_supply_only_as_supply_ok(self):
        self.assertTrue(self._item(self.supply_only, is_supply=True).is_valid())

    def test_supply_only_as_direct_sale_rejected(self):
        s = self._item(self.supply_only, is_supply=False)
        self.assertFalse(s.is_valid())

    def test_both_valid_in_either_section(self):
        self.assertTrue(self._item(self.both, is_supply=False).is_valid())
        self.assertTrue(self._item(self.both, is_supply=True).is_valid())

