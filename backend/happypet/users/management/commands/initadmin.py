from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import os

User = get_user_model()


class Command(BaseCommand):
    help = "Create an admin user if none exists (idempotent)"

    def handle(self, *args, **options):
        email = os.environ.get("HAPPYPET_ADMIN_EMAIL", "admin@happypet.com")
        password = os.environ.get("HAPPYPET_ADMIN_PASSWORD")
        name = os.environ.get("HAPPYPET_ADMIN_NAME", "Admin")

        if not password:
            self.stdout.write(self.style.WARNING(
                "HAPPYPET_ADMIN_PASSWORD not set. Skipping admin creation."
            ))
            return

        admin = User.objects.filter(role="admin").first()

        if admin:
            if admin.is_active:
                self.stdout.write(
                    self.style.SUCCESS("Admin user already exists and is active.")
                )
                return
            admin.is_active = True
            admin.is_staff = True
            admin.is_superuser = True
            admin.save(update_fields=["is_active", "is_staff", "is_superuser"])
            self.stdout.write(
                self.style.SUCCESS(f"Admin user reactivated: {admin.email}")
            )
            return

        user = User.objects.create_user(
            email=email,
            name=name,
            password=password,
            role="admin",
        )
        user.is_staff = True
        user.is_superuser = True
        user.save()

        self.stdout.write(self.style.SUCCESS(f"Admin user created: {email}"))
