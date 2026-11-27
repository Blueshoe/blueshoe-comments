"""Stable anonymous visitor identity for reactions/comments."""

from __future__ import annotations

import hashlib

from django.conf import settings
from django.http import HttpRequest


def _sha(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def get_anon_identity(request: HttpRequest, site_host: str) -> tuple[str, list[str]]:
    """
    Return (primary_hash, lookup_aliases).

    Primary is stable when X-Visitor-Id / community_vid is present (no IP).
    Binding to IP caused SSR vs client and IP-change mismatches: wrong `active`,
    duplicate counts, and toggles that "reset" on reload.

    Aliases include the legacy `site:ip:vid:secret` form so existing rows can
    still be found and removed.
    """
    vid = (request.headers.get("X-Visitor-Id") or request.COOKIES.get("community_vid", "") or "").strip()
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR", "") or ""
    secret = getattr(settings, "SECRET_KEY", "")

    aliases: list[str] = []
    if vid:
        primary = _sha(f"{site_host}:vid:{vid}:{secret}")
        aliases.append(primary)
        if ip:
            aliases.append(_sha(f"{site_host}:{ip}:{vid}:{secret}"))  # legacy
    else:
        # No visitor id (SSR without cookie): IP-only fallback for flood control.
        primary = _sha(f"{site_host}:ip:{ip}:{secret}")
        aliases.append(primary)
        aliases.append(_sha(f"{site_host}:{ip}::{secret}"))  # legacy empty vid

    # Preserve order, drop dupes
    seen: set[str] = set()
    unique = [h for h in aliases if not (h in seen or seen.add(h))]
    return primary, unique


def get_anon_hash(request: HttpRequest, site_host: str) -> str:
    """Primary hash used when creating new anonymous reactions."""
    primary, _aliases = get_anon_identity(request, site_host)
    return primary
