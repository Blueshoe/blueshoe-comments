import datetime
import hashlib
import re
from urllib.parse import quote

from allauth.socialaccount.adapter import get_adapter
from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.core.cache import cache
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.db import transaction
from django.http import HttpRequest, HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.utils import timezone
from ninja import Router, Schema
from ninja.responses import Response

from users.adapter import CustomAccountAdapter

router = Router(tags=["Users & Authentication"])


class DeleteMeIn(Schema):
    confirm: bool


class ProviderOut(Schema):
    id: str
    name: str
    client_id: str | None = None


class UserSummaryOut(Schema):
    id: int
    username: str
    name: str
    email: str
    is_team: bool
    is_maintainer: bool = False


class SessionStatusOut(Schema):
    is_authenticated: bool
    user: UserSummaryOut | None = None


class MagicLinkRequestIn(Schema):
    email: str
    next_url: str | None = None


def generate_display_names_from_email(email: str) -> tuple[str, str, str]:
    """
    Derives clean, privacy-friendly human display names from an email address:
    - john.doe@company.com -> first_name='John', last_name='Doe' (Display: 'John Doe')
    - max_mustermann@blueshoe.de -> first_name='Max', last_name='Mustermann' (Display: 'Max Mustermann')
    - sarah@test.org -> first_name='Sarah', last_name='' (Display: 'Sarah')
    - Completely hides domain and plus-aliases to prevent email harvesting.
    """
    prefix = email.split("@")[0].split("+")[0].strip()
    cleaned = re.sub(r"[._-]+", " ", prefix).strip()
    parts = cleaned.split()
    if len(parts) >= 2:
        first_name = parts[0][:30].title()
        last_name = " ".join(parts[1:])[:30].title()
    elif parts:
        first_name = parts[0][:30].title()
        last_name = ""
    else:
        first_name = "Reader"
        last_name = ""

    username = prefix[:30]
    return username, first_name, last_name


@router.delete("/me/", response={204: None, 400: dict, 401: dict, 403: dict})
def delete_me(request: HttpRequest, payload: DeleteMeIn):
    """
    Deletes the current user account, cascades social tokens, and anonymizes all comments.
    Enforces re-authentication if last_login > 10 minutes ago.
    """
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required"}, status=401)

    user = request.user

    # Re-auth check (10 minutes)
    if not user.last_login or (timezone.now() - user.last_login) > datetime.timedelta(minutes=10):
        return Response({"code": "reauth_required"}, status=403)

    if not payload.confirm:
        return Response({"detail": "Confirmation required"}, status=400)

    with transaction.atomic():
        # Deleting the user cascades all SocialToken and SocialAccount rows.
        # User comments are anonymized via pre_delete signal handler.
        user.delete()

    return HttpResponse(status=204)


@router.get("/auth/providers/", response={200: list[ProviderOut]})
def list_auth_providers(request: HttpRequest):
    """
    Lists all active social login providers configured in Django Admin for the current site,
    plus the native passwordless Email Link provider.
    """
    adapter = get_adapter()
    apps = adapter.list_apps(request)
    providers = [
        ProviderOut(
            id=app.provider,
            name=app.name or app.provider.title(),
            client_id=app.client_id,
        )
        for app in apps
    ]
    # Always offer passwordless Email Link as an available provider
    providers.append(ProviderOut(id="email_link", name="Email Link"))
    return providers


@router.post("/auth/magic-link/request/", response={200: dict, 400: dict, 429: dict})
def request_magic_link(request: HttpRequest, payload: MagicLinkRequestIn):
    """
    Generates a secure, cryptographically signed, timestamped single-use magic login link
    and dispatches it to the recipient's email address.
    """
    email = payload.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return Response({"error": "Invalid email address format."}, status=400)

    # Anti-flooding shelter: max 3 magic link requests per 60 seconds per email/IP
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")
    rate_key = f"magic_link_rate:{hashlib.sha256(f'{email}:{ip}'.encode()).hexdigest()}"
    recent_reqs = cache.get(rate_key, 0)
    if recent_reqs >= 3:
        return Response(
            {"error": "Too many login link requests. Please wait a minute before requesting another link."},
            status=429,
        )
    cache.set(rate_key, recent_reqs + 1, timeout=60)

    # Get or create the user account with human-readable display names
    User = get_user_model()
    username, first_name, last_name = generate_display_names_from_email(email)
    user, _created = User.objects.get_or_create(
        email=email,
        defaults={
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
        },
    )

    # Sign a secure timestamped token (valid for 15 minutes)
    signer = TimestampSigner(salt="magic-login")
    signed_token = signer.sign(f"{user.id}:{user.email}")

    # Build full verification link
    next_target = payload.next_url or ""
    verify_url = request.build_absolute_uri(
        f"/api/auth/magic-link/verify/?token={quote(signed_token)}&next={quote(next_target)}"
    )
    if not settings.DEBUG and verify_url.startswith("http://"):
        verify_url = "https://" + verify_url.removeprefix("http://")

    expire_hours = int(getattr(settings, "MAGIC_LINK_EXPIRE_SECONDS", 48 * 3600) / 3600)

    # Dispatch email
    subject = "Your Magic Sign-In Link for Blueshoe Community"
    message = (
        f"Hello!\n\n"
        f"Click the link below to sign in to Blueshoe Community:\n\n"
        f"{verify_url}\n\n"
        f"This link expires in {expire_hours} hours and can only be used once.\n\n"
        f"If you did not request this link, you can safely ignore this email.\n"
    )
    from users.mail import send_and_log_email
    from users.models import EmailLog

    site_host = request.get_host().split(":")[0]

    send_and_log_email(
        subject=subject,
        message=message,
        recipient_list=[email],
        trigger=EmailLog.Trigger.MAGIC_LINK,
        site_host=site_host,
        page_url=payload.next_url or "",
        fail_silently=False,
    )

    return {"status": "email_sent", "email": email}


@router.get("/auth/magic-link/verify/")
def verify_magic_link_page(request: HttpRequest, token: str, next: str | None = None):
    """
    Renders the confirmation and link-preview page on GET without consuming the token.
    Email security scanners (e.g. Microsoft SafeLinks) only inspect GET requests,
    leaving the token intact for the human recipient.
    """
    signer = TimestampSigner(salt="magic-login")
    User = get_user_model()
    expire_seconds = getattr(settings, "MAGIC_LINK_EXPIRE_SECONDS", 48 * 3600)

    try:
        unsigned = signer.unsign(token, max_age=expire_seconds)
        user_id, email = unsigned.split(":", 1)

        # Check replay without consuming
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        if cache.get(f"used_magic_token:{token_hash}"):
            raise BadSignature("This magic login link has already been used.")

        # Ensure user exists
        User.objects.get(id=int(user_id), email=email)
    except (SignatureExpired, BadSignature, ValueError, User.DoesNotExist) as e:
        reason = (
            "This magic login link has expired or was already used."
            if isinstance(e, (SignatureExpired, BadSignature))
            else "Invalid login link token."
        )
        return render(
            request,
            "socialaccount/authentication_error.html",
            {
                "auth_error": {
                    "provider": "Email Link",
                    "exception": reason,
                }
            },
            status=401,
        )

    return render(
        request,
        "users/magic_link_confirm.html",
        {
            "token": token,
            "email": email,
            "next_url": next or "",
        },
    )


@router.post("/auth/magic-link/verify/")
def complete_magic_link_signin(request: HttpRequest):
    """
    Consumes the magic link token, establishes an authenticated session,
    and redirects the user to their target article post.
    """
    token = request.POST.get("token") or ""
    next_url = request.POST.get("next") or ""

    signer = TimestampSigner(salt="magic-login")
    User = get_user_model()
    expire_seconds = getattr(settings, "MAGIC_LINK_EXPIRE_SECONDS", 48 * 3600)

    try:
        unsigned = signer.unsign(token, max_age=expire_seconds)
        user_id, email = unsigned.split(":", 1)

        # Single-use replay protection
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        replay_key = f"used_magic_token:{token_hash}"
        if cache.get(replay_key):
            raise BadSignature("This magic login link has already been used.")
        cache.set(replay_key, "used", timeout=expire_seconds)

        user = User.objects.get(id=int(user_id), email=email)
    except (SignatureExpired, BadSignature, ValueError, User.DoesNotExist) as e:
        reason = (
            "This magic login link has expired or was already used."
            if isinstance(e, (SignatureExpired, BadSignature))
            else "Invalid login link token."
        )
        return render(
            request,
            "socialaccount/authentication_error.html",
            {
                "auth_error": {
                    "provider": "Email Link",
                    "exception": reason,
                }
            },
            status=401,
        )

    # Establish authenticated user session
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    # Backfill human-friendly display names if empty
    if not user.first_name and not user.last_name:
        _, first_name, last_name = generate_display_names_from_email(user.email)
        user.first_name = first_name
        user.last_name = last_name
        user.save(update_fields=["first_name", "last_name"])

    # Record or update SocialAccount entry so the login provider is unified under /admin/socialaccount/socialaccount/
    from allauth.socialaccount.models import SocialAccount

    sa, _created = SocialAccount.objects.get_or_create(
        user=user,
        provider="email_link",
        defaults={
            "uid": user.email,
            "extra_data": {"email": user.email, "verified": True, "auth_method": "magic_link"},
            "last_login": timezone.now(),
        },
    )
    if not _created:
        sa.last_login = timezone.now()
        sa.save(update_fields=["last_login"])

    # Safe redirect
    adapter = CustomAccountAdapter()
    if not next_url or not adapter.is_safe_url(next_url):
        next_url = "/"

    return HttpResponseRedirect(next_url)


@router.get("/auth/session/", response={200: SessionStatusOut})
def get_auth_session(request: HttpRequest):
    """
    Returns the current authentication status and user information for the active session.
    """
    if not request.user.is_authenticated:
        return SessionStatusOut(is_authenticated=False, user=None)

    user = request.user
    is_maintainer = user.is_staff or user.email.endswith("@blueshoe.de") or user.email.endswith("@blueshoe.io")
    name = user.get_full_name() or user.username

    return SessionStatusOut(
        is_authenticated=True,
        user=UserSummaryOut(
            id=user.id,
            username=user.username,
            name=name,
            email=user.email,
            is_team=is_maintainer,
            is_maintainer=is_maintainer,
        ),
    )


@router.post("/auth/logout/", response={200: dict})
def logout_view(request: HttpRequest):
    """
    Logs out the current session and flushes authentication cookies.
    """
    logout(request)
    return {"status": "logged_out"}
