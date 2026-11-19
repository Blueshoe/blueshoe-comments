import datetime
import hashlib
import logging

from altcha import ChallengeOptionsV1, verify_solution
from altcha import create_challenge_v1 as create_challenge
from django.conf import settings
from django.core.cache import cache
from django.db.models import Count
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.responses import Response

from reactions.models import Reaction

from .models import Comment
from .notifications import send_reply_notification, verify_unsubscribe_token
from .utils import moderate_comment

logger = logging.getLogger(__name__)
ALTCHA_HMAC_KEY = getattr(settings, "SECRET_KEY", "fallback-key")

router = Router(tags=["Comments"])


class ReactionSummarySchema(Schema):
    counts: dict[str, int] = {}
    active: list[str] = []


class CommentReplyOut(Schema):
    id: int
    parent_id: int | None = None
    author_id: int | None = None
    author_name: str
    is_deleted_author: bool
    body_html: str
    is_team: bool
    edited_at: datetime.datetime | None = None
    created_at: datetime.datetime
    reactions: ReactionSummarySchema


class CommentOut(Schema):
    id: int
    parent_id: int | None = None
    author_id: int | None = None
    author_name: str
    is_deleted_author: bool
    body_html: str
    is_team: bool
    edited_at: datetime.datetime | None = None
    created_at: datetime.datetime
    replies: list[CommentReplyOut] = []
    reactions: ReactionSummarySchema


class CreateCommentIn(Schema):
    thread_slug: str
    body_markdown: str
    parent_id: int | None = None
    notify_replies: bool = False
    guest_name: str | None = "Guest"
    website: str | None = None  # Honeypot field
    altcha: str | None = None


class UpdateCommentIn(Schema):
    body_markdown: str


def _get_author_name(comment: Comment) -> str:
    if comment.is_deleted_author:
        return "Deleted User"
    if comment.author:
        return comment.author.get_full_name() or comment.author.username
    return comment.guest_name or "Guest"


def _get_anon_hash(request: HttpRequest, site_host: str) -> str:
    vid = request.COOKIES.get("community_vid", "")
    ip = request.META.get("REMOTE_ADDR", "")
    raw = f"{site_host}:{ip}:{vid}:{ALTCHA_HMAC_KEY}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _build_reaction_map(comment_ids: list[int], request: HttpRequest, site_host: str) -> dict[int, dict]:
    reaction_map: dict[int, dict] = {cid: {"counts": {}, "active": []} for cid in comment_ids}
    if not comment_ids:
        return reaction_map

    qs = Reaction.objects.filter(comment_id__in=comment_ids)

    # 1. Counts per (comment_id, kind)
    counts = qs.values("comment_id", "kind").annotate(count=Count("id"))
    for item in counts:
        cid = item["comment_id"]
        kind = item["kind"]
        reaction_map[cid]["counts"][kind] = item["count"]

    # 2. Active per comment for the current user/visitor
    if request.user.is_authenticated:
        active_qs = qs.filter(user=request.user).values_list("comment_id", "kind")
    else:
        anon_hash = _get_anon_hash(request, site_host)
        active_qs = qs.filter(anon_hash=anon_hash).values_list("comment_id", "kind")

    for cid, kind in active_qs:
        reaction_map[cid]["active"].append(kind)

    return reaction_map


def _serialize_comment(comment: Comment, reaction_map: dict[int, dict], replies: list[Comment] = None) -> CommentOut:
    reactions = reaction_map.get(comment.id, {"counts": {}, "active": []})
    serialized_replies = []
    if replies:
        for r in replies:
            r_reactions = reaction_map.get(r.id, {"counts": {}, "active": []})
            serialized_replies.append(
                CommentReplyOut(
                    id=r.id,
                    parent_id=r.parent_id,
                    author_id=r.author_id,
                    author_name=_get_author_name(r),
                    is_deleted_author=r.is_deleted_author,
                    body_html=r.body_html,
                    is_team=r.is_team,
                    edited_at=r.edited_at,
                    created_at=r.created_at,
                    reactions=ReactionSummarySchema(**r_reactions),
                )
            )

    return CommentOut(
        id=comment.id,
        parent_id=comment.parent_id,
        author_id=comment.author_id,
        author_name=_get_author_name(comment),
        is_deleted_author=comment.is_deleted_author,
        body_html=comment.body_html,
        is_team=comment.is_team,
        edited_at=comment.edited_at,
        created_at=comment.created_at,
        replies=serialized_replies,
        reactions=ReactionSummarySchema(**reactions),
    )


@router.get("/comments/", response={200: list[CommentOut], 400: dict})
def list_comments(request: HttpRequest, thread_slug: str):
    if not thread_slug:
        return Response({"error": "thread_slug required"}, status=400)

    site_host = request.get_host().split(":")[0]

    # Fetch top-level approved comments
    top_comments = list(
        Comment.objects.filter(site_host=site_host, thread_slug=thread_slug, status="approved", parent__isnull=True)
        .select_related("author")
        .order_by("created_at")
    )

    # Fetch approved 1-level replies
    top_ids = [c.id for c in top_comments]
    reply_comments = list(
        Comment.objects.filter(site_host=site_host, thread_slug=thread_slug, status="approved", parent_id__in=top_ids)
        .select_related("author")
        .order_by("created_at")
    )

    # Group replies by parent_id
    replies_by_parent: dict[int, list[Comment]] = {cid: [] for cid in top_ids}
    for r in reply_comments:
        replies_by_parent.setdefault(r.parent_id, []).append(r)

    # Collect all comment IDs to batch query reactions
    all_comment_ids = top_ids + [r.id for r in reply_comments]
    reaction_map = _build_reaction_map(all_comment_ids, request, site_host)

    result = [_serialize_comment(c, reaction_map, replies_by_parent.get(c.id, [])) for c in top_comments]

    return result


@router.post("/comments/", response={201: CommentOut, 400: dict})
def create_comment(request: HttpRequest, payload: CreateCommentIn):
    # 1. Honeypot check
    if payload.website:
        return Response({"error": "Spam detected"}, status=400)

    # 2. Length check
    if len(payload.body_markdown) > 5000:
        return Response({"error": "Comment exceeds 5000 characters"}, status=400)

    site_host = request.get_host().split(":")[0]
    author = None
    guest_name = ""

    # 3. Auth vs Guest with Altcha
    if not request.user.is_authenticated:
        if not payload.altcha:
            return Response({"error": "Captcha required"}, status=400)

        try:
            is_valid = verify_solution(payload.altcha, ALTCHA_HMAC_KEY)
            if not is_valid:
                return Response({"error": "Invalid Captcha solution"}, status=400)

            # Replay protection
            payload_hash = hashlib.sha256(payload.altcha.encode()).hexdigest()
            if cache.get(f"altcha_{payload_hash}"):
                return Response({"error": "Captcha already used"}, status=400)
            cache.set(f"altcha_{payload_hash}", "used", timeout=3600)
        except Exception:
            return Response({"error": "Invalid Captcha"}, status=400)

        guest_name = (payload.guest_name or "Guest").strip()[:100]
    else:
        author = request.user

    # Salted IP hash
    raw_ip = request.META.get("REMOTE_ADDR", "")
    ip_hash = hashlib.sha256((raw_ip + ALTCHA_HMAC_KEY).encode()).hexdigest()

    # 4. Synchronous Gemini Moderation
    mod_status, mod_flag, mod_reason = moderate_comment(payload.body_markdown)

    # 5. Parent resolution (1-level limit)
    parent = None
    if payload.parent_id:
        parent = Comment.objects.filter(
            id=payload.parent_id, site_host=site_host, thread_slug=payload.thread_slug
        ).first()
        if parent and parent.parent_id:
            parent = parent.parent

    # 6. Save comment
    comment = Comment.objects.create(
        site_host=site_host,
        thread_slug=payload.thread_slug,
        parent=parent,
        author=author,
        guest_name=guest_name,
        body_markdown=payload.body_markdown,
        notify_replies=payload.notify_replies if author else False,
        status=mod_status,
        moderation_flag=mod_flag,
        moderation_reason=mod_reason,
        ip_hash=ip_hash,
    )

    # 7. Notify parent author if approved
    if mod_status == "approved" and parent and parent.notify_replies:
        send_reply_notification(parent, comment)

    serialized = _serialize_comment(comment, {comment.id: {"counts": {}, "active": []}})
    return Response(serialized.model_dump(mode="json"), status=201)


@router.patch("/comments/{int:comment_id}/", response={200: CommentOut, 400: dict, 401: dict, 404: dict})
def update_comment(request: HttpRequest, comment_id: int, payload: UpdateCommentIn):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required"}, status=401)

    comment = Comment.objects.filter(id=comment_id, author=request.user).first()
    if not comment:
        return Response({"detail": "Comment not found or not authorized"}, status=404)

    if len(payload.body_markdown) > 5000:
        return Response({"error": "Comment exceeds 5000 characters"}, status=400)

    # Kulanzzeit (3 min) check for setting edited_at
    if timezone.now() - comment.created_at > datetime.timedelta(minutes=3):
        comment.edited_at = timezone.now()

    # Synchronous Gemini Re-moderation
    mod_status, mod_flag, mod_reason = moderate_comment(payload.body_markdown)
    comment.body_markdown = payload.body_markdown
    comment.status = mod_status
    comment.moderation_flag = mod_flag
    comment.moderation_reason = mod_reason
    comment.save()

    site_host = request.get_host().split(":")[0]
    reaction_map = _build_reaction_map([comment.id], request, site_host)
    return _serialize_comment(comment, reaction_map)


@router.delete("/comments/{int:comment_id}/", response={204: None, 401: dict, 404: dict})
def delete_comment(request: HttpRequest, comment_id: int):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required"}, status=401)

    comment = Comment.objects.filter(id=comment_id, author=request.user).first()
    if not comment:
        return Response({"detail": "Comment not found or not authorized"}, status=404)

    comment.delete()
    return HttpResponse(status=204)


@router.get("/captcha/challenge/")
def get_captcha_challenge(request: HttpRequest):
    options = ChallengeOptionsV1(
        hmac_key=ALTCHA_HMAC_KEY,
        max_number=100000,
    )
    challenge = create_challenge(options)
    if hasattr(challenge, "__dict__"):
        return challenge.__dict__
    return challenge


@router.get("/notifications/unsubscribe/{str:token}/", response={200: dict, 400: dict})
def unsubscribe_notifications(request: HttpRequest, token: str):
    comment_id = verify_unsubscribe_token(token)
    if not comment_id:
        return Response({"error": "Invalid or expired unsubscribe token"}, status=400)

    comment = Comment.objects.filter(id=comment_id).first()
    if comment:
        comment.notify_replies = False
        comment.save(update_fields=["notify_replies"])

    return {"status": "unsubscribed"}
