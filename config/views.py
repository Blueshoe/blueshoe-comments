from django.core.cache import cache
from django.db import connections
from django.http import HttpResponse, JsonResponse


def health_check(request):
    """
    Healthcheck endpoint for Coolify (Zero-Downtime deployment).
    Checks DB and Cache connections.
    """
    health_status = {"status": "ok", "database": "ok", "cache": "ok"}
    status_code = 200

    try:
        connection = connections["default"]
        connection.ensure_connection()
    except Exception:
        health_status["database"] = "error"
        health_status["status"] = "error"
        status_code = 503

    try:
        cache.set("health_check", "1", timeout=1)
        if cache.get("health_check") != "1":
            raise ValueError("Cache not working")
    except Exception:
        health_status["cache"] = "error"
        health_status["status"] = "error"
        status_code = 503

    return JsonResponse(health_status, status=status_code)


def api_docs_view(request):
    """
    Renders modern interactive API documentation using Scalar API Reference.
    """
    html = """<!doctype html>
<html lang="en">
  <head>
    <title>Blueshoe Community API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="https://blueshoe.de/favicon.ico" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #0f172a;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-configuration='{
        "theme": "purple",
        "darkMode": true,
        "searchHotKey": "k",
        "metaData": {
          "title": "Blueshoe Community API Documentation",
          "description": "Headless Community-System (Comments, Markdown, Dual-Reactions & AI Moderation)"
        }
      }'
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <noscript>
      <div style="font-family: sans-serif; padding: 2rem; color: #fff;">
        <h1>Blueshoe Community API</h1>
        <p>JavaScript is required to view interactive documentation.</p>
        <p><a href="/api/docs" style="color: #a855f7;">Open Swagger UI</a> or <a href="/api/openapi.json" style="color: #a855f7;">View Raw OpenAPI Specification (JSON)</a></p>
      </div>
    </noscript>
  </body>
</html>
"""
    return HttpResponse(html, content_type="text/html")
