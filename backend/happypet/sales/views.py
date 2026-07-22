import io
from decimal import Decimal

from django.http import HttpResponse
from django.template import engines
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from xhtml2pdf import pisa

from happypet.users.permissions import CanTransitionSale
from happypet.utils.pagination import StandardResultsSetPagination
from happypet.utils.authorization import check_manager_authorization
from .models import Sale
from .serializers import SaleSerializer, SaleCreateSerializer, SaleStatusSerializer


class SaleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for the Sale resource.

    Endpoints:
      - GET    /api/sales/          → list (paginated, filterable)
      - POST   /api/sales/          → create
      - GET    /api/sales/{id}/     → retrieve
      - PUT    /api/sales/{id}/     → full update (not yet supported)
      - PATCH  /api/sales/{id}/     → partial update (not yet supported)
      - DELETE /api/sales/{id}/     → destroy

    On creation (POST):
      - Uses SaleCreateSerializer which accepts product_id / service_id
      - Delegates logic to SaleService (stock deduction, totals)
    On read (GET):
      - Uses SaleSerializer (nested product/service objects for display)
    """

    queryset = (
        Sale.objects
        .prefetch_related("items__product", "items__service")
        .order_by("-sale_date")
    )
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["id", "payment_type", "status"]
    ordering_fields = ["sale_date", "total_price", "quantity"]
    ordering = ["-sale_date"]

    def get_permissions(self):
        """Require CanTransitionSale for partial_update (status transitions)."""
        if self.action == "partial_update":
            return [IsAuthenticated(), CanTransitionSale()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        """Use SaleCreateSerializer for write operations, SaleSerializer for reads."""
        if self.action in ("create", "update", "partial_update"):
            return SaleCreateSerializer
        return SaleSerializer

    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /api/sales/{id}/

        If the payload contains ``status``, delegates to SaleStatusSerializer
        for state-machine transitions. Otherwise falls back to default
        partial_update behaviour.
        """
        instance = self.get_object()

        if "status" in request.data:
            # Cancelar una venta requiere autorización de gerente/admin para cajeros.
            if request.data.get("status") == "cancelled":
                auth_error = check_manager_authorization(request)
                if auth_error:
                    return auth_error

            serializer = SaleStatusSerializer(
                data=request.data,
                context=self.get_serializer_context(),
            )
            serializer.is_valid(raise_exception=True)
            sale = serializer.update(instance, serializer.validated_data)

            read_serializer = SaleSerializer(
                sale,
                context=self.get_serializer_context(),
            )
            return Response(read_serializer.data)

        return super().partial_update(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """
        GET /api/sales/{id}/

        Overrides the default retrieve to add select_related('cash_session__cash_register')
        and avoid an N+1 query when serializing the nested CashSessionMiniSerializer.
        """
        instance = (
            self.get_queryset()
            .select_related('cash_session__cash_register')
            .get(pk=kwargs['pk'])
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        POST /api/sales/

        Validates the payload, creates the sale (including stock deduction),
        and returns the full sale representation using the read serializer.
        """
        write_serializer = SaleCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        write_serializer.is_valid(raise_exception=True)
        sale = write_serializer.save()

        # Return full representation using the read serializer
        read_serializer = SaleSerializer(
            sale,
            context=self.get_serializer_context(),
        )
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)


class SalePrintView:
    """Generate a PDF ticket for a sale."""

    PAYMENT_LABELS = {
        "cash": "Efectivo",
        "card": "Tarjeta",
        "transfer": "Transferencia",
        "qr": "QR",
        "credit": "Crédito",
    }

    def __call__(self, request, pk):
        try:
            sale = (
                Sale.objects
                .prefetch_related("items__product", "items__service")
                .get(pk=pk)
            )
        except Sale.DoesNotExist:
            return HttpResponse("Sale not found", status=404)

        ticket_items = []
        for item in sale.items.all():
            if item.parent_service_item_id is not None:
                continue
            if item.type == "product":
                name = item.product.name if item.product else item.presentation_name or "—"
            else:
                name = item.service.name if item.service else "—"
            ticket_items.append({
                "name": name,
                "quantity": f"{float(item.quantity):.2f}",
                "total_price": f"{float(item.total_price):.2f}",
            })

        subtotal = Decimal(str(sale.subtotal))
        discount_amount = (subtotal * Decimal(str(sale.discount_percentage)) / 100).quantize(Decimal("0.01")) if sale.discount_percentage else Decimal("0.00")
        surcharge_amount = (subtotal * Decimal(str(sale.surcharge_percentage)) / 100).quantize(Decimal("0.01")) if sale.surcharge_percentage else Decimal("0.00")

        context = {
            "business_name": "HappyPet",
            "footer_message": "¡Gracias por su compra!",
            "sale": sale,
            "sale_date": sale.sale_date.strftime("%d/%m/%Y %H:%M"),
            "payment_type": self.PAYMENT_LABELS.get(sale.payment_type, sale.payment_type or "—"),
            "ticket_items": ticket_items,
            "discount_amount": f"{float(discount_amount):.2f}",
            "surcharge_amount": f"{float(surcharge_amount):.2f}",
        }

        django_engine = engines["django"]
        template = django_engine.get_template("sales/ticket_print.html")
        html = template.render(context)

        response = HttpResponse(content_type="application/pdf")
        response["Content-Disposition"] = f"inline; filename=\"ticket-{sale.id}.pdf\""

        pisa_status = pisa.CreatePDF(io.BytesIO(html.encode("utf-8")), dest=response)
        if pisa_status.err:
            return HttpResponse(f"PDF generation error: {pisa_status.err}", status=500)

        return response
