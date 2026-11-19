import uuid

import tldextract
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin


class DynamicCookieDomainMiddleware(MiddlewareMixin):
    """
    Sets sessionid, csrftoken, and community_vid cookies on the root domain
    (e.g., .blueshoe.de) to allow sharing across subdomains and prevent
    third-party cookie blocking.
    """

    def process_request(self, request):
        vid_cookie = "community_vid"
        if vid_cookie not in request.COOKIES:
            new_vid = str(uuid.uuid4())
            request._new_community_vid = new_vid
            request.COOKIES[vid_cookie] = new_vid

    def process_response(self, request, response):
        host = request.get_host().split(":")[0]

        # Extract root domain (e.g. blueshoe.de from community.blueshoe.de)
        ext = tldextract.extract(host)
        if ext.suffix:
            domain = f".{ext.domain}.{ext.suffix}"
        else:
            domain = host  # fallback for localhost

        # Identify which cookies are being set in this response
        if settings.SESSION_COOKIE_NAME in response.cookies:
            response.cookies[settings.SESSION_COOKIE_NAME]["domain"] = domain

        if settings.CSRF_COOKIE_NAME in response.cookies:
            response.cookies[settings.CSRF_COOKIE_NAME]["domain"] = domain

        # Ensure community_vid cookie is persisted in browser if newly generated
        if hasattr(request, "_new_community_vid"):
            response.set_cookie(
                "community_vid",
                request._new_community_vid,
                domain=domain,
                max_age=365 * 24 * 60 * 60,
                httponly=True,
                samesite="Lax",
                secure=not settings.DEBUG,
            )

        return response
