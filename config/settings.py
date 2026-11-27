import pkgutil as _pkgutil
from pathlib import Path

import allauth.socialaccount.providers as _allauth_providers
import environ
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["*"]),
    CORS_ALLOWED_ORIGINS=(list, []),
    CSRF_TRUSTED_ORIGINS=(list, []),
)
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("SECRET_KEY", default="django-insecure-dummy-key")
DEBUG = env("DEBUG")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

# Exclude legacy OAuth 1.0 and special non-standalone modules
_EXCLUDED_PROVIDERS = {
    "base",
    "oauth",
    "oauth2",
    "dummy",
    "openid",
    "saml",
    "discogs",
    "evernote",
    "fivehundredpx",
    "flickr",
    "openstreetmap",
    "pocket",
    "steam",
    "trello",
    "tumblr",
    "twitter",
    "vimeo",
    "xing",
}

ALL_SOCIAL_PROVIDERS = [
    f"allauth.socialaccount.providers.{_name}"
    for _, _name, _ in _pkgutil.iter_modules(_allauth_providers.__path__)
    if _name not in _EXCLUDED_PROVIDERS
]

SOCIALACCOUNT_PROVIDERS = {
    "twitter_oauth2": {
        "SCOPE": [
            "tweet.read",
            "users.read",
            "users.email",
            "offline.access",
        ],
        "FIELDS": [
            "id",
            "name",
            "username",
            "profile_image_url",
            "confirmed_email",
        ],
    }
}

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third-party
    "corsheaders",
    "hurricane",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    *ALL_SOCIAL_PROVIDERS,
    # Local apps
    "users",
    "comments",
    "reactions",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "users.middleware.DynamicCookieDomainMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {"default": env.db("DATABASE_URL", default="postgres://postgres:postgres@localhost:5432/community")}
if not env("DATABASE_URL", default=""):
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }

# --- Caching & High-Performance Sessions ---
CACHES = {
    "default": env.cache("CACHE_URL", default="locmemcache://"),
}
if env("CACHE_URL", default="").startswith("redis://"):
    SESSION_ENGINE = "django.contrib.sessions.backends.cached_db"
else:
    SESSION_ENGINE = "django.contrib.sessions.backends.db"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ("en", "English"),
    ("de", "German"),
]
LOCALE_PATHS = [BASE_DIR / "locale"]

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_USER_MODEL = "users.User"

SITE_ID = 1

# --- CORS & CSRF ---
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://([\w-]+\.)?blueshoe\.(io|de)$",
    r"^https://([\w-]+\.)?gefyra\.dev$",
    r"^https://([\w-]+\.)?django-hurricane\.io$",
    r"^http://localhost(:\d+)?$",
    r"^http://127\.0\.0\.1(:\d+)?$",
]
CORS_ALLOW_HEADERS = (
    *default_headers,
    "x-visitor-id",
    "x-altcha-spam-filter",
    "x-altcha-config",
)
CORS_EXPOSE_HEADERS = [
    "x-altcha-config",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[
        "https://community.blueshoe.de",
        "https://community.blueshoe.io",
        "https://community.django-hurricane.io",
        "https://community.gefyra.dev",
        "https://www.blueshoe.de",
        "https://www.blueshoe.io",
        "https://blueshoe.de",
        "https://blueshoe.io",
        "https://gefyra.dev",
        "https://www.gefyra.dev",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)

# --- Reverse Proxy SSL & HTTPS ---
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# --- Allauth Headless Setup ---
HEADLESS_ONLY = True
LOGIN_REDIRECT_URL = "https://www.blueshoe.io/auth-callback.html"
ACCOUNT_DEFAULT_HTTP_PROTOCOL = env("ACCOUNT_DEFAULT_HTTP_PROTOCOL", default="https" if not DEBUG else "http")
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*"]
ACCOUNT_EMAIL_VERIFICATION = "none"  # Social login primarily, bypass email verification for now or configure as needed
SOCIALACCOUNT_AUTO_SIGNUP = True
ACCOUNT_ADAPTER = "users.adapter.CustomAccountAdapter"
SOCIALACCOUNT_ADAPTER = "users.adapter.CustomSocialAccountAdapter"

# --- Sessions & Cookies (Langlebige Sessions) ---
SESSION_COOKIE_AGE = 180 * 24 * 60 * 60  # 180 days
CSRF_COOKIE_AGE = 365 * 24 * 60 * 60  # 365 days
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = False

# Custom variable to track sliding expiration limits for staff
STAFF_SESSION_AGE = 12 * 60 * 60  # 12 hours

# --- Magic Login Link (48 hours validity) ---
MAGIC_LINK_EXPIRE_SECONDS = env.int("MAGIC_LINK_EXPIRE_SECONDS", default=48 * 60 * 60)

# --- Django Tasks Framework (Background Tasks) ---
TASKS = {
    "default": {
        "BACKEND": env("TASKS_BACKEND", default="django.tasks.backends.immediate.ImmediateBackend"),
    }
}

# --- Email Configuration (SMTP) ---
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@blueshoe.de")

# --- AI Moderation (Google Gemini) ---
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
GEMINI_MODEL = env("GEMINI_MODEL", default="gemini-3.8-flash")

# Logging for webhook failures / slack
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
