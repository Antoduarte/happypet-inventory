from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from happypet.cash.models import CashRegister, CashSession, CashMovement

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
            opened_at=yesterday,
        )

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
        CashSession.objects.create(
            cash_register=self.register,
            user=self.user,
            opening_amount=Decimal("100.00"),
            status=CashSession.STATUS_OPEN,
            opened_at=yesterday,
        )

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
