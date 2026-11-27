import re
from urllib.parse import urlparse

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialApp
from django.conf import settings
from django.db.models import Q
from django.http import HttpRequest


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Ensures frontend origins (e.g. https://www.blueshoe.io) are always recognized
    as safe callback redirect targets even if not in ALLOWED_HOSTS.
    """

    def is_safe_url(self, url: str) -> bool:
        if super().is_safe_url(url):
            return True

        if not url:
            return False

        parsed = urlparse(url)
        origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

        # Check configured CORS origins
        for allowed in getattr(settings, "CORS_ALLOWED_ORIGINS", []):
            if allowed.rstrip("/") == origin:
                return True

        # Check regex origins
        for pattern in getattr(settings, "CORS_ALLOWED_ORIGIN_REGEXES", []):
            if re.match(pattern, origin):
                return True

        return False

    def is_login_by_code_required(self, login) -> bool:
        return False

    def get_login_redirect_url(self, request: HttpRequest) -> str:
        url = request.session.get("next") or request.GET.get("next")
        if url and self.is_safe_url(url):
            return url
        return getattr(settings, "LOGIN_REDIRECT_URL", "https://www.blueshoe.io/auth-callback.html")


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Robust multi-tenant social app lookup matching request host without MultipleObjectsReturned,
    and automatic placeholder email assignment for providers without email (such as X / Twitter).
    """

    def pre_social_login(self, request: HttpRequest, sociallogin) -> None:
        """
        Use confirmed_email from X if available; otherwise assign a deterministic
        placeholder email so auto-signup succeeds without interrupting the login flow.
        """
        from allauth.account.models import EmailAddress

        confirmed_email = sociallogin.account.extra_data.get("confirmed_email")
        if confirmed_email and not sociallogin.email_addresses and not sociallogin.user.email:
            sociallogin.user.email = confirmed_email
            sociallogin.email_addresses = [EmailAddress(email=confirmed_email, verified=True, primary=True)]
            return

        if not sociallogin.is_existing and not sociallogin.email_addresses and not sociallogin.user.email:
            uid = str(sociallogin.account.uid)
            handle = (sociallogin.account.extra_data.get("username") or uid).lower()
            placeholder = f"{handle}.{uid[:8]}@x.com"

            sociallogin.user.email = placeholder
            sociallogin.email_addresses = [EmailAddress(email=placeholder, verified=False, primary=True)]

    def populate_user(self, request: HttpRequest, sociallogin, data: dict):
        user = super().populate_user(request, sociallogin, data)
        if not user.first_name and data.get("name"):
            user.first_name = data["name"][:30]
        return user

    def get_app(self, request: HttpRequest, provider: str, client_id: str | None = None) -> SocialApp:
        if client_id:
            return SocialApp.objects.get(provider=provider, client_id=client_id)

        qs = SocialApp.objects.filter(Q(provider=provider) | Q(provider_id=provider))
        if not qs.exists():
            raise SocialApp.DoesNotExist(f"No SocialApp found for provider '{provider}'.")

        if request:
            host = request.get_host().split(":")[0].lower()
            # 1. Direct host match on site domain (e.g. community.blueshoe.io)
            direct = qs.filter(sites__domain__iexact=host).first()
            if direct:
                return direct

            # 2. Match root domain (e.g. blueshoe.io from community.blueshoe.io)
            clean_host = host.removeprefix("community.")
            root = qs.filter(sites__domain__icontains=clean_host).first()
            if root:
                return root

        # 3. Fallback to first available app for this provider
        return qs.first()

    def list_apps(
        self, request: HttpRequest, provider: str | None = None, client_id: str | None = None
    ) -> list[SocialApp]:
        if not provider:
            return super().list_apps(request, provider=provider, client_id=client_id)
        try:
            return [self.get_app(request, provider, client_id=client_id)]
        except SocialApp.DoesNotExist:
            return []
