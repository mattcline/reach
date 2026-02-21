from django.contrib import admin
from .models import WaitlistSignup


@admin.register(WaitlistSignup)
class WaitlistSignupAdmin(admin.ModelAdmin):
    list_display = ('email', 'app_name', 'created_at')
    list_filter = ('app_name', 'created_at')
    search_fields = ('email',)
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)
