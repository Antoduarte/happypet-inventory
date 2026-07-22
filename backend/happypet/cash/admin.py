from django.contrib import admin
from .models import CashRegister, CashSession, CashMovement


@admin.register(CashRegister)
class CashRegisterAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "branch", "is_active", "created_at"]
    list_filter = ["is_active", "branch"]
    search_fields = ["name", "branch"]


@admin.register(CashSession)
class CashSessionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "cash_register",
        "user",
        "opening_amount",
        "expected_amount",
        "counted_amount",
        "difference",
        "status",
        "opened_at",
        "closed_at",
    ]
    list_filter = ["status", "cash_register"]
    search_fields = ["cash_register__name", "user__name"]


@admin.register(CashMovement)
class CashMovementAdmin(admin.ModelAdmin):
    list_display = ["id", "cash_session", "type", "amount", "reason", "created_by", "created_at"]
    list_filter = ["type", "created_at"]
    search_fields = ["reason", "created_by__name"]