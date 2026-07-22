from django.db import migrations


# Mapea valores legacy/variantes de base_unit al código válido de BASE_UNIT_CHOICES.
BASE_UNIT_MAP = {
    "u": "u", "unidad": "u", "unidades": "u",
    "lb": "lb", "libra": "lb", "libras": "lb",
    "kg": "kg", "kilogramo": "kg", "kilogramos": "kg", "kilo": "kg",
    "g": "g", "gramo": "g", "gramos": "g",
    "ml": "ml", "mililitro": "ml", "mililitros": "ml",
    "l": "l", "litro": "l", "litros": "l",
    "caja": "caja", "cajas": "caja",
}


def normalize_base_unit(apps, schema_editor):
    Product = apps.get_model("products", "Product")
    for product in Product.objects.all():
        normalized = BASE_UNIT_MAP.get((product.base_unit or "").strip().lower(), "u")
        if normalized != product.base_unit:
            product.base_unit = normalized
            product.save(update_fields=["base_unit"])


class Migration(migrations.Migration):

    dependencies = [
        ("products", "0007_product_is_sale_product_product_is_service_supply"),
    ]

    operations = [
        migrations.RunPython(normalize_base_unit, migrations.RunPython.noop),
    ]
