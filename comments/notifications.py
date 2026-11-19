import logging

from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

from .tasks import send_reply_notification_email_task

logger = logging.getLogger(__name__)
signer = TimestampSigner()


def generate_unsubscribe_token(comment_id: int) -> str:
    return signer.sign_object({"comment_id": comment_id})


def verify_unsubscribe_token(token: str, max_age: int = 60 * 60 * 24 * 365) -> int | None:
    try:
        data = signer.unsign_object(token, max_age=max_age)
        return data.get("comment_id")
    except (BadSignature, SignatureExpired):
        return None


def send_reply_notification(parent_comment, new_comment):
    """
    Enqueues an async email notification task using Django's task framework.
    """
    if not parent_comment.author or not parent_comment.author.email or not parent_comment.notify_replies:
        return None

    # Do not notify if user replies to their own comment
    if parent_comment.author == new_comment.author:
        return None

    token = generate_unsubscribe_token(parent_comment.id)
    host = parent_comment.site_host or "blueshoe.de"
    unsubscribe_url = f"https://{host}/api/notifications/unsubscribe/{token}/"
    clean_slug = parent_comment.thread_slug.lstrip("/")
    comment_url = f"https://{host}/{clean_slug}/#comment-{new_comment.id}"
    name = parent_comment.author.first_name or parent_comment.author.username
    snippet = new_comment.body_markdown[:200]

    # Enqueue async job via Django Task Framework
    return send_reply_notification_email_task.enqueue(
        recipient_email=parent_comment.author.email,
        recipient_name=name,
        parent_thread_slug=parent_comment.thread_slug,
        parent_site_host=host,
        comment_snippet=snippet,
        unsubscribe_url=unsubscribe_url,
        comment_url=comment_url,
    )
