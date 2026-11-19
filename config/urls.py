from django.contrib import admin
from django.urls import include, path

from config.api import api
from config.views import api_docs_view, health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("healthz/", health_check, name="health_check"),
    path("docs/", api_docs_view, name="api-docs"),
    path("docs", api_docs_view),
    path("api/", api.urls),
    path("_allauth/", include("allauth.headless.urls")),  # Allauth headless routing
]
