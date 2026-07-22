from django.contrib import admin
from .models import Product, ProductPresentation, InventoryMovement, MovementBatch, Category


class PresentationInline(admin.TabularInline):
    model = ProductPresentation
    extra = 1
    fields = ("name", "multiplier", "price", "barcode", "is_active")
    readonly_fields = ()


class MovementItemInline(admin.TabularInline):
    model = InventoryMovement
    extra = 0
    fields = ("product", "presentation", "movement_type", "quantity", "previous_stock", "new_stock")
    readonly_fields = ("previous_stock", "new_stock", "movement_type")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "is_active")
    list_filter = ("type", "is_active")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "base_unit", "stock", "price", "is_active", "category")
    list_filter = ("is_active", "category", "base_unit")
    search_fields = ("name", "code")
    inlines = [PresentationInline]
    readonly_fields = ("deleted_at",)


@admin.register(ProductPresentation)
class ProductPresentationAdmin(admin.ModelAdmin):
    list_display = ("product", "name", "multiplier", "price", "barcode", "is_active")
    list_select_related = ("product",)
    search_fields = ("name", "product__name", "barcode")
    list_filter = ("is_active",)


@admin.register(MovementBatch)
class MovementBatchAdmin(admin.ModelAdmin):
    list_display = ("id", "movement_type", "notes", "created_at")
    list_filter = ("movement_type",)
    search_fields = ("notes",)
    ordering = ("-created_at",)
    inlines = [MovementItemInline]
    readonly_fields = ("created_at",)


@admin.register(InventoryMovement)
class InventoryMovementAdmin(admin.ModelAdmin):
    list_display = (
        "product", "movement_type", "quantity",
        "previous_stock", "new_stock", "movement_date",
    )
    list_select_related = ("product", "batch")
    readonly_fields = ("previous_stock", "new_stock", "movement_date")
    list_filter = ("movement_type",)
    search_fields = ("product__name", "notes")
    ordering = ("-movement_date",)

