from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _

from .models import EmailLog, User

admin.site.register(User, UserAdmin)


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = (
        "sent_at_display",
        "recipient",
        "trigger_badge",
        "subject_display",
        "site_host",
        "outgoing_backend",
        "status_badge",
    )
    list_filter = ("status", "trigger", "site_host", "sent_at")
    search_fields = ("recipient", "sender", "subject", "content_text", "site_host", "page_url", "error_message")
    date_hierarchy = "sent_at"
    ordering = ["-sent_at"]

    fieldsets = (
        (
            _("Dispatch Status"),
            {
                "fields": (
                    ("sent_at", "status_display", "trigger_badge"),
                    "outgoing_backend",
                    "error_message",
                )
            },
        ),
        (
            _("Addressing & Routing"),
            {
                "fields": (
                    ("sender", "recipient"),
                    ("site_host", "page_url"),
                )
            },
        ),
        (
            _("Message Content"),
            {
                "fields": (
                    "subject",
                    "content_preview",
                    "content_text",
                    "content_html",
                )
            },
        ),
    )

    readonly_fields = (
        "sent_at",
        "status_display",
        "trigger_badge",
        "outgoing_backend",
        "error_message",
        "sender",
        "recipient",
        "site_host",
        "page_url",
        "subject",
        "content_preview",
        "content_text",
        "content_html",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    @admin.display(description=_("Sent At"), ordering="sent_at")
    def sent_at_display(self, obj):
        return obj.sent_at.strftime("%Y-%m-%d %H:%M:%S")

    @admin.display(description=_("Subject"), ordering="subject")
    def subject_display(self, obj):
        return obj.subject[:60] + "..." if len(obj.subject) > 60 else obj.subject

    @admin.display(description=_("Trigger"), ordering="trigger")
    def trigger_badge(self, obj):
        colors = {
            EmailLog.Trigger.MAGIC_LINK: "#0284c7",  # Sky blue
            EmailLog.Trigger.REPLY_NOTIFICATION: "#7c3aed",  # Purple
            EmailLog.Trigger.COMMENT_PENDING_REVIEW: "#d97706",  # Amber
            EmailLog.Trigger.SYSTEM: "#475569",  # Slate
        }
        color = colors.get(obj.trigger, "#475569")
        label = obj.get_trigger_display()
        return format_html(
            '<span style="background: {}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">{}</span>',
            color,
            label,
        )

    @admin.display(description=_("Status"), ordering="status")
    def status_badge(self, obj):
        if obj.status == EmailLog.Status.SENT:
            return format_html(
                '<span style="background: #10b981; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✓ {}</span>',
                _("Sent"),
            )
        return format_html(
            '<span style="background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✕ {}</span>',
            _("Failed"),
        )

    @admin.display(description=_("Status"))
    def status_display(self, obj):
        return self.status_badge(obj)

    @admin.display(description=_("Content Preview"))
    def content_preview(self, obj):
        if obj.content_html:
            return format_html(
                '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; max-height: 300px; overflow-y: auto;">{}</div>',
                format_html(obj.content_html),
            )
        return format_html(
            '<pre style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap; font-family: monospace;">{}</pre>',
            obj.content_text,
        )
