from django.http import HttpResponse
from django.shortcuts import render


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
    <link rel="icon" type="image/x-icon" href="/static/admin/img/favicon.ico" />
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


def social_login_cancelled_view(request):
    """
    Renders a branded notice when social login is cancelled by the user.
    """
    return render(
        request,
        "socialaccount/authentication_error.html",
        {
            "auth_error": {
                "provider": "Social Login",
                "code": "cancelled",
                "exception": "The sign-in process was cancelled by the user.",
            }
        },
        status=200,
    )


def social_login_error_view(request):
    """
    Renders a branded error page when an OAuth authentication error occurs.
    """
    return render(
        request,
        "socialaccount/authentication_error.html",
        {
            "auth_error": {
                "provider": "Social Login",
                "code": "error",
                "exception": "An unexpected error occurred during social authentication.",
            }
        },
        status=401,
    )
