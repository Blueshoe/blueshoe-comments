from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _l

from .models import Comment


class CommentReplyInline(admin.TabularInline):
    model = Comment
    fk_name = "parent"
    extra = 0
    fields = ("author_display", "content_snippet", "status", "moderation_flag", "created_at")
    readonly_fields = ("author_display", "content_snippet", "created_at")
    show_change_link = True

    def author_display(self, obj):
        if obj.is_deleted_author:
            return _("Deleted User")
        return obj.author.username if obj.author else _("Guest: {name}").format(name=obj.guest_name)

    def content_snippet(self, obj):
        return (obj.body_markdown[:60] + "...") if len(obj.body_markdown) > 60 else obj.body_markdown


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status_badge",
        "moderation_flag_badge",
        "site_host",
        "thread_slug",
        "author_display",
        "content_snippet",
        "source_url_link",
        "created_at",
    )
    list_filter = (
        "status",
        "moderation_flag",
        "site_host",
        "is_deleted_author",
        "created_at",
        "edited_at",
    )
    search_fields = (
        "body_markdown",
        "thread_slug",
        "guest_name",
        "author__username",
        "author__email",
        "ip_hash",
        "moderation_reason",
    )
    readonly_fields = (
        "body_html_preview",
        "source_url_link",
        "ip_hash",
        "edited_at",
        "moderated_at",
        "moderated_by",
        "created_at",
        "updated_at",
    )
    inlines = (CommentReplyInline,)
    actions = ("approve_comments", "reject_comments", "mark_as_spam")

    fieldsets = (
        (
            _l("Moderation & Review"),
            {
                "fields": (
                    ("status", "moderation_flag"),
                    "moderation_reason",
                    ("moderated_by", "moderated_at"),
                    "source_url_link",
                ),
            },
        ),
        (
            _l("Content & Preview"),
            {
                "fields": (
                    "body_markdown",
                    "body_html_preview",
                ),
            },
        ),
        (
            _l("Tenant & Thread Context"),
            {
                "fields": (
                    "site_host",
                    "thread_slug",
                    "parent",
                ),
            },
        ),
        (
            _l("Author & Tracking"),
            {
                "fields": (
                    "author",
                    "guest_name",
                    ("is_deleted_author", "notify_replies"),
                    "ip_hash",
                    ("edited_at", "created_at", "updated_at"),
                ),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description=_l("Status"))
    def status_badge(self, obj):
        colors = {
            "approved": "#28a745",
            "pending": "#fd7e14",
            "rejected": "#dc3545",
            "spam": "#6c757d",
        }
        color = colors.get(obj.status, "#333")
        return format_html(
            '<span style="background-color: {}; color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    @admin.display(description=_l("AI Flag"))
    def moderation_flag_badge(self, obj):
        if not obj.moderation_flag:
            return "-"
        colors = {
            "clean": "#28a745",
            "spam": "#6c757d",
            "illegal": "#721c24",
        }
        color = colors.get(obj.moderation_flag, "#333")
        return format_html(
            '<span style="background-color: {}; color: #fff; padding: 2px 6px; border-radius: 3px; font-size: 10px;">{}</span>',
            color,
            obj.moderation_flag.upper(),
        )

    @admin.display(description=_l("Author"))
    def author_display(self, obj):
        if obj.is_deleted_author:
            return mark_safe(f"<em>{_('Deleted User')}</em>")
        if obj.author:
            team_badge = (
                ' <span style="background: #007bff; color: white; padding: 1px 4px; border-radius: 3px; font-size: 9px;">TEAM</span>'
                if obj.is_team
                else ""
            )
            return format_html("{}{}", obj.author.get_full_name() or obj.author.username, mark_safe(team_badge))
        guest = obj.guest_name or _("Anonymous")
        return format_html("{}: {}", _("Guest"), guest)

    @admin.display(description=_l("Content"))
    def content_snippet(self, obj):
        text = obj.body_markdown.replace("\n", " ")
        return (text[:60] + "...") if len(text) > 60 else text

    @admin.display(description=_l("Live Link"))
    def source_url_link(self, obj):
        url = f"https://{obj.site_host}/{obj.thread_slug.lstrip('/')}/#comment-{obj.id}"
        return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">↗ {}</a>', url, _("View Live"))

    @admin.display(description=_l("HTML Preview"))
    def body_html_preview(self, obj):
        if not obj.body_html:
            return "-"
        return format_html(
            '<div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; max-width: 700px;">{}</div>',
            mark_safe(obj.body_html),
        )

    @admin.action(description=_l("Approve selected comments"))
    def approve_comments(self, request, queryset):
        count = queryset.update(status="approved", moderated_by=request.user, moderated_at=timezone.now())
        self.message_user(request, _("{count} comment(s) successfully approved.").format(count=count))

    @admin.action(description=_l("Reject selected comments"))
    def reject_comments(self, request, queryset):
        count = queryset.update(status="rejected", moderated_by=request.user, moderated_at=timezone.now())
        self.message_user(request, _("{count} comment(s) rejected.").format(count=count))

    @admin.action(description=_l("Mark selected comments as spam"))
    def mark_as_spam(self, request, queryset):
        count = queryset.update(
            status="spam", moderation_flag="spam", moderated_by=request.user, moderated_at=timezone.now()
        )
        self.message_user(request, _("{count} comment(s) marked as spam.").format(count=count))
