from django.contrib import admin
from django.utils.html import format_html
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _l

from .models import Reaction


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "kind_display",
        "target_display",
        "site_host",
        "thread_slug",
        "user_display",
        "created_at",
    )
    list_filter = (
        "kind",
        "site_host",
        "created_at",
    )
    search_fields = (
        "thread_slug",
        "user__username",
        "user__email",
        "anon_hash",
    )
    readonly_fields = (
        "site_host",
        "thread_slug",
        "comment",
        "kind",
        "user",
        "anon_hash",
        "created_at",
    )

    @admin.display(description=_l("Reaction"))
    def kind_display(self, obj):
        emoji_map = dict(Reaction.KIND_CHOICES)
        emoji = emoji_map.get(obj.kind, "👍")
        return format_html('<span style="font-size: 16px;">{}</span> <strong>{}</strong>', emoji, obj.kind)

    @admin.display(description=_l("Target"))
    def target_display(self, obj):
        if obj.comment:
            return format_html("💬 {} #{}", _("Comment"), obj.comment.id)
        return format_html("📄 {}: /{}", _("Page"), obj.thread_slug.lstrip("/"))

    @admin.display(description=_l("User / Anon"))
    def user_display(self, obj):
        if obj.user:
            return format_html("👤 {}", obj.user.username)
        return format_html("🕶️ anon: <code>{}...</code>", obj.anon_hash[:8] if obj.anon_hash else "unknown")

    def has_add_permission(self, request):
        return False
