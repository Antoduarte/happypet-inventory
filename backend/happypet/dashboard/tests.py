from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from happypet.cash.models import CashRegister, CashSession
from happypet.products.constants import (
    PAYMENT_CARD,
    PAYMENT_CASH,
    SAILE_STATUS_CANCELLED,
    SAILE_STATUS_COMPLETED,
    SALE_ITEM_PRODUCT,
    SALE_ITEM_SERVICE,
)
from happypet.sales.models import Sale, SaleItem
from happypet.services.models import Service

User = get_user_model()

REPORT_URL = "/api/reports/sales/"


class SalesReportViewTests(APITestCase):
    """Integration tests for GET /api/reports/sales/."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="pass", role="admin", name="Admin"
        )
        self.cashier_a = User.objects.create_user(
            email="ana@test.com", password="pass", role="cashier", name="Ana"
        )
        self.cashier_b = User.objects.create_user(
            email="beto@test.com", password="pass", role="cashier", name="Beto"
        )
        self.register = CashRegister.objects.create(name="Caja 1")
        self.session_a = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_a,
            opening_amount=Decimal("0.00"),
            status=CashSession.STATUS_OPEN,
        )
        self.session_b = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_b,
            opening_amount=Decimal("0.00"),
            status=CashSession.STATUS_OPEN,
        )

    def _make_sale(self, total, session=None, payment=PAYMENT_CASH,
                   status=SAILE_STATUS_COMPLETED, days_ago=0):
        sale = Sale.objects.create(
            status=status,
            payment_type=payment,
            total_price=Decimal(total),
            subtotal=Decimal(total),
            quantity=1,
            cash_session=session,
        )
        if days_ago:
            # sale_date is auto_now_add, so backdate via queryset update.
            when = timezone.now() - timedelta(days=days_ago)
            Sale.objects.filter(pk=sale.pk).update(sale_date=when)
        return sale

    # ── Admin: full report over a range ────────────────────────────────────

    def test_admin_range_report(self):
        self._make_sale("100.00", self.session_a)                 # today
        self._make_sale("50.00", self.session_b, days_ago=3)      # within range
        self._make_sale("999.00", self.session_a, days_ago=30)    # outside range

        self.client.force_authenticate(self.admin)
        start = (date.today() - timedelta(days=7)).isoformat()
        end = date.today().isoformat()
        res = self.client.get(
            REPORT_URL, {"start": start, "end": end, "granularity": "day"}
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["summary"]["total_income"], "150.00")
        self.assertEqual(data["summary"]["sales_count"], 2)
        self.assertEqual(len(data["by_period"]), 2)
        self.assertTrue(len(data["by_cashier"]) >= 1)

    def test_only_completed_sales_counted(self):
        self._make_sale("100.00", self.session_a, status=SAILE_STATUS_COMPLETED)
        self._make_sale("77.00", self.session_a, status=SAILE_STATUS_CANCELLED)

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL)
        self.assertEqual(res.json()["summary"]["total_income"], "100.00")
        self.assertEqual(res.json()["summary"]["sales_count"], 1)

    def test_payment_breakdown(self):
        self._make_sale("100.00", self.session_a, payment=PAYMENT_CASH)
        self._make_sale("40.00", self.session_a, payment=PAYMENT_CARD)

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL)
        by_payment = {row["type"]: row["total"] for row in res.json()["by_payment"]}
        self.assertEqual(by_payment[PAYMENT_CASH], "100.00")
        self.assertEqual(by_payment[PAYMENT_CARD], "40.00")

    def test_cashier_breakdown_groups_by_session_owner(self):
        self._make_sale("100.00", self.session_a)
        self._make_sale("30.00", self.session_a)
        self._make_sale("60.00", self.session_b)

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL)
        by_cashier = {row["name"]: row for row in res.json()["by_cashier"]}
        self.assertEqual(by_cashier["Ana"]["total"], "130.00")
        self.assertEqual(by_cashier["Ana"]["count"], 2)
        self.assertEqual(by_cashier["Beto"]["total"], "60.00")

    def test_admin_can_filter_by_cashier(self):
        self._make_sale("100.00", self.session_a)
        self._make_sale("60.00", self.session_b)

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL, {"cashier_id": self.cashier_a.id})
        self.assertEqual(res.json()["summary"]["total_income"], "100.00")

    # ── Product/service split ────────────────────────────────────────────

    @staticmethod
    def _make_line(sale, item_type, total, parent=None):
        return SaleItem.objects.create(
            sale=sale,
            type=item_type,
            quantity=1,
            price_per_item=Decimal(total),
            subtotal=Decimal(total),
            total_price=Decimal(total),
            parent_service_item=parent,
        )

    def test_product_service_split_excludes_service_supplies(self):
        sale = self._make_sale("180.00", self.session_a)
        self._make_line(sale, SALE_ITEM_PRODUCT, "100.00")
        service_line = self._make_line(sale, SALE_ITEM_SERVICE, "80.00")
        # Supply line inside the service: must NOT count as product income/qty.
        self._make_line(sale, SALE_ITEM_PRODUCT, "20.00", parent=service_line)

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL)
        summary = res.json()["summary"]

        self.assertEqual(summary["products_income"], "100.00")
        self.assertEqual(summary["products_count"], 1)
        self.assertEqual(summary["services_income"], "80.00")
        self.assertEqual(summary["services_count"], 1)

    def test_product_service_split_respects_cashier_filter(self):
        sale_a = self._make_sale("100.00", self.session_a)
        self._make_line(sale_a, SALE_ITEM_PRODUCT, "100.00")
        sale_b = self._make_sale("50.00", self.session_b)
        self._make_line(sale_b, SALE_ITEM_SERVICE, "50.00")

        self.client.force_authenticate(self.admin)
        res = self.client.get(REPORT_URL, {"cashier_id": self.cashier_a.id})
        summary = res.json()["summary"]

        self.assertEqual(summary["products_income"], "100.00")
        self.assertEqual(summary["products_count"], 1)
        self.assertEqual(summary["services_income"], "0")
        self.assertEqual(summary["services_count"], 0)

    # ── Cashier: restricted to today + own sessions ────────────────────────

    def test_cashier_sees_only_today_and_own_sales(self):
        self._make_sale("100.00", self.session_a)                # Ana, today
        self._make_sale("60.00", self.session_b)                 # Beto, today
        self._make_sale("999.00", self.session_a, days_ago=2)    # Ana, past

        self.client.force_authenticate(self.cashier_a)
        # Cashier tries to widen the range and pick another cashier — must be ignored.
        start = (date.today() - timedelta(days=30)).isoformat()
        res = self.client.get(
            REPORT_URL,
            {"start": start, "granularity": "month", "cashier_id": self.cashier_b.id},
        )

        data = res.json()
        self.assertEqual(data["granularity"], "day")
        self.assertEqual(data["start"], date.today().isoformat())
        self.assertEqual(data["summary"]["total_income"], "100.00")
        self.assertEqual(data["by_cashier"], [])

    def test_unauthenticated_gets_401(self):
        res = self.client.get(REPORT_URL)
        self.assertEqual(res.status_code, 401)


SELLERS_URL = "/api/reports/sellers/"


class SellerListViewTests(APITestCase):
    """Integration tests for GET /api/reports/sellers/."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="pass", role="admin", name="Admin"
        )
        self.manager = User.objects.create_user(
            email="manager@test.com", password="pass", role="manager", name="Manager"
        )
        self.cashier_a = User.objects.create_user(
            email="ana@test.com", password="pass", role="cashier", name="Ana"
        )
        self.register = CashRegister.objects.create(name="Caja 1")

    def _make_sale(self, user, status=SAILE_STATUS_COMPLETED):
        session = CashSession.objects.create(
            cash_register=self.register,
            user=user,
            opening_amount=Decimal("0.00"),
            status=CashSession.STATUS_OPEN,
        )
        return Sale.objects.create(
            status=status,
            payment_type=PAYMENT_CASH,
            total_price=Decimal("10.00"),
            subtotal=Decimal("10.00"),
            quantity=1,
            cash_session=session,
        )

    def test_lists_any_role_with_completed_sale(self):
        self._make_sale(self.cashier_a)
        self._make_sale(self.admin)      # admins can sell too
        self._make_sale(self.manager)    # managers can sell too

        self.client.force_authenticate(self.admin)
        res = self.client.get(SELLERS_URL)

        self.assertEqual(res.status_code, 200)
        names = {row["name"] for row in res.json()}
        self.assertEqual(names, {"Ana", "Admin", "Manager"})

    def test_user_without_sales_not_listed(self):
        self._make_sale(self.cashier_a)

        self.client.force_authenticate(self.admin)
        res = self.client.get(SELLERS_URL)

        names = {row["name"] for row in res.json()}
        self.assertEqual(names, {"Ana"})

    def test_user_with_only_cancelled_sales_not_listed(self):
        self._make_sale(self.cashier_a, status=SAILE_STATUS_CANCELLED)

        self.client.force_authenticate(self.admin)
        res = self.client.get(SELLERS_URL)

        self.assertEqual(res.json(), [])

    def test_manager_gets_sellers(self):
        self._make_sale(self.cashier_a)

        self.client.force_authenticate(self.manager)
        res = self.client.get(SELLERS_URL)
        self.assertEqual(res.status_code, 200)

    def test_cashier_gets_403(self):
        self.client.force_authenticate(self.cashier_a)
        res = self.client.get(SELLERS_URL)
        self.assertEqual(res.status_code, 403)

    def test_unauthenticated_gets_401(self):
        res = self.client.get(SELLERS_URL)
        self.assertEqual(res.status_code, 401)


DETAIL_URL = "/api/reports/sales/detail/"


class SalesDetailReportViewTests(APITestCase):
    """Integration tests for GET /api/reports/sales/detail/."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com", password="pass", role="admin", name="Admin"
        )
        self.cashier_a = User.objects.create_user(
            email="ana@test.com", password="pass", role="cashier", name="Ana"
        )
        self.cashier_b = User.objects.create_user(
            email="beto@test.com", password="pass", role="cashier", name="Beto"
        )
        self.register = CashRegister.objects.create(name="Caja 1")
        self.session_a = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_a,
            opening_amount=Decimal("0.00"),
            status=CashSession.STATUS_OPEN,
        )
        self.session_b = CashSession.objects.create(
            cash_register=self.register,
            user=self.cashier_b,
            opening_amount=Decimal("0.00"),
            status=CashSession.STATUS_OPEN,
        )

    def _make_sale(self, total, session=None, days_ago=0):
        sale = Sale.objects.create(
            status=SAILE_STATUS_COMPLETED,
            payment_type=PAYMENT_CASH,
            total_price=Decimal(total),
            subtotal=Decimal(total),
            quantity=1,
            cash_session=session,
        )
        if days_ago:
            when = timezone.now() - timedelta(days=days_ago)
            Sale.objects.filter(pk=sale.pk).update(sale_date=when)
        return sale

    @staticmethod
    def _make_line(sale, item_type, total, parent=None, service=None,
                   presentation_name=""):
        return SaleItem.objects.create(
            sale=sale,
            type=item_type,
            service=service,
            presentation_name=presentation_name,
            quantity=1,
            price_per_item=Decimal(total),
            subtotal=Decimal(total),
            total_price=Decimal(total),
            parent_service_item=parent,
        )

    def test_returns_nested_items_with_supply_flag_and_names(self):
        service = Service.objects.create(name="Baño", price=Decimal("80.00"))
        sale = self._make_sale("180.00", self.session_a)
        self._make_line(sale, SALE_ITEM_PRODUCT, "100.00",
                        presentation_name="Alimento 1kg")
        service_line = self._make_line(sale, SALE_ITEM_SERVICE, "80.00",
                                       service=service)
        self._make_line(sale, SALE_ITEM_PRODUCT, "20.00", parent=service_line,
                        presentation_name="Shampoo 250ml")

        self.client.force_authenticate(self.admin)
        res = self.client.get(DETAIL_URL)

        self.assertEqual(res.status_code, 200)
        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        row = results[0]
        self.assertEqual(row["id"], sale.id)
        self.assertEqual(row["seller_name"], "Ana")
        self.assertEqual(len(row["items"]), 3)

        by_name = {item["name"]: item for item in row["items"]}
        self.assertFalse(by_name["Alimento 1kg"]["is_supply"])
        self.assertFalse(by_name["Baño"]["is_supply"])
        self.assertTrue(by_name["Shampoo 250ml"]["is_supply"])

    def test_filters_by_cashier_and_range(self):
        self._make_sale("100.00", self.session_a)
        self._make_sale("60.00", self.session_b)
        self._make_sale("999.00", self.session_a, days_ago=30)

        self.client.force_authenticate(self.admin)
        start = (date.today() - timedelta(days=7)).isoformat()
        end = date.today().isoformat()
        res = self.client.get(
            DETAIL_URL,
            {"start": start, "end": end, "cashier_id": self.cashier_a.id},
        )

        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["total_price"], "100.00")

    def test_cashier_locked_to_own_today(self):
        self._make_sale("100.00", self.session_a)                # Ana, today
        self._make_sale("60.00", self.session_b)                 # Beto, today
        self._make_sale("999.00", self.session_a, days_ago=2)    # Ana, past

        self.client.force_authenticate(self.cashier_a)
        start = (date.today() - timedelta(days=30)).isoformat()
        res = self.client.get(
            DETAIL_URL, {"start": start, "cashier_id": self.cashier_b.id}
        )

        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["seller_name"], "Ana")

    def test_search_by_item_name(self):
        sale = self._make_sale("100.00", self.session_a)
        self._make_line(sale, SALE_ITEM_PRODUCT, "100.00",
                        presentation_name="Alimento 1kg")
        other = self._make_sale("50.00", self.session_a)
        self._make_line(other, SALE_ITEM_PRODUCT, "50.00",
                        presentation_name="Pelota de goma")

        self.client.force_authenticate(self.admin)
        res = self.client.get(DETAIL_URL, {"search": "alimento"})

        results = res.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], sale.id)

    def test_pagination_envelope(self):
        self._make_sale("10.00", self.session_a)

        self.client.force_authenticate(self.admin)
        res = self.client.get(DETAIL_URL)
        data = res.json()
        self.assertIn("count", data)
        self.assertIn("results", data)
        self.assertEqual(data["count"], 1)

    def test_unauthenticated_gets_401(self):
        res = self.client.get(DETAIL_URL)
        self.assertEqual(res.status_code, 401)
