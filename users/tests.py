from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in
from django.utils import timezone

from comments.models import Comment

User = get_user_model()


@pytest.mark.django_db
class TestUsersAPI:
    def test_delete_me_unauthenticated(self, client):
        res = client.delete("/api/me/", data={"confirm": True}, content_type="application/json")
        assert res.status_code == 401

    def test_delete_me_reauth_required_if_no_last_login(self, client):
        user = User.objects.create_user(username="testuser", email="test@example.com", password="password")
        client.force_login(user)
        User.objects.filter(id=user.id).update(last_login=None)

        res = client.delete("/api/me/", data={"confirm": True}, content_type="application/json")
        assert res.status_code == 403
        assert res.json() == {"code": "reauth_required"}

    def test_delete_me_reauth_required_if_last_login_too_old(self, client):
        user = User.objects.create_user(username="testuser", email="test@example.com", password="password")
        client.force_login(user)
        User.objects.filter(id=user.id).update(last_login=timezone.now() - timedelta(minutes=15))

        res = client.delete("/api/me/", data={"confirm": True}, content_type="application/json")
        assert res.status_code == 403
        assert res.json() == {"code": "reauth_required"}

    def test_delete_me_missing_confirm(self, client):
        user = User.objects.create_user(username="testuser", email="test@example.com", password="password")
        user.last_login = timezone.now()
        user.save()
        client.force_login(user)

        res = client.delete("/api/me/", data={"confirm": False}, content_type="application/json")
        assert res.status_code == 400

    def test_delete_me_success_and_anonymize_comments(self, client):
        user = User.objects.create_user(username="alice", email="alice@example.com", password="password")
        user.last_login = timezone.now()
        user.save()

        comment = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="article-1",
            author=user,
            body_markdown="Alice's comment",
            status="approved",
            notify_replies=True,
            ip_hash="salted_hash",
        )

        client.force_login(user)
        res = client.delete("/api/me/", data={"confirm": True}, content_type="application/json")
        assert res.status_code == 204

        # User deleted
        assert not User.objects.filter(username="alice").exists()

        # Comment anonymized
        comment.refresh_from_db()
        assert comment.author is None
        assert comment.guest_name == "Deleted User"
        assert comment.is_deleted_author is True
        assert comment.notify_replies is False
        assert comment.ip_hash == ""

    def test_dynamic_cookie_domain_middleware(self, client):
        res = client.get("/docs/", HTTP_HOST="community.blueshoe.de")
        assert "community_vid" in res.cookies
        assert res.cookies["community_vid"]["domain"] == ".blueshoe.de"

    def test_staff_session_length_signal(self, rf):
        staff_user = User.objects.create_user(username="staff", email="staff@blueshoe.de", is_staff=True)
        request = rf.get("/")
        # Add session engine
        from django.contrib.sessions.backends.db import SessionStore

        request.session = SessionStore()
        user_logged_in.send(sender=User, request=request, user=staff_user)
        assert request.session.get_expiry_age() == 12 * 60 * 60
