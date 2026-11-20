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


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"
    verbose_name = _("Users & Accounts")

    def ready(self):
        import users.signals  # noqa: F401

        _patch_allauth_headless_redirect_to_provider()
