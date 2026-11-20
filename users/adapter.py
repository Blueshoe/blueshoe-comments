import re
from urllib.parse import urlparse

from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialApp
from django.conf import settings
from django.db.models import Q


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


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Robust multi-tenant social app lookup with graceful fallback.
    """

    def list_apps(self, request, provider=None, client_id=None):
        apps = super().list_apps(request, provider=provider, client_id=client_id)
        if apps:
            return apps

        # If not linked to the current site ID, search by host domain
        qs = SocialApp.objects.all()
        if provider:
            qs = qs.filter(Q(provider=provider) | Q(provider_id=provider))
        if client_id:
            qs = qs.filter(client_id=client_id)

        if request:
            host = request.get_host().split(":")[0].lower()
            matched_by_host = list(qs.filter(sites__domain__iexact=host))
            if matched_by_host:
                return matched_by_host

        # Fallback to any app registered for this provider
        return list(qs)
