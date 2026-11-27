from unittest.mock import patch

import pytest
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model

from comments.admin import CommentAdmin
from comments.models import Comment
from reactions.admin import ReactionAdmin
from reactions.models import Reaction

User = get_user_model()


class DummyRequest:
    def __init__(self, user):
        self.user = user
        self.messages = []

    def build_absolute_uri(self):
        return "http://localhost/"


@pytest.mark.django_db
class TestAdminModerationAndObservability:
    def test_comment_admin_displays_and_actions(self, rf):
        staff = User.objects.create_superuser(username="admin", email="admin@blueshoe.de", password="password")
        author = User.objects.create_user(username="author", email="author@blueshoe.de")

        c = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="blog/post-1",
            author=author,
            body_markdown="First **markdown** comment",
            status="pending",
            moderation_flag="illegal",
            moderation_reason="Flagged by AI",
        )

        admin_instance = CommentAdmin(Comment, AdminSite())

        # Test badges & previews
        status_html = admin_instance.status_badge(c)
        assert "Pending" in status_html

        flag_html = admin_instance.moderation_flag_badge(c)
        assert "ILLEGAL" in flag_html

        author_html = admin_instance.author_display(c)
        assert "MAINTAINER" in author_html
        assert "author" in author_html

        snippet = admin_instance.content_snippet(c)
        assert "First **markdown** comment" in snippet

        source_link = admin_instance.source_url_link(c)
        assert "https://www.blueshoe.de/blog/post-1/#comment-" in source_link

        preview = admin_instance.body_html_preview(c)
        assert "First" in preview

        # Test deleted author display
        c.is_deleted_author = True
        assert "Deleted User" in admin_instance.author_display(c)

        # Test guest author display
        c.is_deleted_author = False
        c.author = None
        c.guest_name = "Max"
        assert "Guest: Max" in admin_instance.author_display(c)

        # Test bulk actions
        request = rf.get("/")
        request.user = staff
        from django.contrib.messages.middleware import MessageMiddleware
        from django.contrib.sessions.middleware import SessionMiddleware

        SessionMiddleware(lambda req: None).process_request(request)
        request.session.save()
        MessageMiddleware(lambda req: None).process_request(request)

        qs = Comment.objects.filter(id=c.id)

        # Approve
        admin_instance.approve_comments(request, qs)
        c.refresh_from_db()
        assert c.status == "approved"
        assert c.moderated_by == staff
        assert c.moderated_at is not None

        # Reject
        admin_instance.reject_comments(request, qs)
        c.refresh_from_db()
        assert c.status == "rejected"

        # Spam
        admin_instance.mark_as_spam(request, qs)
        c.refresh_from_db()
        assert c.status == "spam"
        assert c.moderation_flag == "spam"

        # Re-run AI moderation: clean -> auto-publish
        with patch("comments.admin.moderate_comment") as mock_mod:
            mock_mod.return_value = ("approved", "clean", "")
            admin_instance.rerun_ai_moderation(request, qs)
            c.refresh_from_db()
            assert c.status == "approved"
            assert c.moderation_flag == "clean"

        # Re-run AI moderation: spam -> pending with reason
        with patch("comments.admin.moderate_comment") as mock_mod:
            mock_mod.return_value = ("pending", "spam", "Flagged as advertising")
            admin_instance.rerun_ai_moderation(request, qs)
            c.refresh_from_db()
            assert c.status == "pending"
            assert c.moderation_flag == "spam"
            assert c.moderation_reason == "Flagged as advertising"

    def test_reaction_admin_observability(self, rf):
        user = User.objects.create_user(username="fan", email="fan@test.com")
        r_page = Reaction.objects.create(site_host="blueshoe.de", thread_slug="article-1", kind="rocket", user=user)
        r_anon = Reaction.objects.create(
            site_host="blueshoe.de", thread_slug="article-1", kind="love", anon_hash="abcdef0123456789"
        )

        admin_instance = ReactionAdmin(Reaction, AdminSite())

        # Kind display
        kind_html = admin_instance.kind_display(r_page)
        assert "rocket" in kind_html
        assert "🚀" in kind_html

        # Target display
        target_html = admin_instance.target_display(r_page)
        assert "Page: /article-1" in target_html

        # User displays
        user_html = admin_instance.user_display(r_page)
        assert "fan" in user_html

        anon_html = admin_instance.user_display(r_anon)
        assert "abcdef01" in anon_html

        # Add permission is False
        assert admin_instance.has_add_permission(rf.get("/")) is False

    def test_email_log_admin(self, rf):
        from users.admin import EmailLogAdmin
        from users.models import EmailLog

        staff = User.objects.create_superuser(username="admin_mail", email="admin_mail@blueshoe.de")
        req = rf.get("/")
        req.user = staff

        log = EmailLog.objects.create(
            recipient="reader@test.com",
            sender="noreply@blueshoe.de",
            subject="Your Magic Login Link",
            content_text="Hello world",
            trigger=EmailLog.Trigger.MAGIC_LINK,
            site_host="community.blueshoe.io",
            page_url="https://www.blueshoe.io/blog/post-1/",
            outgoing_backend="SMTP (localhost:587, TLS)",
            status=EmailLog.Status.SENT,
        )

        admin_instance = EmailLogAdmin(EmailLog, AdminSite())

        # Badges
        assert "Magic Login Link" in admin_instance.trigger_badge(log)
        assert "Sent" in admin_instance.status_badge(log)
        assert "Your Magic Login Link" in admin_instance.subject_display(log)
        assert "Hello world" in admin_instance.content_preview(log)

        # Permissions: no add, no change, delete allowed for superuser
        assert admin_instance.has_add_permission(req) is False
        assert admin_instance.has_change_permission(req, log) is False
        assert admin_instance.has_delete_permission(req, log) is True
