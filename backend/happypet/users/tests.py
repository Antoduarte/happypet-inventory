from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from .models import User


class InitAdminCommandTests(TestCase):
    def setUp(self):
        self.env = patch.dict("os.environ", {"HAPPYPET_ADMIN_PASSWORD": "testpass"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.admin = User.objects.create_user(
            email="admin@happypet.com",
            password="testpass",
            role="admin",
            name="Admin",
        )
        self.admin.is_staff = True
        self.admin.is_superuser = True
        self.admin.save()

    def _run(self):
        out = StringIO()
        call_command("initadmin", stdout=out)
        return out.getvalue()

    def test_active_admin_is_not_touched(self):
        output = self._run()
        self.assertIn("already exists and is active", output)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_inactive_admin_is_reactivated(self):
        self.admin.is_active = False
        self.admin.save(update_fields=["is_active"])
        output = self._run()
        self.assertIn("reactivated", output)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
        self.assertTrue(self.admin.is_staff)
        self.assertTrue(self.admin.is_superuser)

    def test_no_admin_creates_new_user(self):
        User.objects.all().delete()
        output = self._run()
        self.assertIn("Admin user created", output)
        self.assertTrue(User.objects.filter(role="admin").exists())
