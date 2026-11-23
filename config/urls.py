from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

from config.api import api
from config.views import api_docs_view, social_login_cancelled_view, social_login_error_view

urlpatterns = [
    path("favicon.ico", RedirectView.as_view(url="/static/admin/img/favicon.ico", permanent=True)),
    path("admin/", admin.site.urls),
    path("docs/", api_docs_view, name="api-docs"),
    path("docs", api_docs_view),
    path("api/", api.urls),
    path("_allauth/", include("allauth.headless.urls")),  # Allauth headless routing
    # Allauth error and cancellation fallback routes for headless mode
    path("accounts/social/login/cancelled/", social_login_cancelled_view, name="socialaccount_login_cancelled"),
    path("accounts/social/login/error/", social_login_error_view, name="socialaccount_login_error"),
    path("accounts/login/cancelled/", social_login_cancelled_view),
    path("accounts/login/error/", social_login_error_view),
    path(
        "accounts/", include("allauth.urls")
    ),  # OAuth callback URLs for providers (e.g. /accounts/github/login/callback/)
]

# Blueshoe Admin Customization
admin.site.site_header = "Blueshoe Community Hub"
admin.site.site_title = "Blueshoe Admin"
admin.site.index_title = "Discussion & Moderation Management"
