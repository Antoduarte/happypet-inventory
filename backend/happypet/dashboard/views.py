from datetime import date, datetime

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from rest_framework import filters, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.response import Response

from happypet.products.models import Product
from happypet.products.constants import (
    PAYMENT_CHOICES,
    SAILE_STATUS_COMPLETED,
    SALE_ITEM_PRODUCT,
    SALE_ITEM_SERVICE,
)
from happypet.sales.models import Sale, SaleItem
from happypet.users.permissions import IsManagerOrAdmin
from happypet.utils.pagination import StandardResultsSetPagination
from .serializers import SaleDetailRowSerializer

User = get_user_model()


class DashboardStatsView(APIView):
    def get(self, request):
        today = date.today()

        total_products = Product.objects.filter(
            deleted_at__isnull=True, is_active=True
        ).count()

        today_income = Sale.objects.filter(
            sale_date__date=today,
            status='completed'
        ).aggregate(total=Sum('total_price'))['total'] or 0

        low_stock_count = Product.objects.filter(
            deleted_at__isnull=True,
            is_active=True,
            stock__lte=5
        ).count()

        today_services = SaleItem.objects.filter(
            sale__sale_date__date=today,
            sale__status='completed',
            type='service'
        ).values('sale').distinct().count()

        return Response({
            'total_products': total_products,
            'today_income': str(today_income),
            'low_stock_count': low_stock_count,
            'today_services': today_services,
        })


# Maps the frontend granularity param to the Django Trunc function.
TRUNC_FUNCS = {
    'day': TruncDay,
    'week': TruncWeek,
    'month': TruncMonth,
}

def _parse_date(value, fallback):
    """Parse a YYYY-MM-DD query param, returning `fallback` if missing/invalid."""
    if not value:
        return fallback
    try:
        return datetime.strptime(value, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return fallback


def _resolve_report_filters(request):
    """
    Shared filter contract for sales reports.

    Returns (start, end, cashier_id, is_cashier). Cashiers are locked to the
    current day and to their own cash sessions regardless of the params sent.
    """
    user = request.user
    today = date.today()
    is_cashier = getattr(user, 'is_cashier', False)

    if is_cashier:
        return today, today, None, True

    start = _parse_date(request.query_params.get('start'), today)
    end = _parse_date(request.query_params.get('end'), today)
    cashier_id = request.query_params.get('cashier_id') or None

    # Keep the range coherent if the client sends end < start.
    if end < start:
        start, end = end, start

    return start, end, cashier_id, False


class SalesReportView(APIView):
    """
    Aggregated sales report for accounting.

    Admins/managers get the full report (custom range, per-cashier breakdown).
    Cashiers are restricted to the current day and to their own cash sessions.
    Only completed sales are counted, matching the dashboard.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        start, end, cashier_id, is_cashier = _resolve_report_filters(request)

        if is_cashier:
            granularity = 'day'
        else:
            granularity = request.query_params.get('granularity', 'day')
            if granularity not in TRUNC_FUNCS:
                granularity = 'day'

        qs = Sale.objects.filter(
            status=SAILE_STATUS_COMPLETED,
            sale_date__date__gte=start,
            sale_date__date__lte=end,
        )

        if is_cashier:
            qs = qs.filter(cash_session__user=user)
        elif cashier_id:
            qs = qs.filter(cash_session__user_id=cashier_id)

        # --- Summary ---
        totals = qs.aggregate(total=Sum('total_price'), count=Count('id'))
        total_income = totals['total'] or 0
        sales_count = totals['count'] or 0
        avg_ticket = (total_income / sales_count) if sales_count else 0

        # --- Product/service split (supply lines inside services excluded) ---
        product_lines = SaleItem.objects.filter(
            sale__in=qs,
            type=SALE_ITEM_PRODUCT,
            parent_service_item__isnull=True,
        )
        service_lines = SaleItem.objects.filter(
            sale__in=qs,
            type=SALE_ITEM_SERVICE,
        )
        products_income = product_lines.aggregate(t=Sum('total_price'))['t'] or 0
        services_income = service_lines.aggregate(t=Sum('total_price'))['t'] or 0

        # --- Trend by period ---
        trunc = TRUNC_FUNCS[granularity]
        by_period = [
            {
                'period': row['period'].date().isoformat()
                if hasattr(row['period'], 'date')
                else row['period'].isoformat(),
                'total': str(row['total'] or 0),
                'count': row['count'],
            }
            for row in qs.annotate(period=trunc('sale_date'))
            .values('period')
            .annotate(total=Sum('total_price'), count=Count('id'))
            .order_by('period')
        ]

        # --- Payment method breakdown ---
        payment_totals = {
            row['payment_type']: row['total'] or 0
            for row in qs.values('payment_type').annotate(total=Sum('total_price'))
        }
        by_payment = [
            {
                'type': payment_type,
                'label': label,
                'total': str(payment_totals.get(payment_type, 0)),
            }
            for payment_type, label in PAYMENT_CHOICES
        ]

        # --- Per-cashier breakdown (admin/manager only) ---
        by_cashier = []
        if not is_cashier:
            for row in (
                qs.values('cash_session__user', 'cash_session__user__name')
                .annotate(total=Sum('total_price'), count=Count('id'))
                .order_by('-total')
            ):
                user_id = row['cash_session__user']
                by_cashier.append({
                    'user_id': user_id,
                    'name': row['cash_session__user__name'] or 'Sin caja',
                    'total': str(row['total'] or 0),
                    'count': row['count'],
                })

        return Response({
            'granularity': granularity,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'summary': {
                'total_income': str(total_income),
                'sales_count': sales_count,
                'avg_ticket': str(round(avg_ticket, 2)),
                'products_income': str(products_income),
                'products_count': product_lines.count(),
                'services_income': str(services_income),
                'services_count': service_lines.count(),
            },
            'by_period': by_period,
            'by_payment': by_payment,
            'by_cashier': by_cashier,
        })


class SellerListView(APIView):
    """
    Lightweight list of users with at least one completed sale, for report
    filters. Any role can sell (admins/managers too), so this is driven by
    actual sales, not by role. Admin/manager only; cashiers don't need it
    (they only see their own data).
    """

    permission_classes = [IsManagerOrAdmin]

    def get(self, request):
        sellers = (
            User.objects.filter(cash_sessions__sales__status=SAILE_STATUS_COMPLETED)
            .distinct()
            .order_by('name')
            .values('id', 'name', 'email')
        )
        return Response([
            {
                'id': row['id'],
                'name': row['name'] or row['email'],
            }
            for row in sellers
        ])


class SalesDetailReportView(generics.ListAPIView):
    """
    Ticket-level sales detail with nested items for the reports page.

    Shares the SalesReportView filter contract (start/end/cashier_id params;
    cashiers are locked to today and their own sessions). Paginated and
    searchable by ticket id or item names.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = SaleDetailRowSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'id',
        'items__product__name',
        'items__service__name',
        'items__presentation_name',
    ]
    ordering_fields = ['sale_date', 'total_price']
    ordering = ['-sale_date']

    def get_queryset(self):
        start, end, cashier_id, is_cashier = _resolve_report_filters(self.request)

        qs = (
            Sale.objects.filter(
                status=SAILE_STATUS_COMPLETED,
                sale_date__date__gte=start,
                sale_date__date__lte=end,
            )
            .select_related('cash_session__user')
            .prefetch_related('items__product', 'items__service', 'items__presentation')
        )

        if is_cashier:
            qs = qs.filter(cash_session__user=self.request.user)
        elif cashier_id:
            qs = qs.filter(cash_session__user_id=cashier_id)

        return qs
