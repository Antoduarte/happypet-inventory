from rest_framework import serializers
from .models import Service
from happypet.products.models import Category
from happypet.products.serializers import CategorySerializer


class ServiceSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Service
        fields = ["id", "name", "description", "price", "is_active", "category", "category_id"]
