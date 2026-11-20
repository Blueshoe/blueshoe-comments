import datetime

from allauth.socialaccount.adapter import get_adapter
from django.contrib.auth import logout
from django.db import transaction
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.responses import Response

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


class SessionStatusOut(Schema):
    is_authenticated: bool
    user: UserSummaryOut | None = None


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
        return Response({"detail": "Confirmation required. Send {'confirm': true}."}, status=400)

    with transaction.atomic():
        request.session.flush()
        user.delete()

    return HttpResponse(status=204)


@router.get("/auth/providers/", response={200: list[ProviderOut]})
def list_auth_providers(request: HttpRequest):
    """
    Lists all active social login providers configured in Django Admin for the current site.
    The frontend widget queries this endpoint to render dynamic login buttons.
    """
    adapter = get_adapter()
    apps = adapter.list_apps(request)
    return [
        ProviderOut(
            id=app.provider,
            name=app.name or app.provider.title(),
            client_id=app.client_id,
        )
        for app in apps
    ]


@router.get("/auth/session/", response={200: SessionStatusOut})
def get_auth_session(request: HttpRequest):
    """
    Returns the current authentication status and user information for the active session.
    """
    if not request.user.is_authenticated:
        return SessionStatusOut(is_authenticated=False, user=None)

    user = request.user
    is_team = user.is_staff or user.email.endswith("@blueshoe.de") or user.email.endswith("@blueshoe.io")
    name = user.get_full_name() or user.username

    return SessionStatusOut(
        is_authenticated=True,
        user=UserSummaryOut(
            id=user.id,
            username=user.username,
            name=name,
            email=user.email,
            is_team=is_team,
        ),
    )


@router.post("/auth/logout/", response={200: dict})
def logout_view(request: HttpRequest):
    """
    Logs out the current session and flushes authentication cookies.
    """
    logout(request)
    return {"status": "logged_out"}
