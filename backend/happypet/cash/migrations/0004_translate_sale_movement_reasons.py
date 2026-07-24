from django.db import migrations


def translate_reasons(apps, schema_editor):
    """Traduce a español los motivos auto-generados de movimientos de venta."""
    CashMovement = apps.get_model("cash", "CashMovement")
    for movement in CashMovement.objects.filter(reason__startswith="Sale #"):
        new_reason = (
            movement.reason.replace("Sale #", "Venta #")
            .replace(" completed", " completada")
            .replace(" cancelled", " cancelada")
        )
        CashMovement.objects.filter(pk=movement.pk).update(reason=new_reason)


def revert_reasons(apps, schema_editor):
    CashMovement = apps.get_model("cash", "CashMovement")
    for movement in CashMovement.objects.filter(reason__startswith="Venta #"):
        old_reason = (
            movement.reason.replace("Venta #", "Sale #")
            .replace(" completada", " completed")
            .replace(" cancelada", " cancelled")
        )
        CashMovement.objects.filter(pk=movement.pk).update(reason=old_reason)


class Migration(migrations.Migration):

    dependencies = [
        ("cash", "0003_cashsessionclosure"),
    ]

    operations = [
        migrations.RunPython(translate_reasons, revert_reasons),
    ]
