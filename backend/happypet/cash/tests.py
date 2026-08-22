from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from happypet.cash.models import CashRegister, CashSession, CashMovement, GeneralMovement
from happypet.sales.models import Sale
from happypet.products.constants import (
    PAYMENT_CASH,
    PAYMENT_CARD,
    PAYMENT_MIXED,
    SAILE_STATUS_COMPLETED,
    SAILE_STATUS_CANCELLED,
)

User = get_user_model()


class CashSessionServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123",
            role="cashier",
        )
        self.register = CashRegister.objects.create(
            name="Caja Test",
            branch="Test Branch",
            is_active=True,
        )

    def test_open_session_creates_new_session(self):
        """Opening a new session should create it with status open."""
        from happypet.cash.services import CashSessionService

        session = CashSessionService.open_session(
            cash_register_id=self.register.pk,
            user_id=self.user.pk,
            opening_amount=Decimal("100.00"),
        )

        self.assertEqual(session.status, CashSession.STATUS_OPEN)
        self.assertEqual(session.opening_amount, Decimal("100.00"))
        self.assertEqual(session.user, self.user)

    def test_open_session_closes_old_session_from_another_day(self):
        """Opening a session when there's an open one from another day should auto-close the old one."""
        from happypet.cash.services import CashSessionService

        yesterday = timezone.now() - timedelta(days=1)
        old_session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("50.00"),
            status=CashSession.STATUS_OPEN,
        )
        CashSession.objects.filter(pk=old_session.pk).update(opened_at=yesterday)
        old_session.refresh_from_db()

        new_session = CashSessionService.open_session(
            cash_register_id=self.register.pk,
            user_id=self.user.pk,
            opening_amount=Decimal("100.00"),
        )

        old_session.refresh_from_db()
        self.assertEqual(old_session.status, CashSession.STATUS_CLOSED)
        self.assertIsNotNone(old_session.closed_at)
        self.assertEqual(new_session.status, CashSession.STATUS_OPEN)
        self.assertEqual(new_session.opening_amount, Decimal("100.00"))

    def test_open_session_allows_same_day_reopen_after_suspend(self):
        """Opening a session when there's a suspended one from today should work."""
        from happypet.cash.services import CashSessionService

        CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("50.00"),
            status=CashSession.STATUS_SUSPENDED,
            opened_at=timezone.now(),
            counted_amount=Decimal("60.00"),
            difference=Decimal("10.00"),
            suspended_at=timezone.now(),
        )

        new_session = CashSessionService.open_session(
            cash_register_id=self.register.pk,
            user_id=self.user.pk,
            opening_amount=Decimal("100.00"),
        )

        self.assertEqual(new_session.status, CashSession.STATUS_OPEN)

    def test_open_session_raises_when_open_from_same_day_exists(self):
        """Opening should fail if there's already an open session from today."""
        from happypet.cash.services import CashSessionService

        CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("50.00"),
            status=CashSession.STATUS_OPEN,
        )

        with self.assertRaises(ValueError) as ctx:
            CashSessionService.open_session(
                cash_register_id=self.register.pk,
                user_id=self.user.pk,
                opening_amount=Decimal("100.00"),
            )
        self.assertIn("already an open session", str(ctx.exception))

    def test_close_session_sets_suspended(self):
        """Closing a session should set status to suspended, not closed."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

        closed = CashSessionService.close_session(
            session_id=session.pk,
            counted_amount=Decimal("120.00"),
            notes="Test close",
        )

        self.assertEqual(closed.status, CashSession.STATUS_SUSPENDED)
        self.assertEqual(closed.counted_amount, Decimal("120.00"))
        self.assertIsNotNone(closed.suspended_at)
        self.assertIsNone(closed.closed_at)

    def test_resume_session_reopens_suspended(self):
        """Resuming a suspended session should set it back to open."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_SUSPENDED,
            counted_amount=Decimal("120.00"),
            difference=Decimal("20.00"),
            suspended_at=timezone.now(),
        )

        resumed = CashSessionService.resume_session(session.pk)

        self.assertEqual(resumed.status, CashSession.STATUS_OPEN)
        self.assertIsNone(resumed.suspended_at)

    def test_resume_session_fails_for_open(self):
        """Resuming an open session should raise an error."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

        with self.assertRaises(ValueError) as ctx:
            CashSessionService.resume_session(session.pk)
        self.assertIn("Only suspended", str(ctx.exception))

    def test_final_close_session_closes_suspended(self):
        """Final closing a suspended session should set status to closed."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_SUSPENDED,
            counted_amount=Decimal("120.00"),
            difference=Decimal("20.00"),
            suspended_at=timezone.now(),
        )

        final = CashSessionService.final_close_session(session.pk)

        self.assertEqual(final.status, CashSession.STATUS_CLOSED)
        self.assertIsNotNone(final.closed_at)

    def test_final_close_session_fails_for_open(self):
        """Final closing an open session should raise an error."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

        with self.assertRaises(ValueError) as ctx:
            CashSessionService.final_close_session(session.pk)
        self.assertIn("Only suspended", str(ctx.exception))

    def test_close_session_fails_for_already_suspended(self):
        """Closing an already suspended session should raise an error."""
        from happypet.cash.services import CashSessionService

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_SUSPENDED,
            counted_amount=Decimal("120.00"),
            suspended_at=timezone.now(),
        )

        with self.assertRaises(ValueError) as ctx:
            CashSessionService.close_session(
                session_id=session.pk,
                counted_amount=Decimal("130.00"),
            )
        self.assertIn("already suspended", str(ctx.exception))


class CashSessionActiveEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="test@example.com",
            name="Test User",
            password="testpass123",
            role="cashier",
        )
        self.register = CashRegister.objects.create(
            name="Caja Test",
            is_active=True,
        )

    def test_active_returns_open_session_from_today(self):
        """Active endpoint should return open session from today."""
        from rest_framework.test import APIClient
        from rest_framework import status

        CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get("/api/cash-sessions/active/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.json()["id"])
        self.assertEqual(response.json()["status"], "open")

    def test_active_returns_suspended_session_from_today(self):
        """Active endpoint should return suspended session from today."""
        from rest_framework.test import APIClient
        from rest_framework import status

        CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_SUSPENDED,
            suspended_at=timezone.now(),
        )

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get("/api/cash-sessions/active/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["status"], "suspended")

    def test_active_ignores_open_session_from_another_day(self):
        """Active endpoint should NOT return open session from another day."""
        from rest_framework.test import APIClient
        from rest_framework import status

        yesterday = timezone.now() - timedelta(days=1)
        old_session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )
        CashSession.objects.filter(pk=old_session.pk).update(opened_at=yesterday)

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get("/api/cash-sessions/active/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["id"])

    def test_active_returns_null_when_no_session(self):
        """Active endpoint should return null id when no session exists."""
        from rest_framework.test import APIClient
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.user)
        response = client.get("/api/cash-sessions/active/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.json()["id"])


class GeneralMovementPermissionTests(TestCase):
    """Integration tests for GeneralMovement permissions and soft delete."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="testpass",
            role="admin",
        )
        self.manager = User.objects.create_user(
            email="manager@test.com",
            password="testpass",
            role="manager",
        )
        self.cashier = User.objects.create_user(
            email="cashier@test.com",
            password="testpass",
            role="cashier",
        )
        self.accountant = User.objects.create_user(
            email="accountant@test.com",
            password="testpass",
            role="accountant",
        )

    def _payload(self):
        return {
            "type": GeneralMovement.TYPE_EXPENSE,
            "name": "Pago proveedor",
            "description": "Pago de alimento",
            "amount": "150.00",
            "date": "2026-08-10",
            "payment_method": GeneralMovement.PAYMENT_CASH,
        }

    def test_admin_can_create(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.post("/api/general-movements/", self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["created_by_name"], self.admin.name)

    def test_manager_cannot_create(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.manager)
        response = client.post("/api/general-movements/", self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cashier_cannot_access(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.cashier)
        response = client.get("/api/general-movements/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_accountant_can_list_and_retrieve(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        movement = GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_INCOME,
            name="Ingreso varios",
            amount=Decimal("100.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_TRANSFER,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.accountant)

        list_response = client.get("/api/general-movements/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.json()["results"]), 1)

        detail_response = client.get(f"/api/general-movements/{movement.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.json()["name"], "Ingreso varios")

    def test_accountant_cannot_create(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.accountant)
        response = client.post("/api/general-movements/", self._payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_list_and_retrieve(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        movement = GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_INCOME,
            name="Ingreso varios",
            amount=Decimal("100.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_TRANSFER,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.manager)

        list_response = client.get("/api/general-movements/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.json()["results"]), 1)

        detail_response = client.get(f"/api/general-movements/{movement.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.json()["name"], "Ingreso varios")

    def test_admin_can_update(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        movement = GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_EXPENSE,
            name="Pago inicial",
            amount=Decimal("50.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_CASH,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.patch(
            f"/api/general-movements/{movement.id}/",
            {"name": "Pago actualizado"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        movement.refresh_from_db()
        self.assertEqual(movement.name, "Pago actualizado")

    def test_manager_cannot_update(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        movement = GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_EXPENSE,
            name="Pago inicial",
            amount=Decimal("50.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_CASH,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.manager)
        response = client.patch(
            f"/api/general-movements/{movement.id}/",
            {"name": "Pago actualizado"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_soft_delete(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        movement = GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_EXPENSE,
            name="Pago a eliminar",
            amount=Decimal("75.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_CARD,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.delete(f"/api/general-movements/{movement.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        movement.refresh_from_db()
        self.assertFalse(movement.is_active)
        self.assertIsNotNone(movement.deleted_at)

    def test_deleted_movement_not_listed(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_EXPENSE,
            name="Pago eliminado",
            amount=Decimal("30.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_CASH,
            created_by=self.admin,
            is_active=False,
            deleted_at=timezone.now(),
        )

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.get("/api/general-movements/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 0)

    def test_filter_by_type(self):
        from rest_framework.test import APIClient
        from rest_framework import status

        GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_INCOME,
            name="Ingreso 1",
            amount=Decimal("100.00"),
            date="2026-08-01",
            payment_method=GeneralMovement.PAYMENT_CASH,
            created_by=self.admin,
        )
        GeneralMovement.objects.create(
            type=GeneralMovement.TYPE_EXPENSE,
            name="Egreso 1",
            amount=Decimal("50.00"),
            date="2026-08-02",
            payment_method=GeneralMovement.PAYMENT_TRANSFER,
            created_by=self.admin,
        )

        client = APIClient()
        client.force_authenticate(user=self.admin)
        response = client.get("/api/general-movements/?type=income")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)
        self.assertEqual(response.json()["results"][0]["type"], GeneralMovement.TYPE_INCOME)


class CashSessionMixedPaymentTests(TestCase):
    """Tests that mixed-payment cash portions affect the expected box balance."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@test.com",
            password="testpass",
            role="admin",
            name="Admin",
        )
        self.register = CashRegister.objects.create(name="Main Register")
        self.session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )

    def _make_mixed_sale(self, status=SAILE_STATUS_COMPLETED):
        sale = Sale.objects.create(
            status=status,
            payment_type=PAYMENT_MIXED,
            total_price=Decimal("240.00"),
            subtotal=Decimal("240.00"),
            quantity=1,
            cash_session=self.session,
            payment_split=[
                {"method": PAYMENT_CASH, "amount": "120.00"},
                {"method": PAYMENT_CARD, "amount": "120.00"},
            ],
        )
        return sale

    def test_expected_amount_includes_only_cash_portion_of_mixed_sale(self):
        from happypet.cash.services import CashSessionService

        self._make_mixed_sale()
        expected = CashSessionService._calculate_expected_amount(self.session)
        # Opening 100 + cash portion 120; card portion does not enter the box.
        self.assertEqual(expected, Decimal("220.00"))

    def test_cancelled_mixed_sale_does_not_affect_expected_amount(self):
        from happypet.cash.services import CashSessionService

        self._make_mixed_sale(status=SAILE_STATUS_CANCELLED)
        expected = CashSessionService._calculate_expected_amount(self.session)
        self.assertEqual(expected, Decimal("100.00"))

    def test_cash_session_report_redistributes_mixed_payment(self):
        from happypet.cash.serializers import CashSessionReportSerializer

        self._make_mixed_sale()
        serializer = CashSessionReportSerializer(self.session)
        data = serializer.data
        self.assertEqual(data["cash_sales_total"], Decimal("120.00"))
        self.assertEqual(data["card_sales_total"], Decimal("120.00"))
        self.assertEqual(data["transfer_sales_total"], Decimal("0.00"))
        self.assertEqual(data["sales_total"], Decimal("240.00"))


class GeneralMovementSummaryTests(TestCase):
    """Tests for the aggregated summary endpoint of general movements."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="testpass",
            role="admin",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def _create(self, movement_type, amount, date, payment_method):
        return GeneralMovement.objects.create(
            type=movement_type,
            name=f"{movement_type}-{amount}",
            amount=Decimal(amount),
            date=date,
            payment_method=payment_method,
            created_by=self.admin,
        )

    def test_summary_aggregates_totals_balance_and_count(self):
        from rest_framework import status

        self._create(GeneralMovement.TYPE_INCOME, "500.00", "2026-08-01", GeneralMovement.PAYMENT_CASH)
        self._create(GeneralMovement.TYPE_INCOME, "300.00", "2026-08-02", GeneralMovement.PAYMENT_CARD)
        self._create(GeneralMovement.TYPE_EXPENSE, "200.00", "2026-08-03", GeneralMovement.PAYMENT_TRANSFER)

        response = self.client.get("/api/general-movements/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_income"], "800.00")
        self.assertEqual(data["total_expense"], "200.00")
        self.assertEqual(data["balance"], "600.00")
        self.assertEqual(data["count"], 3)

    def test_summary_breaks_down_by_payment_method(self):
        from rest_framework import status

        self._create(GeneralMovement.TYPE_INCOME, "100.00", "2026-08-01", GeneralMovement.PAYMENT_CASH)
        self._create(GeneralMovement.TYPE_INCOME, "50.00", "2026-08-02", GeneralMovement.PAYMENT_CARD)

        response = self.client.get("/api/general-movements/summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_payment = {row["type"]: row["total"] for row in response.json()["by_payment"]}
        self.assertEqual(by_payment["cash"], "100.00")
        self.assertEqual(by_payment["card"], "50.00")
        self.assertEqual(by_payment["transfer"], "0.00")

    def test_summary_respects_filters(self):
        from rest_framework import status

        self._create(GeneralMovement.TYPE_INCOME, "100.00", "2026-08-01", GeneralMovement.PAYMENT_CASH)
        self._create(GeneralMovement.TYPE_EXPENSE, "75.00", "2026-08-05", GeneralMovement.PAYMENT_CASH)
        self._create(GeneralMovement.TYPE_EXPENSE, "25.00", "2026-08-10", GeneralMovement.PAYMENT_CARD)

        response = self.client.get(
            "/api/general-movements/summary/?date_from=2026-08-01&date_to=2026-08-06&type=expense"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_income"], "0.00")
        self.assertEqual(data["total_expense"], "75.00")
        self.assertEqual(data["count"], 1)

    def test_summary_returns_period_rows(self):
        from rest_framework import status

        self._create(GeneralMovement.TYPE_INCOME, "100.00", "2026-08-01", GeneralMovement.PAYMENT_CASH)
        self._create(GeneralMovement.TYPE_EXPENSE, "40.00", "2026-08-01", GeneralMovement.PAYMENT_CARD)

        response = self.client.get("/api/general-movements/summary/?granularity=day")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_period = response.json()["by_period"]
        self.assertEqual(len(by_period), 1)
        self.assertEqual(by_period[0]["period"], "2026-08-01")
        self.assertEqual(by_period[0]["income"], "100.00")
        self.assertEqual(by_period[0]["expense"], "40.00")


class CashSessionClosedHistoryTests(TestCase):
    """Tests para el historial de cajas cerradas (solo lectura, admin/manager)."""

    def setUp(self):
        from rest_framework.test import APIClient

        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin", name="Admin"
        )
        self.manager = User.objects.create_user(
            email="manager@test.com", password="testpass", role="manager", name="Manager"
        )
        self.cashier = User.objects.create_user(
            email="cashier@test.com", password="testpass", role="cashier", name="Cajero"
        )
        self.accountant = User.objects.create_user(
            email="accountant@test.com", password="testpass", role="accountant", name="Contador"
        )
        self.register = CashRegister.objects.create(name="Caja Principal", is_active=True)
        self.client = APIClient()

    def _closed_session(self, user, **kwargs):
        return CashSession.objects.create(
            cash_register=self.register,
            user=user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
            counted_amount=Decimal("200.00"),
            difference=Decimal("0.00"),
            expected_amount=Decimal("200.00"),
            **kwargs,
        )

    def test_cashier_cannot_list_closed(self):
        from rest_framework import status

        self.client.force_authenticate(user=self.cashier)
        response = self.client.get("/api/cash-sessions/closed/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_lists_closed_sessions_with_totals(self):
        from rest_framework import status

        session = self._closed_session(self.cashier, closed_at=timezone.now())
        Sale.objects.create(
            status=SAILE_STATUS_COMPLETED,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("150.00"),
            subtotal=Decimal("150.00"),
            quantity=1,
            cash_session=session,
        )
        Sale.objects.create(
            status=SAILE_STATUS_CANCELLED,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("999.00"),
            subtotal=Decimal("999.00"),
            quantity=1,
            cash_session=session,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/cash-sessions/closed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        row = results[0]
        self.assertEqual(row["cash_register_name"], "Caja Principal")
        self.assertEqual(row["user_name"], "Cajero")
        self.assertEqual(row["sales_count"], 1)
        self.assertEqual(row["sales_total"], "150.00")

    def test_manager_can_list_closed(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        self.client.force_authenticate(user=self.manager)
        response = self.client.get("/api/cash-sessions/closed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_accountant_can_list_closed(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        self.client.force_authenticate(user=self.accountant)
        response = self.client.get("/api/cash-sessions/closed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_accountant_can_list_users(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        self.client.force_authenticate(user=self.accountant)
        response = self.client.get("/api/cash-sessions/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [user["id"] for user in response.json()]
        self.assertIn(self.cashier.id, ids)

    def test_filter_by_opened_date(self):
        from rest_framework import status

        session_a = self._closed_session(self.cashier)
        CashSession.objects.filter(pk=session_a.pk).update(
            opened_at=timezone.make_aware(datetime(2026, 8, 1, 9, 0)),
            closed_at=timezone.make_aware(datetime(2026, 8, 1, 18, 0)),
        )
        session_b = self._closed_session(self.cashier)
        CashSession.objects.filter(pk=session_b.pk).update(
            opened_at=timezone.make_aware(datetime(2026, 8, 5, 9, 0)),
            closed_at=timezone.make_aware(datetime(2026, 8, 5, 18, 0)),
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            "/api/cash-sessions/closed/?date_from=2026-08-01&date_to=2026-08-02"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["opened_at"][:10], "2026-08-01")

    def test_filter_by_user(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        self._closed_session(self.admin, closed_at=timezone.now())

        self.client.force_authenticate(user=self.manager)
        response = self.client.get(f"/api/cash-sessions/closed/?user_id={self.cashier.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["user"], self.cashier.id)

    def test_open_sessions_not_listed(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier,
            opening_amount=Decimal("50.00"),
            status=CashSession.STATUS_OPEN,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/cash-sessions/closed/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_cashier_cannot_list_users(self):
        from rest_framework import status

        self.client.force_authenticate(user=self.cashier)
        response = self.client.get("/api/cash-sessions/users/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_users_endpoint_returns_session_users(self):
        from rest_framework import status

        self._closed_session(self.cashier, closed_at=timezone.now())
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/cash-sessions/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [user["id"] for user in response.json()]
        self.assertIn(self.cashier.id, ids)

    def test_sales_detail_can_filter_by_cash_session(self):
        from rest_framework import status

        session = self._closed_session(self.cashier, closed_at=timezone.now())
        Sale.objects.create(
            status=SAILE_STATUS_COMPLETED,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("80.00"),
            subtotal=Decimal("80.00"),
            quantity=1,
            cash_session=session,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            "/api/reports/sales/detail/",
            {"cash_session_id": session.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["total_price"], "80.00")

    def test_auto_closed_session_report_recalculates_expected_amount(self):
        """Cierres automáticos: expected se recalcula y counted/difference van como null."""
        from rest_framework import status

        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
            closed_at=timezone.now(),
        )
        Sale.objects.create(
            status=SAILE_STATUS_COMPLETED,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("150.00"),
            subtotal=Decimal("150.00"),
            quantity=1,
            cash_session=session,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/cash-sessions/{session.id}/report/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(Decimal(str(data["expected_amount"])), Decimal("250.00"))
        self.assertIsNone(data["counted_amount"])
        self.assertIsNone(data["difference"])


class CashReportViewTests(TestCase):
    """Tests for the aggregated cash movement report endpoint."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin", name="Admin"
        )
        self.manager = User.objects.create_user(
            email="manager@test.com", password="testpass", role="manager", name="Manager"
        )
        self.cashier_a = User.objects.create_user(
            email="cashier-a@test.com", password="testpass", role="cashier", name="Cashier A"
        )
        self.cashier_b = User.objects.create_user(
            email="cashier-b@test.com", password="testpass", role="cashier", name="Cashier B"
        )
        self.accountant = User.objects.create_user(
            email="accountant@test.com", password="testpass", role="accountant", name="Contador"
        )
        self.register = CashRegister.objects.create(name="Caja Principal", is_active=True)

        self.session_a = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_a,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
        )
        self.session_b = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_b,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
        )

        self.client = APIClient()

    def _movement(self, session, movement_type, amount, created_at):
        movement = CashMovement.objects.create(
            cash_session=session,
            type=movement_type,
            amount=Decimal(amount),
            reason="Test movement",
            created_by=self.admin,
        )
        CashMovement.objects.filter(pk=movement.pk).update(created_at=created_at)
        return movement

    def test_admin_gets_report_totals(self):
        """Admin should see aggregated income, expense, balance and count."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_INCOME, "100.00", today)
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "40.00", today)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/reports/cash/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["total_income"], "100.00")
        self.assertEqual(data["total_expense"], "40.00")
        self.assertEqual(data["balance"], "60.00")
        self.assertEqual(data["count"], 2)

    def test_report_filters_by_date_range(self):
        """Report should only include movements within the requested date range."""
        today = timezone.now()
        yesterday = today - timedelta(days=1)

        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "10.00", today)
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "20.00", yesterday)

        start = yesterday.date().isoformat()
        end = yesterday.date().isoformat()

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/reports/cash/?start={start}&end={end}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["total_expense"], "20.00")
        self.assertEqual(response.json()["count"], 1)

    def test_report_filters_by_cashier(self):
        """Report should only include movements for the selected cashier."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "50.00", today)
        self._movement(self.session_b, CashMovement.TYPE_EXPENSE, "30.00", today)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/reports/cash/?cashier_id={self.cashier_a.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["total_expense"], "50.00")
        self.assertEqual(response.json()["by_cashier"][0]["user_id"], self.cashier_a.id)

    def test_report_groups_by_period(self):
        """Report should return one row per day when granularity is day."""
        day_one = timezone.make_aware(datetime(2026, 8, 17, 10, 0))
        day_two = timezone.make_aware(datetime(2026, 8, 18, 10, 0))

        self._movement(self.session_a, CashMovement.TYPE_INCOME, "10.00", day_two)
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "5.00", day_one)

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            "/api/reports/cash/?granularity=day&start=2026-08-17&end=2026-08-18"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_period = response.json()["by_period"]
        self.assertEqual(len(by_period), 2)

    def test_manager_can_access_report(self):
        """Manager should be able to access the cash report."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "25.00", today)

        self.client.force_authenticate(user=self.manager)
        response = self.client.get("/api/reports/cash/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["total_expense"], "25.00")

    def test_accountant_can_access_report(self):
        """Accountant should be able to access the cash report."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "25.00", today)

        self.client.force_authenticate(user=self.accountant)
        response = self.client.get("/api/reports/cash/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["total_expense"], "25.00")

    def test_cashier_cannot_access_report(self):
        """Cashier should receive 403 when accessing the cash report."""
        self.client.force_authenticate(user=self.cashier_a)
        response = self.client.get("/api/reports/cash/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CashMovementFilterTests(TestCase):
    """Tests for the extended cash movement list filters."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="testpass", role="admin", name="Admin"
        )
        self.cashier_a = User.objects.create_user(
            email="cashier-a@test.com", password="testpass", role="cashier", name="Cashier A"
        )
        self.cashier_b = User.objects.create_user(
            email="cashier-b@test.com", password="testpass", role="cashier", name="Cashier B"
        )
        self.register = CashRegister.objects.create(name="Caja Principal", is_active=True)

        self.session_a = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_a,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
        )
        self.session_b = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_b,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_CLOSED,
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def _movement(self, session, movement_type, amount, created_at):
        movement = CashMovement.objects.create(
            cash_session=session,
            type=movement_type,
            amount=Decimal(amount),
            reason="Test movement",
            created_by=self.admin,
        )
        CashMovement.objects.filter(pk=movement.pk).update(created_at=created_at)
        return movement

    def test_filter_by_type(self):
        """List should filter movements by type."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_INCOME, "100.00", today)
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "50.00", today)

        response = self.client.get("/api/cash-movements/?type=expense")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["type"], CashMovement.TYPE_EXPENSE)

    def test_filter_by_cashier_id(self):
        """List should filter movements by cashier."""
        today = timezone.now()
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "20.00", today)
        self._movement(self.session_b, CashMovement.TYPE_EXPENSE, "30.00", today)

        response = self.client.get(f"/api/cash-movements/?cashier_id={self.cashier_a.id}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(Decimal(results[0]["amount"]), Decimal("20.00"))

    def test_filter_by_date_range(self):
        """List should filter movements by created_at date range."""
        today = timezone.now()
        yesterday = today - timedelta(days=1)

        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "10.00", today)
        self._movement(self.session_a, CashMovement.TYPE_EXPENSE, "20.00", yesterday)

        start = yesterday.date().isoformat()
        end = yesterday.date().isoformat()

        response = self.client.get(f"/api/cash-movements/?date_from={start}&date_to={end}")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)


class CashSessionTimezoneBoundaryTests(TestCase):
    """Regression tests: the local day boundary must match get_today_range()
    (America/Managua local time) everywhere, not UTC. Comparing UTC dates
    made a session opened earlier in the day look "not today" once UTC had
    already rolled to the next date (~6pm local, reported as ~8pm), while
    the open-session validator still used the correct local day and refused
    to open a new session because the old one was still "open" for that day.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            email="tz@example.com",
            name="TZ User",
            password="testpass123",
            role="cashier",
        )
        self.register = CashRegister.objects.create(
            name="Caja TZ",
            is_active=True,
        )

    def test_is_today_true_late_in_local_day_despite_utc_rollover(self):
        """A session opened this local morning is still is_today late at night,
        even though UTC has already moved to the next calendar date."""
        from happypet.cash.serializers import CashSessionSerializer
        from unittest.mock import patch

        local_morning = timezone.localtime().replace(
            hour=9, minute=0, second=0, microsecond=0
        )
        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )
        CashSession.objects.filter(pk=session.pk).update(opened_at=local_morning)
        session.refresh_from_db()

        local_night = local_morning.replace(hour=23, minute=0)
        utc_next_day_now = local_night.astimezone(dt_timezone.utc)

        with patch(
            "happypet.cash.serializers.timezone.now",
            return_value=utc_next_day_now,
        ):
            data = CashSessionSerializer(session).data

        self.assertTrue(data["is_today"])

    def test_cannot_open_second_session_late_in_local_day(self):
        """Opening a new session late at night (local, but already the next
        calendar date in UTC) must still be blocked when one is already open
        for today's local day, consistently with is_today reporting the
        existing session as active."""
        from unittest.mock import patch

        local_morning = timezone.localtime().replace(
            hour=9, minute=0, second=0, microsecond=0
        )
        session = CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
        )
        CashSession.objects.filter(pk=session.pk).update(opened_at=local_morning)

        local_night = local_morning.replace(hour=23, minute=0)
        utc_next_day_now = local_night.astimezone(dt_timezone.utc)

        client = APIClient()
        client.force_authenticate(user=self.user)
        with patch(
            "happypet.cash.utils.timezone.now",
            return_value=utc_next_day_now,
        ):
            response = client.post(
                "/api/cash-sessions/open/",
                {"cash_register_id": self.register.id, "opening_amount": "50.00"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
