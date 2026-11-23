from datetime import timedelta
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.core import mail
from django.utils import timezone

from comments.models import Comment
from comments.notifications import (
    generate_unsubscribe_token,
    verify_unsubscribe_token,
)
from comments.utils import moderate_comment, render_and_sanitize_markdown

User = get_user_model()


def test_markdown_and_sanitization():
    # Bold, italics, code, link
    raw = "**bold** *italic* `code` [Blueshoe](https://blueshoe.de) <script>alert('xss')</script>"
    html = render_and_sanitize_markdown(raw)
    assert "<strong>bold</strong>" in html
    assert "<em>italic</em>" in html
    assert "<code>code</code>" in html
    assert 'href="https://blueshoe.de"' in html
    assert 'rel="nofollow ugc"' in html
    assert "<script>" not in html
    assert "alert" not in html

    # Empty string check
    assert render_and_sanitize_markdown("") == ""


def test_verify_unsubscribe_token_invalid():
    assert verify_unsubscribe_token("invalid_token") is None


def test_moderate_comment_no_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with patch("django.conf.settings.GEMINI_API_KEY", ""):
        status, flag, reason = moderate_comment("Nice article!")
        assert status == "approved"
        assert flag == "clean"
        assert "Auto-approved" in reason


@patch("comments.utils.genai.Client")
def test_moderate_comment_clean(mock_genai_client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    mock_model = MagicMock()
    mock_genai_client.return_value.models = mock_model
    mock_response = MagicMock()
    mock_response.text = '{"flag": "clean", "reason": ""}'
    mock_model.generate_content.return_value = mock_response

    status, flag, reason = moderate_comment("Super helpful article!")
    assert status == "approved"
    assert flag == "clean"


@patch("comments.utils.genai.Client")
def test_moderate_comment_spam(mock_genai_client, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    mock_model = MagicMock()
    mock_genai_client.return_value.models = mock_model
    mock_response = MagicMock()
    mock_response.text = '{"flag": "spam", "reason": "Casino advertisement"}'
    mock_model.generate_content.return_value = mock_response

    status, flag, reason = moderate_comment("Buy cheap watches here!")
    assert status == "pending"
    assert flag == "spam"
    assert reason == "Casino advertisement"


@pytest.mark.django_db
class TestCommentsAPI:
    def test_list_comments(self, client):
        author = User.objects.create_user(username="dev", email="dev@blueshoe.de")
        c1 = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            author=author,
            body_markdown="Top level comment",
            status="approved",
        )
        c2 = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            parent=c1,
            author=author,
            body_markdown="Reply comment",
            status="approved",
        )
        # Pending comment should not show
        Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            author=author,
            body_markdown="Pending comment",
            status="pending",
        )

        res = client.get("/api/comments/?thread_slug=post-1", HTTP_HOST="blueshoe.de")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 1
        assert data[0]["id"] == c1.id
        assert data[0]["is_team"] is True  # blueshoe.de email
        assert len(data[0]["replies"]) == 1
        assert data[0]["replies"][0]["id"] == c2.id

    def test_list_comments_missing_slug(self, client):
        res = client.get("/api/comments/", HTTP_HOST="blueshoe.de")
        assert res.status_code == 422

    def test_email_privacy_guardrail_never_leaks_email_address(self, client):
        # 1. User whose username happens to be an email address
        user = User.objects.create_user(
            username="secret.agent@secretcompany.com", email="secret.agent@secretcompany.com"
        )
        Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="privacy-test",
            author=user,
            body_markdown="I have a comment",
            status="approved",
        )

        # 2. Guest comment where the guest entered an email into the name field
        Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="privacy-test",
            guest_name="guest.user@externaldomain.org",
            body_markdown="Guest comment",
            status="approved",
        )

        res = client.get("/api/comments/?thread_slug=privacy-test", HTTP_HOST="blueshoe.de")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2

        response_text = res.content.decode()
        # Verify NO email addresses or domains are present anywhere in the response
        assert "@" not in data[0]["author_name"]
        assert "@" not in data[1]["author_name"]
        assert "secretcompany.com" not in response_text
        assert "externaldomain.org" not in response_text
        assert data[0]["author_name"] == "secret.agent"
        assert data[1]["author_name"] == "guest.user"

    def test_create_comment_honeypot(self, client):
        res = client.post(
            "/api/comments/",
            data={"thread_slug": "post-1", "body_markdown": "Spam message", "website": "http://spamsite.com"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 400
        assert res.json() == {"error": "Spam detected"}

    def test_create_comment_too_long(self, client):
        res = client.post(
            "/api/comments/",
            data={"thread_slug": "post-1", "body_markdown": "x" * 5001},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 400
        assert "exceeds 5000 characters" in res.json()["error"]

    def test_create_comment_guest_without_altcha(self, client):
        res = client.post(
            "/api/comments/",
            data={"thread_slug": "post-1", "body_markdown": "Guest without captcha"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 400
        assert res.json() == {"error": "Captcha required"}

    @patch("comments.api.moderate_comment")
    def test_create_comment_authenticated(self, mock_mod, client):
        mock_mod.return_value = ("approved", "clean", "")
        user = User.objects.create_user(username="bob", email="bob@test.com")
        client.force_login(user)

        res = client.post(
            "/api/comments/",
            data={"thread_slug": "post-1", "body_markdown": "Hello world from authenticated user"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 201
        data = res.json()
        assert data["author_id"] == user.id
        assert "Hello world" in data["body_html"]

    @patch("comments.api.moderate_comment")
    @patch("comments.api.verify_solution_v1")
    def test_create_comment_guest_with_altcha(self, mock_verify, mock_mod, client):
        mock_verify.return_value = (True, None)
        mock_mod.return_value = ("approved", "clean", "")

        res = client.post(
            "/api/comments/",
            data={
                "thread_slug": "post-1",
                "body_markdown": "Guest message",
                "guest_name": "Friendly Guest",
                "altcha": "dummy_payload_123",
            },
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 201
        data = res.json()
        assert data["author_name"] == "Friendly Guest"

        # Replay prevention test
        res_replay = client.post(
            "/api/comments/",
            data={"thread_slug": "post-1", "body_markdown": "Guest message replay", "altcha": "dummy_payload_123"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res_replay.status_code == 400
        assert res_replay.json() == {"error": "Captcha already used"}

    @patch("comments.api.moderate_comment")
    def test_create_reply_notification(self, mock_mod, client):
        mock_mod.return_value = ("approved", "clean", "")
        parent_author = User.objects.create_user(username="parent_user", email="parent@test.com")
        parent_comment = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            author=parent_author,
            body_markdown="Parent comment",
            notify_replies=True,
            status="approved",
        )

        reply_author = User.objects.create_user(username="reply_user", email="reply@test.com")
        client.force_login(reply_author)

        res = client.post(
            "/api/comments/",
            data={
                "thread_slug": "post-1",
                "parent_id": parent_comment.id,
                "body_markdown": "Replying to your comment!",
            },
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 201
        assert len(mail.outbox) == 1
        assert "New reply to your comment" in mail.outbox[0].subject
        assert "parent@test.com" in mail.outbox[0].to
        assert "https://blueshoe.de/post-1/#comment-" in mail.outbox[0].body
        assert "https://blueshoe.de/api/notifications/unsubscribe/" in mail.outbox[0].body

    @patch("comments.api.moderate_comment")
    def test_update_comment_kulanzzeit(self, mock_mod, client):
        mock_mod.return_value = ("approved", "clean", "")
        user = User.objects.create_user(username="bob", email="bob@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de", thread_slug="post-1", author=user, body_markdown="Original text", status="approved"
        )
        # Simulate comment created 5 minutes ago
        Comment.objects.filter(id=comment.id).update(created_at=timezone.now() - timedelta(minutes=5))
        comment.refresh_from_db()

        client.force_login(user)
        res = client.patch(
            f"/api/comments/{comment.id}/",
            data={"body_markdown": "Edited text"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["edited_at"] is not None

    def test_update_comment_not_author(self, client):
        user1 = User.objects.create_user(username="bob", email="bob@test.com")
        user2 = User.objects.create_user(username="eve", email="eve@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de", thread_slug="post-1", author=user1, body_markdown="Bob text", status="approved"
        )
        client.force_login(user2)
        res = client.patch(
            f"/api/comments/{comment.id}/",
            data={"body_markdown": "Eve tries to hijack"},
            content_type="application/json",
            HTTP_HOST="blueshoe.de",
        )
        assert res.status_code == 404

    def test_delete_comment(self, client):
        user = User.objects.create_user(username="bob", email="bob@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            author=user,
            body_markdown="Text to delete",
            status="approved",
        )
        client.force_login(user)
        res = client.delete(f"/api/comments/{comment.id}/", HTTP_HOST="blueshoe.de")
        assert res.status_code == 204
        assert not Comment.objects.filter(id=comment.id).exists()

    def test_delete_comment_not_author(self, client):
        user1 = User.objects.create_user(username="bob", email="bob@test.com")
        user2 = User.objects.create_user(username="eve", email="eve@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de", thread_slug="post-1", author=user1, body_markdown="Bob text", status="approved"
        )
        client.force_login(user2)
        res = client.delete(f"/api/comments/{comment.id}/", HTTP_HOST="blueshoe.de")
        assert res.status_code == 404

    def test_captcha_challenge(self, client):
        res = client.get("/api/captcha/challenge/")
        assert res.status_code == 200
        data = res.json()
        assert "challenge" in data

    def test_unsubscribe_notification(self, client):
        user = User.objects.create_user(username="bob", email="bob@test.com")
        comment = Comment.objects.create(
            site_host="blueshoe.de",
            thread_slug="post-1",
            author=user,
            body_markdown="Test notification",
            notify_replies=True,
            status="approved",
        )
        token = generate_unsubscribe_token(comment.id)
        res = client.get(f"/api/notifications/unsubscribe/{token}/")
        assert res.status_code == 200
        assert res.json() == {"status": "unsubscribed"}

        comment.refresh_from_db()
        assert comment.notify_replies is False
