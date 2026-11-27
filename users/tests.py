from datetime import timedelta

import pytest
from allauth.socialaccount.models import SocialApp
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in
from django.contrib.sites.models import Site
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

    def test_list_auth_providers(self, client):
        site = Site.objects.get_current()
        app = SocialApp.objects.create(provider="github", name="GitHub", client_id="test_gh_client_id")
        app.sites.add(site)

        res = client.get("/api/auth/providers/")
        assert res.status_code == 200
        data = res.json()
        assert len(data) >= 1
        assert any(p["id"] == "github" and p["name"] == "GitHub" for p in data)

    def test_get_auth_session(self, client):
        # 1. Unauthenticated
        res1 = client.get("/api/auth/session/")
        assert res1.status_code == 200
        assert res1.json() == {"is_authenticated": False, "user": None}

        # 2. Authenticated team user
        user = User.objects.create_user(
            username="teamdev",
            email="dev@blueshoe.de",
            first_name="Dev",
            last_name="Blueshoe",
        )
        client.force_login(user)

        res2 = client.get("/api/auth/session/")
        assert res2.status_code == 200
        data = res2.json()
        assert data["is_authenticated"] is True
        assert data["user"]["username"] == "teamdev"
        assert data["user"]["is_team"] is True
        assert data["user"]["is_maintainer"] is True
        assert data["user"]["name"] == "Dev Blueshoe"

    def test_logout(self, client):
        user = User.objects.create_user(username="logoutuser", email="logout@example.com")
        client.force_login(user)

        res = client.post("/api/auth/logout/")
        assert res.status_code == 200
        assert res.json() == {"status": "logged_out"}

        # Verify session is cleared
        session_res = client.get("/api/auth/session/")
        assert session_res.json()["is_authenticated"] is False

    def test_oauth_error_page_domain_sensitive(self, client):
        site = Site.objects.get_current()
        app = SocialApp.objects.create(provider="github", name="GitHub", client_id="test_client_id")
        app.sites.add(site)

        # 1. IO Domain
        res_io = client.get("/accounts/github/login/callback/", HTTP_HOST="community.blueshoe.io")
        assert res_io.status_code == 401
        content_io = res_io.content.decode()
        assert "Blue_Logo_H_white.png" in content_io
        assert "We're sorry!" in content_io
        assert "https://www.blueshoe.io/blog" in content_io
        assert "Return to blueshoe.io Blog" in content_io

        # 2. DE Domain
        res_de = client.get("/accounts/github/login/callback/", HTTP_HOST="community.blueshoe.de")
        assert res_de.status_code == 401
        content_de = res_de.content.decode()
        assert "https://www.blueshoe.de/blog" in content_de
        assert "Zum blueshoe.de Blog" in content_de

    def test_oauth_login_cancelled_no_reverse_match_fix(self, client):
        site = Site.objects.get_current()
        site.domain = "community.blueshoe.io"
        site.save()

        app, _ = SocialApp.objects.get_or_create(provider="github", name="GitHub", client_id="test_client_id")
        app.sites.add(site)

        # GitHub passes error=access_denied when user cancels OAuth consent
        res = client.get(
            "/accounts/github/login/callback/?error=access_denied&error_description=The+user+has+denied+your+application+access.",
            HTTP_HOST="community.blueshoe.io",
            follow=True,
        )
        assert res.status_code in (200, 401)
        content = res.content.decode()
        assert "Authentication Notice" in content or "cancelled" in content.lower()
        assert "Blueshoe" in content

        # Direct test of the cancelled view
        res_cancelled = client.get("/accounts/social/login/cancelled/")
        assert res_cancelled.status_code == 200
        assert "cancelled" in res_cancelled.content.decode().lower()

    def test_headless_oauth_provider_redirect_supports_get(self, client):
        site = Site.objects.get_current()
        site.domain = "community.blueshoe.io"
        site.save()

        app, _ = SocialApp.objects.get_or_create(provider="github", name="GitHub", client_id="test_client_id")
        app.sites.add(site)

        res = client.get(
            "/_allauth/browser/v1/auth/provider/redirect?provider=github&callback_url=https://www.blueshoe.io/auth-callback.html",
            HTTP_HOST="community.blueshoe.io",
            HTTP_X_FORWARDED_PROTO="https",
        )
        assert res.status_code == 302
        assert "github.com/login/oauth/authorize" in res.headers["Location"]
        assert "redirect_uri=https%3A%2F%2Fcommunity.blueshoe.io" in res.headers["Location"]

    def test_linkedin_oauth2_uses_openid_connect_scopes(self, client):
        site = Site.objects.get_current()
        site.domain = "community.blueshoe.io"
        site.save()

        app, _ = SocialApp.objects.get_or_create(
            provider="linkedin_oauth2", name="LinkedIn", client_id="test_li_client"
        )
        app.sites.add(site)

        res = client.get(
            "/_allauth/browser/v1/auth/provider/redirect?provider=linkedin_oauth2&callback_url=https://www.blueshoe.io/auth-callback.html&process=login",
            HTTP_HOST="community.blueshoe.io",
            HTTP_X_FORWARDED_PROTO="https",
        )
        assert res.status_code == 302
        location = res.headers["Location"]
        assert "linkedin.com/oauth/v2/authorization" in location
        # Verify modern OpenID Connect scopes are requested and legacy r_emailaddress is NOT requested
        assert "openid" in location
        assert "email" in location
        assert "r_emailaddress" not in location
        assert "r_liteprofile" not in location
        assert (
            "redirect_uri=https%3A%2F%2Fcommunity.blueshoe.io%2Faccounts%2Flinkedin_oauth2%2Flogin%2Fcallback%2F"
            in location
        )

    def test_twitter_oauth2_redirect_and_pkce(self, client):
        site = Site.objects.get_current()
        site.domain = "community.blueshoe.io"
        site.save()

        app, _ = SocialApp.objects.get_or_create(provider="twitter_oauth2", name="X", client_id="test_x_client_id")
        app.sites.add(site)

        res = client.get(
            "/_allauth/browser/v1/auth/provider/redirect?provider=twitter_oauth2&callback_url=https://www.blueshoe.io/auth-callback.html&process=login",
            HTTP_HOST="community.blueshoe.io",
            HTTP_X_FORWARDED_PROTO="https",
        )
        assert res.status_code == 302
        location = res.headers["Location"]
        assert "x.com/i/oauth2/authorize" in location
        assert "code_challenge=" in location
        assert "code_challenge_method=S256" in location
        assert (
            "redirect_uri=https%3A%2F%2Fcommunity.blueshoe.io%2Faccounts%2Ftwitter_oauth2%2Flogin%2Fcallback%2F"
            in location
        )

    def test_magic_link_flow(self, client, mailoutbox):
        # 1. Providers endpoint includes email_link
        prov_res = client.get("/api/auth/providers/")
        assert prov_res.status_code == 200
        provider_ids = [p["id"] for p in prov_res.json()]
        assert "email_link" in provider_ids

        # 2. Invalid email format
        bad_req = client.post(
            "/api/auth/magic-link/request/",
            data={"email": "not-an-email"},
            content_type="application/json",
        )
        assert bad_req.status_code == 400

        # 3. Valid email request dispatches magic link
        req_res = client.post(
            "/api/auth/magic-link/request/",
            data={"email": "reader@example.com", "next_url": "https://www.blueshoe.io/blog/post-1/"},
            content_type="application/json",
            HTTP_HOST="community.blueshoe.io",
        )
        assert req_res.status_code == 200
        assert req_res.json()["status"] == "email_sent"
        assert len(mailoutbox) == 1
        email_body = mailoutbox[0].body
        assert "Click the link below to sign in" in email_body

        # Verify EmailLog audit record created
        from users.models import EmailLog

        log = EmailLog.objects.filter(recipient="reader@example.com").first()
        assert log is not None
        assert log.trigger == EmailLog.Trigger.MAGIC_LINK
        assert log.site_host == "community.blueshoe.io"
        assert log.page_url == "https://www.blueshoe.io/blog/post-1/"
        assert log.status == EmailLog.Status.SENT
        assert "Click the link below to sign in" in log.content_text

        # Extract verify URL and token from email
        import re
        from urllib.parse import parse_qs, urlparse

        match = re.search(r"https?://[^\s]+", email_body)
        assert match is not None
        verify_url = match.group(0)
        parsed = urlparse(verify_url)
        params = parse_qs(parsed.query)
        token = params["token"][0]

        # 4. GET request renders the confirmation page (anti-scanner check, token remains unconsumed)
        preview_res = client.get(
            f"/api/auth/magic-link/verify/?token={token}&next=https://www.blueshoe.io/blog/post-1/",
            HTTP_HOST="community.blueshoe.io",
        )
        assert preview_res.status_code == 200
        preview_content = preview_res.content.decode()
        assert "Confirm your Sign-In" in preview_content
        assert "reader@example.com" in preview_content
        assert "magic-auth-form" in preview_content

        # 5. POST request consumes token, logs user in and redirects to next
        post_res = client.post(
            "/api/auth/magic-link/verify/",
            data={"token": token, "next": "https://www.blueshoe.io/blog/post-1/"},
            HTTP_HOST="community.blueshoe.io",
        )
        assert post_res.status_code == 302
        assert post_res.headers["Location"] == "https://www.blueshoe.io/blog/post-1/"

        # Check user is logged in with clean display name (email domain hidden)
        session_res = client.get("/api/auth/session/")
        assert session_res.json()["is_authenticated"] is True
        assert session_res.json()["user"]["email"] == "reader@example.com"
        assert session_res.json()["user"]["name"] == "Reader"

        # Check clean privacy-friendly name generation
        from users.api import generate_display_names_from_email

        assert generate_display_names_from_email("john.doe@blueshoe.io") == ("john.doe", "John", "Doe")
        assert generate_display_names_from_email("max_mustermann@blueshoe.de") == (
            "max_mustermann",
            "Max",
            "Mustermann",
        )
        assert generate_display_names_from_email("sarah-connor@future.org") == ("sarah-connor", "Sarah", "Connor")
        assert generate_display_names_from_email("clara+feedback@test.com") == ("clara", "Clara", "")

        # Check SocialAccount record exists under /admin/socialaccount/socialaccount/
        from allauth.socialaccount.models import SocialAccount

        sa = SocialAccount.objects.get(user__email="reader@example.com")
        assert sa.provider == "email_link"
        assert sa.uid == "reader@example.com"
        assert sa.extra_data["auth_method"] == "magic_link"

        # 6. Replaying the POST with the same token fails with 401
        replay_res = client.post(
            "/api/auth/magic-link/verify/",
            data={"token": token, "next": "https://www.blueshoe.io/blog/post-1/"},
            HTTP_HOST="community.blueshoe.io",
        )
        assert replay_res.status_code == 401
        assert "already used" in replay_res.content.decode()

    def test_google_jwt_dependency_available(self):
        import jwt
        from allauth.socialaccount.internal import jwtkit

        assert hasattr(jwt, "decode")
        assert hasattr(jwtkit, "verify_and_decode")
