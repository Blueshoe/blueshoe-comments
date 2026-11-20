from ninja import NinjaAPI

from comments.api import router as comments_router
from reactions.api import router as reactions_router
from users.api import router as users_router

api = NinjaAPI(
    title="Blueshoe Community API",
    version="1.0.0",
    description=(
        "API-First Community System featuring markdown comments, 1-level threaded replies, "
        "dual positive-only reactions (page & comment levels), and synchronous Gemini 2.5 Flash AI moderation."
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
                "description": "Endpoints for retrieving, posting, editing, and deleting comments, Altcha CAPTCHA, and email unsubscribe.",
            },
            {
                "name": "Reactions",
                "description": "Endpoints for toggling positive-only reactions on pages and comments, and teaser batch aggregation.",
            },
            {
                "name": "Users & Authentication",
                "description": (
                    "Endpoints for listing configured social login providers, session status, logout, "
                    "re-authentication checks, and GDPR account deletion. Native allauth headless endpoints "
                    "are also available under `/_allauth/browser/v1/`."
                ),
            },
        ]
    },
)

api.add_router("/", users_router)
api.add_router("/", comments_router)
api.add_router("/", reactions_router)
