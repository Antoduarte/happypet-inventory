from typing import ClassVar

from django.contrib.auth.models import AbstractUser
from django.db.models import CharField
from django.db.models import EmailField
from django.urls import reverse
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


ROLE_ADMIN = "admin"
ROLE_MANAGER = "manager"
ROLE_CASHIER = "cashier"

ROLE_CHOICES = [
    (ROLE_ADMIN, "Administrador"),
    (ROLE_MANAGER, "Gerente"),
    (ROLE_CASHIER, "Cajero"),
]


class User(AbstractUser):
    """
    Default custom user model for happypet.
    """

    name = CharField(_("Name of User"), blank=True, max_length=255)
    first_name = None  # type: ignore[assignment]
    last_name = None  # type: ignore[assignment]
    email = EmailField(_("email address"), unique=True)
    username = None  # type: ignore[assignment]
    role = CharField(
        _("Role"),
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_CASHIER,
    )
    code = CharField(
        _("Authorization Code"),
        max_length=6,
        blank=True,
        default="",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects: ClassVar[UserManager] = UserManager()

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == ROLE_ADMIN

    @property
    def is_manager(self):
        return self.role in (ROLE_ADMIN, ROLE_MANAGER)

    @property
    def is_cashier(self):
        return self.role == ROLE_CASHIER

    def get_absolute_url(self) -> str:
        """Get URL for user's detail view."""
        return reverse("users:detail", kwargs={"pk": self.id})
