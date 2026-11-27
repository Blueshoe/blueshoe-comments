import logging

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from users.models import EmailLog

logger = logging.getLogger(__name__)


def get_outgoing_backend_description() -> str:
    """
    Returns a human-readable description of the outgoing mail server / backend.
    """
    backend_path = getattr(settings, "EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
    if "smtp" in backend_path.lower():
        host = getattr(settings, "EMAIL_HOST", "localhost")
        port = getattr(settings, "EMAIL_PORT", 587)
        tls = (
            "TLS"
            if getattr(settings, "EMAIL_USE_TLS", False)
            else ("SSL" if getattr(settings, "EMAIL_USE_SSL", False) else "Plain")
        )
        return f"SMTP ({host}:{port}, {tls})"
    elif "locmem" in backend_path.lower():
        return "In-Memory (LocMem/Test)"
    elif "console" in backend_path.lower():
        return "Console"
    return backend_path.split(".")[-1]


def send_and_log_email(
    *,
    subject: str,
    message: str,
    recipient_list: list[str] | str,
    trigger: str = EmailLog.Trigger.SYSTEM,
    site_host: str = "",
    page_url: str = "",
    from_email: str | None = None,
    html_message: str | None = None,
    fail_silently: bool = False,
) -> bool:
    """
    Dispatches an email and creates an immutable database audit log entry in EmailLog
    tracking the recipient, sender, subject, content, trigger, originating site,
    outgoing backend, and delivery status.
    """
    sender = from_email or getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@blueshoe.de")
    backend_desc = get_outgoing_backend_description()

    if isinstance(recipient_list, str):
        recipients = [recipient_list]
    else:
        recipients = list(recipient_list)

    success_all = True

    for recipient in recipients:
        status = EmailLog.Status.SENT
        error_msg = ""

        try:
            email_msg = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=sender,
                to=[recipient],
            )
            if html_message:
                email_msg.attach_alternative(html_message, "text/html")

            email_msg.send(fail_silently=False)
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}", exc_info=True)
            status = EmailLog.Status.FAILED
            error_msg = str(e)
            success_all = False

            # Always record the failed attempt in the database
            try:
                EmailLog.objects.create(
                    recipient=recipient,
                    sender=sender,
                    subject=subject,
                    content_text=message,
                    content_html=html_message or "",
                    trigger=trigger,
                    site_host=site_host,
                    page_url=page_url,
                    outgoing_backend=backend_desc,
                    status=status,
                    error_message=error_msg,
                )
            except Exception as log_err:
                logger.critical(f"Failed to record EmailLog for failed mail: {log_err}")

            if not fail_silently:
                raise e

        # If sending succeeded, record the sent log
        if status == EmailLog.Status.SENT:
            try:
                EmailLog.objects.create(
                    recipient=recipient,
                    sender=sender,
                    subject=subject,
                    content_text=message,
                    content_html=html_message or "",
                    trigger=trigger,
                    site_host=site_host,
                    page_url=page_url,
                    outgoing_backend=backend_desc,
                    status=status,
                    error_message="",
                )
            except Exception as log_err:
                logger.critical(f"Failed to record EmailLog: {log_err}")

    return success_all
