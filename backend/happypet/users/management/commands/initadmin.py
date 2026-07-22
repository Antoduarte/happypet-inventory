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

        if User.objects.filter(role="admin").exists():
            self.stdout.write(self.style.SUCCESS("Admin user already exists."))
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
