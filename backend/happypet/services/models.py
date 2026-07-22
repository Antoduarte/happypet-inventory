from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from happypet.products.models import Category


# Create your models here.
class Service(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(blank=True, null=True, max_length=250)
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        related_name="services",
        null=True,
        blank=True,
    )
    create_date = models.DateTimeField(auto_now_add=True)
    update_date = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name
