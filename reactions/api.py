import hashlib

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.http import HttpRequest
from ninja import Router, Schema
from ninja.responses import Response

from comments.models import Comment

from .models import Reaction

router = Router(tags=["Reactions"])

ALLOWED_KINDS = {"like", "love", "rocket", "celebrate", "insightful"}


class ToggleReactionIn(Schema):
    kind: str
    thread_slug: str
    comment_id: int | None = None


class ReactionSummarySchema(Schema):
    counts: dict[str, int] = {}
    active: list[str] = []


class TeaserBatchItemOut(Schema):
    comment_count: int = 0
    reactions: dict[str, int] = {}
    active_reactions: list[str] = []


def get_anon_hash(request: HttpRequest, site_host: str) -> str:
    vid = request.headers.get("X-Visitor-Id") or request.COOKIES.get("community_vid", "")
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")
    raw = f"{site_host}:{ip}:{vid}:{getattr(settings, 'SECRET_KEY', '')}"
    return hashlib.sha256(raw.encode()).hexdigest()


@router.post("/reactions/", response={200: dict, 400: dict, 429: dict})
def toggle_reaction(request: HttpRequest, payload: ToggleReactionIn):
    if payload.kind not in ALLOWED_KINDS:
        return Response(
            {"error": f"Invalid reaction kind '{payload.kind}'. Only positive reactions allowed."}, status=400
        )

    if not payload.thread_slug:
        return Response({"error": "thread_slug required"}, status=400)

    site_host = request.get_host().split(":")[0]
    user = request.user if request.user.is_authenticated else None
    anon_hash = "" if user else get_anon_hash(request, site_host)

    # Anti-flooding shelter: max 10 reaction operations per 10 seconds per visitor
    flood_identifier = anon_hash or (str(user.id) if user else "anon")
    flood_key = f"reaction_flood:{flood_identifier}"
    recent_count = cache.get(flood_key, 0)
    if recent_count >= 10:
        return Response(
            {"error": "Too many reactions in a short time. Please slow down."},
            status=429,
        )
    cache.set(flood_key, recent_count + 1, timeout=10)

    filter_kwargs = {
        "site_host": site_host,
        "thread_slug": payload.thread_slug,
        "kind": payload.kind,
        "comment_id": payload.comment_id,
    }

    if user:
        filter_kwargs["user"] = user
    else:
        filter_kwargs["anon_hash"] = anon_hash

    existing = Reaction.objects.filter(**filter_kwargs).first()
    if existing:
        existing.delete()
        action = "removed"
    else:
        Reaction.objects.create(**filter_kwargs)
        action = "added"

    return {"action": action}


@router.get("/reactions/", response={200: ReactionSummarySchema, 400: dict})
def get_page_reactions(request: HttpRequest, thread_slug: str):
    if not thread_slug:
        return Response({"error": "thread_slug required"}, status=400)

    site_host = request.get_host().split(":")[0]
    user = request.user if request.user.is_authenticated else None
    anon_hash = "" if user else get_anon_hash(request, site_host)

    qs = Reaction.objects.filter(site_host=site_host, thread_slug=thread_slug, comment__isnull=True)
    counts = qs.values("kind").annotate(count=Count("id"))
    counts_dict = {item["kind"]: item["count"] for item in counts}

    if user:
        active = list(qs.filter(user=user).values_list("kind", flat=True))
    else:
        active = list(qs.filter(anon_hash=anon_hash).values_list("kind", flat=True))

    schema = ReactionSummarySchema(counts=counts_dict, active=active)
    response = Response(schema.model_dump(mode="json"), status=200)
    if user:
        response["Cache-Control"] = "private, no-store"
    else:
        response["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    return response


@router.get("/reactions/batch/", response={200: dict[str, TeaserBatchItemOut], 400: dict})
def get_batch_reactions(request: HttpRequest, thread_slug: str):
    if not thread_slug:
        return Response({"error": "thread_slug required"}, status=400)

    slugs = [s.strip() for s in thread_slug.split(",") if s.strip()][:100]
    if not slugs:
        return Response({"error": "At least one valid slug required"}, status=400)

    site_host = request.get_host().split(":")[0]
    user = request.user if request.user.is_authenticated else None
    anon_hash = "" if user else get_anon_hash(request, site_host)

    # Comments count per slug
    comment_counts = dict(
        Comment.objects.filter(site_host=site_host, thread_slug__in=slugs, status="approved")
        .values("thread_slug")
        .annotate(count=Count("id"))
        .values_list("thread_slug", "count")
    )

    # Reaction counts per slug
    reaction_counts = list(
        Reaction.objects.filter(site_host=site_host, thread_slug__in=slugs, comment__isnull=True)
        .values("thread_slug", "kind")
        .annotate(count=Count("id"))
    )

    # Active reactions
    if user:
        active_reactions = Reaction.objects.filter(
            site_host=site_host, thread_slug__in=slugs, comment__isnull=True, user=user
        ).values_list("thread_slug", "kind")
    else:
        active_reactions = Reaction.objects.filter(
            site_host=site_host, thread_slug__in=slugs, comment__isnull=True, anon_hash=anon_hash
        ).values_list("thread_slug", "kind")

    # Aggregate result
    result = {
        slug: TeaserBatchItemOut(comment_count=comment_counts.get(slug, 0), reactions={}, active_reactions=[])
        for slug in slugs
    }

    for rc in reaction_counts:
        slug = rc["thread_slug"]
        if slug in result:
            result[slug].reactions[rc["kind"]] = rc["count"]

    for slug, kind in active_reactions:
        if slug in result:
            result[slug].active_reactions.append(kind)

    response = Response({k: v.model_dump(mode="json") for k, v in result.items()}, status=200)
    if user:
        response["Cache-Control"] = "private, no-store"
    else:
        response["Cache-Control"] = "public, max-age=30, stale-while-revalidate=60"
    return response
