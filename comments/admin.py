from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html, mark_safe
from django.utils.translation import gettext as _
from django.utils.translation import gettext_lazy as _l

from .models import Comment
from .utils import moderate_comment


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
        "site_host",
        "thread_slug",
        "author_display",
        "content_snippet",
        "source_url_link",
        "created_at",
    )
    list_display_links = (
        "id",
        "author_display",
        "content_snippet",
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
    actions = ("approve_comments", "reject_comments", "mark_as_spam", "rerun_ai_moderation")

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

    def view_on_site(self, obj):
        return obj.get_absolute_url()

    @admin.display(description=_l("Status"))
    def status_badge(self, obj):
        if obj.status == "approved":
            return format_html(
                '<span style="background-color: #16a34a; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 11px;">✅ {}</span>',
                _("Approved"),
            )
        elif obj.status == "rejected":
            flag_info = f" ({obj.moderation_flag.upper()})" if obj.moderation_flag else ""
            return format_html(
                '<span style="background-color: #dc2626; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 11px;" title="{}">⛔ {}{}</span>',
                obj.moderation_reason or "",
                _("Rejected"),
                flag_info,
            )
        else:
            flag_info = (
                f" ({obj.moderation_flag.upper()})" if obj.moderation_flag and obj.moderation_flag != "clean" else ""
            )
            return format_html(
                '<span style="background-color: #d97706; color: #fff; padding: 2px 7px; border-radius: 4px; font-weight: 600; font-size: 11px;" title="{}">⏳ {}{}</span>',
                obj.moderation_reason or "",
                _("Pending"),
                flag_info,
            )

    @admin.display(description=_l("AI Flag"))
    def moderation_flag_badge(self, obj):
        if not obj.moderation_flag:
            return "-"
        colors = {
            "clean": "#16a34a",
            "spam": "#d97706",
            "illegal": "#dc2626",
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
            maintainer_badge = (
                ' <span style="background: #0284c7; color: white; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: bold;">MAINTAINER</span>'
                if obj.is_team
                else ""
            )
            return format_html("{}{}", obj.author.get_full_name() or obj.author.username, mark_safe(maintainer_badge))
        guest = obj.guest_name or _("Anonymous")
        return format_html("{}: {}", _("Guest"), guest)

    @admin.display(description=_l("Content"))
    def content_snippet(self, obj):
        text = obj.body_markdown.replace("\n", " ").strip()
        truncated = (text[:75] + "…") if len(text) > 75 else text
        return format_html(
            '<span title="{}" style="display: inline-block; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;">{}</span>',
            obj.body_markdown,
            truncated,
        )

    @admin.display(description=_l("Live Link"))
    def source_url_link(self, obj):
        url = obj.get_absolute_url()
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

    @admin.action(description=_l("Re-run AI moderation (and auto-publish clean comments)"))
    def rerun_ai_moderation(self, request, queryset):
        approved_count = 0
        flagged_count = 0
        now = timezone.now()

        for comment in queryset:
            status, flag, reason = moderate_comment(comment.body_markdown)
            comment.moderation_flag = flag
            comment.moderation_reason = reason
            comment.moderated_at = now
            comment.moderated_by = request.user

            if flag == "clean":
                comment.status = "approved"
                approved_count += 1
            else:
                comment.status = status
                flagged_count += 1

            comment.save(
                update_fields=["status", "moderation_flag", "moderation_reason", "moderated_at", "moderated_by"]
            )

        self.message_user(
            request,
            _("{total} comment(s) re-moderated: {approved} auto-published, {flagged} pending/rejected.").format(
                total=queryset.count(),
                approved=approved_count,
                flagged=flagged_count,
            ),
        )
