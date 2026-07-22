from decimal import Decimal
from typing import Optional

from django.db import transaction
from django.utils import timezone
from django.db import models

from .constants import PAYMENT_CASH
from .models import CashRegister, CashSession, CashMovement, CashSessionClosure


class CashSessionService:
    @staticmethod
    @transaction.atomic
    def open_session(
        cash_register_id: int, user_id: int, opening_amount: Decimal = Decimal("0.00")
    ) -> CashSession:
        register = CashRegister.objects.select_for_update().get(pk=cash_register_id)

        if not register.is_active:
            raise ValueError("Cash register is not active.")

        today = timezone.now().date()

        old_session = (
            CashSession.objects
            .filter(
                cash_register=register,
                status=CashSession.STATUS_OPEN,
            )
            .exclude(opened_at__date=today)
            .first()
        )
        if old_session:
            old_session.status = CashSession.STATUS_CLOSED
            old_session.closed_at = timezone.now()
            old_session.save()

        if CashSession.objects.filter(
            cash_register=register,
            status=CashSession.STATUS_OPEN,
            opened_at__date=today,
        ).exists():
            raise ValueError("There is already an open session for this cash register.")

        session = CashSession.objects.create(
            cash_register=register,
            user_id=user_id,
            opening_amount=opening_amount,
            status=CashSession.STATUS_OPEN,
        )
        return session

    @staticmethod
    @transaction.atomic
    def close_session(
        session_id: int, counted_amount: Decimal, notes: str = ""
    ) -> CashSession:
        session = (
            CashSession.objects.select_for_update()
            .select_related("cash_register", "user")
            .prefetch_related("movements", "sales")
            .get(pk=session_id)
        )

        if session.status == CashSession.STATUS_CLOSED:
            raise ValueError("Session is already closed.")
        if session.status == CashSession.STATUS_SUSPENDED:
            raise ValueError("Session is already suspended.")

        expected = CashSessionService._calculate_expected_amount(session)

        CashSessionClosure.objects.create(
            session=session,
            expected_amount=expected,
            counted_amount=counted_amount,
            difference=counted_amount - expected,
            notes=notes,
        )

        session.expected_amount = expected
        session.counted_amount = counted_amount
        session.difference = counted_amount - expected
        session.status = CashSession.STATUS_SUSPENDED
        session.suspended_at = timezone.now()
        session.notes = notes
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def resume_session(session_id: int) -> CashSession:
        session = (
            CashSession.objects.select_for_update()
            .select_related("cash_register", "user")
            .get(pk=session_id)
        )

        if session.status != CashSession.STATUS_SUSPENDED:
            raise ValueError("Only suspended sessions can be resumed.")

        session.status = CashSession.STATUS_OPEN
        session.suspended_at = None
        session.save()
        return session

    @staticmethod
    @transaction.atomic
    def final_close_session(session_id: int) -> CashSession:
        session = (
            CashSession.objects.select_for_update()
            .select_related("cash_register", "user")
            .get(pk=session_id)
        )

        if session.status != CashSession.STATUS_SUSPENDED:
            raise ValueError("Only suspended sessions can be final-closed.")

        session.status = CashSession.STATUS_CLOSED
        session.closed_at = timezone.now()
        session.save()
        return session

    @staticmethod
    def get_current_session(cash_register_id: int) -> Optional[CashSession]:
        return (
            CashSession.objects.filter(
                cash_register_id=cash_register_id,
                status=CashSession.STATUS_OPEN,
            )
            .select_related("cash_register", "user")
            .prefetch_related("movements", "sales")
            .first()
        )

    @staticmethod
    def get_session_report(session_id: int) -> CashSession:
        return (
            CashSession.objects.select_related("cash_register", "user")
            .prefetch_related("movements", "sales")
            .get(pk=session_id)
        )

    @staticmethod
    def _calculate_expected_amount(session: CashSession) -> Decimal:
        total = session.opening_amount

        cash_sales = session.sales.filter(payment_type=PAYMENT_CASH).aggregate(
            total=models.Sum("total_price")
        )["total"] or Decimal("0.00")
        total += cash_sales

        income = session.movements.filter(type=CashMovement.TYPE_INCOME).exclude(
            reason__startswith="Sale #"
        ).aggregate(
            total=models.Sum("amount")
        )["total"] or Decimal("0.00")
        total += income

        expense = session.movements.filter(type=CashMovement.TYPE_EXPENSE).exclude(
            reason__startswith="Sale #"
        ).aggregate(
            total=models.Sum("amount")
        )["total"] or Decimal("0.00")
        total -= expense

        return total


class CashMovementService:
    @staticmethod
    @transaction.atomic
    def create_movement(
        session_id: int,
        movement_type: str,
        amount: Decimal,
        reason: str,
        user_id: int,
    ) -> CashMovement:
        session = CashSession.objects.select_for_update().get(pk=session_id)

        if session.status == CashSession.STATUS_CLOSED:
            raise ValueError("Cannot add movement to a closed session.")

        if amount <= 0:
            raise ValueError("Movement amount must be greater than zero.")

        movement = CashMovement.objects.create(
            cash_session=session,
            type=movement_type,
            amount=amount,
            reason=reason,
            created_by_id=user_id,
        )
        return movement
