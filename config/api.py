from ninja import NinjaAPI

from comments.api import router as comments_router
from reactions.api import router as reactions_router
from users.api import router as users_router

api = NinjaAPI(
    title="Blueshoe Community API",
    version="0.5.1",
    description=(
        "API-First Community System featuring markdown comments, 1-level threaded replies, "
        "dual positive-only reactions (page & comment levels), passwordless Magic Login Link, "
        "and synchronous Gemini 3.8 Flash AI moderation."
    ),
    urls_namespace="api",
    servers=[
        {"url": "/", "description": "Current Environment"},
        {"url": "https://community.blueshoe.de", "description": "Production - blueshoe.de"},
        {"url": "https://community.blueshoe.io", "description": "Production - blueshoe.io"},
        {"url": "https://community.django-hurricane.io", "description": "Production - django-hurricane.io"},
        {"url": "https://community.gefyra.dev", "description": "Production - gefyra.dev"},
    ],
    openapi_extra={
        "tags": [
            {
                "name": "Comments",
                "description": (
                    "Endpoints for retrieving, posting, editing, and deleting comments, Altcha CAPTCHA challenge "
                    "verification, and email reply notification unsubscribes."
                ),
            },
            {
                "name": "Reactions",
                "description": (
                    "Endpoints for toggling positive-only reactions on pages and comments, with anti-flooding rate limits "
                    "(HTTP 429) and teaser batch aggregation."
                ),
            },
            {
                "name": "Users & Authentication",
                "description": (
                    "Endpoints for passwordless Magic Login Link (request & verify), listing configured social login providers, "
                    "session status, logout, and GDPR account deletion with re-authentication guardrails. Native allauth headless "
                    "endpoints are also available under `/_allauth/browser/v1/`."
                ),
            },
        ]
    },
)

api.add_router("/", users_router)
api.add_router("/", comments_router)
api.add_router("/", reactions_router)
