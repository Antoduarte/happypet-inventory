from decimal import Decimal

from django.conf import settings
from django.db import models


class CashRegister(models.Model):
    name = models.CharField(max_length=100)
    branch = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name


class CashSession(models.Model):
    STATUS_OPEN = "open"
    STATUS_SUSPENDED = "suspended"
    STATUS_CLOSED = "closed"

    STATUS_CHOICES = [
        (STATUS_OPEN, "Abierta"),
        (STATUS_SUSPENDED, "Suspendida"),
        (STATUS_CLOSED, "Cerrada"),
    ]

    cash_register = models.ForeignKey(
        CashRegister,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cash_sessions",
    )
    opening_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    expected_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        default=Decimal("0.00"),
    )
    counted_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        default=None,
    )
    difference = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        default=None,
    )
    status = models.CharField(
        max_length=12,
        choices=STATUS_CHOICES,
        default=STATUS_OPEN,
    )
    notes = models.TextField(blank=True, default="")
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(blank=True, null=True, default=None)
    suspended_at = models.DateTimeField(blank=True, null=True, default=None)

    class Meta:
        ordering = ["-opened_at"]
        indexes = [
            models.Index(fields=["status", "opened_at"]),
            models.Index(fields=["cash_register", "status"]),
        ]

    def __str__(self):
        return f"Sesión #{self.pk} - {self.cash_register.name} ({self.status})"

    @property
    def is_open(self):
        return self.status == self.STATUS_OPEN

    @property
    def is_suspended(self):
        return self.status == self.STATUS_SUSPENDED

    @property
    def is_closed(self):
        return self.status == self.STATUS_CLOSED


class CashSessionClosure(models.Model):
    session = models.ForeignKey(
        CashSession,
        on_delete=models.CASCADE,
        related_name="closures",
    )
    closed_at = models.DateTimeField(auto_now_add=True)
    expected_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    counted_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    difference = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-closed_at"]
        indexes = [
            models.Index(fields=["session", "-closed_at"]),
        ]

    def __str__(self):
        return f"Cierre #{self.pk} - Sesión #{self.session_id}"


class CashMovement(models.Model):
    TYPE_INCOME = "income"
    TYPE_EXPENSE = "expense"

    TYPE_CHOICES = [
        (TYPE_INCOME, "Ingreso"),
        (TYPE_EXPENSE, "Egreso"),
    ]

    cash_session = models.ForeignKey(
        CashSession,
        on_delete=models.CASCADE,
        related_name="movements",
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=255)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cash_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["cash_session", "type"]),
        ]

    def __str__(self):
        return f"{self.get_type_display()} #{self.pk}: {self.amount}"