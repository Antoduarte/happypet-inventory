from django.conf import settings
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework.routers import SimpleRouter

from happypet.dashboard.views import (
    DashboardStatsView,
    SalesDetailReportView,
    SalesReportView,
    SellerListView,
)

router = DefaultRouter() if settings.DEBUG else SimpleRouter()


app_name = "api"
urlpatterns = [
    path("", include("happypet.products.urls")),
    path("", include("happypet.users.urls")),
    path("", include("happypet.services.urls")),
    path("", include("happypet.sales.urls")),
    path("", include("happypet.cash.urls")),
    path("dashboard/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("reports/sales/", SalesReportView.as_view(), name="sales-report"),
    path("reports/sellers/", SellerListView.as_view(), name="report-sellers"),
    path("reports/sales/detail/", SalesDetailReportView.as_view(), name="sales-report-detail"),
]
