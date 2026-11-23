from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


def _patch_allauth_headless_redirect_to_provider():
    try:
        from allauth.headless.socialaccount.forms import RedirectToProviderForm
        from allauth.headless.socialaccount.views import RedirectToProviderView, render_authentication_error
        from django.core.exceptions import ValidationError

        def get(self, request, *args, **kwargs):
            data = request.GET.copy()
            if "process" not in data:
                data["process"] = "login"
            form = RedirectToProviderForm(data)
            if not form.is_valid():
                return render_authentication_error(
                    request,
                    provider=request.GET.get("provider"),
                    exception=ValidationError(form.errors),
                )
            provider = form.cleaned_data["provider"]
            next_url = form.cleaned_data["callback_url"]
            process = form.cleaned_data["process"]
            return provider.redirect(
                request,
                process,
                next_url=next_url,
                headless=True,
            )

        RedirectToProviderView.get = get
    except Exception:
        pass


def _patch_linkedin_oauth2_to_openid_connect():
    """
    Modernizes allauth's LinkedInOAuth2Provider and Adapter from deprecated v2 scopes
    (r_liteprofile, r_emailaddress) to modern OpenID Connect (openid, profile, email)
    and userinfo endpoint (https://api.linkedin.com/v2/userinfo).
    """
    try:
        from allauth.socialaccount.adapter import get_adapter
        from allauth.socialaccount.providers.base import ProviderException
        from allauth.socialaccount.providers.linkedin_oauth2.provider import LinkedInOAuth2Provider
        from allauth.socialaccount.providers.linkedin_oauth2.views import LinkedInOAuth2Adapter

        LinkedInOAuth2Provider.get_default_scope = lambda self: ["openid", "profile", "email"]

        def extract_uid(self, data):
            uid = data.get("sub") or data.get("id")
            if not uid:
                raise ProviderException("LinkedIn authentication failed: missing user id.")
            return str(uid)

        def extract_common_fields(self, data):
            return dict(
                first_name=data.get("given_name") or data.get("firstName", ""),
                last_name=data.get("family_name") or data.get("lastName", ""),
                email=data.get("email"),
            )

        LinkedInOAuth2Provider.extract_uid = extract_uid
        LinkedInOAuth2Provider.extract_common_fields = extract_common_fields

        def get_user_info(self, token):
            headers = {"Authorization": f"Bearer {token.token}"}
            with get_adapter().get_requests_session() as sess:
                resp = sess.get("https://api.linkedin.com/v2/userinfo", headers=headers)
                resp.raise_for_status()
                return resp.json()

        LinkedInOAuth2Adapter.get_user_info = get_user_info
    except Exception:
        pass


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
    verbose_name = _("Users & Accounts")

    def ready(self):
        import users.signals  # noqa: F401

        _patch_allauth_headless_redirect_to_provider()
        _patch_linkedin_oauth2_to_openid_connect()
