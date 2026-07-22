CATEGORY_TYPE_CHOICES = [
    ("product", "Producto"),
    ("service", "Servicio"),
]

BASE_UNIT_CHOICES = [
    ("u", "Unidad"),
    ("kg", "Kilogramo"),
    ("g", "Gramo"),
    ("lb", "Libra"),
    ("ml", "Mililitro"),
    ("l", "Litro"),
    ("caja", "Caja"),
]

MOVEMENT_OUT = "out"
MOVEMENT_IN = "in"

MOVEMENT_TYPE_CHOICES = [
    (MOVEMENT_IN, "Ingreso"),
    (MOVEMENT_OUT, "Egreso"),
]

DISCOUNT_NONE = 0
DISCOUNT_5 = 5
DISCOUNT_10 = 10
DISCOUNT_15 = 15
DISCOUNT_20 = 20
DISCOUNT_25 = 25
DISCOUNT_30 = 30

DISCOUNT_CHOICES = [
    (DISCOUNT_NONE, "0%"),
    (DISCOUNT_5, "5%"),
    (DISCOUNT_10, "10%"),
    (DISCOUNT_15, "15%"),
    (DISCOUNT_20, "20%"),
    (DISCOUNT_25, "25%"),
    (DISCOUNT_30, "30%"),
]

PAYMENT_CASH = "cash"
PAYMENT_CARD = "card"
PAYMENT_TRANSFER = "transfer"

PAYMENT_CHOICES = [
    (PAYMENT_CASH, "Efectivo"),
    (PAYMENT_CARD, "Tarjeta"),
    (PAYMENT_TRANSFER, "Transferencia"),
]

SAILE_STATUS_PENDING = "pending"
SAILE_STATUS_COMPLETED = "completed"
SAILE_STATUS_CANCELLED = "cancelled"

SALE_STATUS_CHOICES = [
    (SAILE_STATUS_PENDING, "Pendiente"),
    (SAILE_STATUS_COMPLETED, "Completado"),
    (SAILE_STATUS_CANCELLED, "Cancelado"),
]

SALE_ITEM_PRODUCT = "product"
SALE_ITEM_SERVICE = "service"

SALE_ITEM_TYPE_CHOICES = [
    (SALE_ITEM_PRODUCT, "Producto"),
    (SALE_ITEM_SERVICE, "Servicio"),
]
