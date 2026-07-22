# Generated manually for sale-status-workflow change

from django.db import migrations, models


def update_canceled_to_cancelled(apps, schema_editor):
    """Update existing sale rows from 'canceled' to 'cancelled'."""
    Sale = apps.get_model("sales", "Sale")
    Sale.objects.filter(status="canceled").update(status="cancelled")


def revert_cancelled_to_canceled(apps, schema_editor):
    """Revert sale rows from 'cancelled' back to 'canceled' (rollback)."""
    Sale = apps.get_model("sales", "Sale")
    Sale.objects.filter(status="cancelled").update(status="canceled")


class Migration(migrations.Migration):
    dependencies = [
        ("sales", "0004_sale_cash_session"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sale",
            name="status",
            field=models.CharField(
                blank=True,
                choices=[
                    ("pending", "Pendiente"),
                    ("completed", "Completado"),
                    ("cancelled", "Cancelado"),
                ],
                default="pending",
                max_length=50,
                null=True,
            ),
        ),
        migrations.RunPython(
            update_canceled_to_cancelled,
            reverse_code=revert_cancelled_to_canceled,
        ),
    ]
