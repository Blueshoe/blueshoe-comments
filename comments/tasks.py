import logging

from django.tasks import task
from django.utils.translation import gettext as _

logger = logging.getLogger(__name__)


@task()
def send_reply_notification_email_task(
    recipient_email: str,
    recipient_name: str,
    parent_thread_slug: str,
    parent_site_host: str,
    comment_snippet: str,
    unsubscribe_url: str,
    comment_url: str = "",
):
    """
    Asynchronous task using Django's task framework to send reply notification emails.
    """
    subject = _("New reply to your comment ({slug})").format(slug=parent_thread_slug)
    message = _(
        "Hello {name},\n\n"
        "Someone replied to your comment on {host}:\n\n"
        '"{snippet}..."\n\n'
        "View the comment here:\n"
        "{comment_url}\n\n"
        "If you no longer wish to receive notifications for this thread, click here to unsubscribe:\n"
        "{unsubscribe_url}\n"
    ).format(
        name=recipient_name,
        host=parent_site_host,
        snippet=comment_snippet,
        comment_url=comment_url,
        unsubscribe_url=unsubscribe_url,
    )

    from users.mail import send_and_log_email
    from users.models import EmailLog

    try:
        send_and_log_email(
            subject=subject,
            message=message,
            recipient_list=[recipient_email],
            trigger=EmailLog.Trigger.REPLY_NOTIFICATION,
            site_host=parent_site_host,
            page_url=comment_url,
            fail_silently=False,
        )
    except Exception as e:
        logger.error(f"Failed to send async reply notification to {recipient_email}: {e}")
        raise
