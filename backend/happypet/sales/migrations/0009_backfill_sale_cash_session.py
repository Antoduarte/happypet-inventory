from django.db import migrations
from django.db.models import Q


def _find_batch_for_sale(sale, MovementBatch):
    """Return the movement batch created for this sale, if any."""
    return MovementBatch.objects.filter(
        Q(notes=f"Venta #{sale.pk}")
        | Q(notes=f"Reversión venta cancelada #{sale.pk}")
    ).first()


def _resolve_session_for_user(user, CashSession):
    """Pick an open session for the user, falling back to the most recent one."""
    session = CashSession.objects.filter(
        user=user, status="open"
    ).first()
    if session:
        return session
    return CashSession.objects.filter(user=user).order_by("-opened_at").first()


def backfill_sale_cash_sessions(apps, schema_editor):
    Sale = apps.get_model("sales", "Sale")
    MovementBatch = apps.get_model("products", "MovementBatch")
    CashSession = apps.get_model("cash", "CashSession")

    for sale in Sale.objects.filter(cash_session__isnull=True):
        batch = _find_batch_for_sale(sale, MovementBatch)
        if batch and batch.created_by_id:
            session = _resolve_session_for_user(batch.created_by, CashSession)
            if session:
                sale.cash_session = session
                sale.save(update_fields=["cash_session"])


def reverse_backfill(apps, schema_editor):
    """No-op: we cannot know which sales previously had a NULL cash session."""


class Migration(migrations.Migration):
    dependencies = [
        ("sales", "0008_alter_sale_payment_type"),
        ("products", "0009_movementbatch_created_by"),
    ]

    operations = [
        migrations.RunPython(backfill_sale_cash_sessions, reverse_backfill),
    ]
