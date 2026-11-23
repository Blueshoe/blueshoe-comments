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


def send_moderation_pending_email(comment):
    """
    Sends an email to the comment author explaining why their comment is held in pending review
    and provides the assessment/reason so they can revise it.
    """
    if not comment.author or not comment.author.email:
        return None

    name = comment.author.get_full_name() or comment.author.first_name or comment.author.username
    reason = comment.moderation_reason or "Your comment requires editorial review before publication."
    live_url = comment.get_absolute_url()

    subject = "Your comment on Blueshoe Community requires review or revision"
    message = (
        f"Hello {name}!\n\n"
        f"Thank you for participating in our discussions.\n\n"
        f"Your comment is currently held in pending review and has not yet been published.\n\n"
        f"Assessment / Reason:\n{reason}\n\n"
        f"Original comment:\n{comment.body_markdown}\n\n"
        f"You can review and revise your comment directly on the article page:\n{live_url}\n\n"
        f"Best regards,\n"
        f"The Blueshoe Community Editorial Team\n"
    )
    from django.conf import settings
    from django.core.mail import send_mail

    try:
        return send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@blueshoe.de"),
            recipient_list=[comment.author.email],
            fail_silently=True,
        )
    except Exception:
        return None
