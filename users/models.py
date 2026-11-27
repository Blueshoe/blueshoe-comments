from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    class Meta:
        verbose_name = _("User Account")
        verbose_name_plural = _("User Accounts")


class EmailLog(models.Model):
    """
    Audit log of all outgoing emails sent by the system, tracking recipients,
    content, trigger, originating site, outgoing backend, and delivery status.
    """

    class Trigger(models.TextChoices):
        MAGIC_LINK = "magic_login_link", _("Magic Login Link")
        REPLY_NOTIFICATION = "reply_notification", _("Reply Notification")
        COMMENT_PENDING_REVIEW = "comment_pending_review", _("Comment Pending Review")
        SYSTEM = "system", _("System / General")

    class Status(models.TextChoices):
        SENT = "sent", _("Sent")
        FAILED = "failed", _("Failed")

    recipient = models.EmailField(_("Recipient Email"), max_length=254, db_index=True)
    sender = models.CharField(_("Sender Email"), max_length=254)
    subject = models.CharField(_("Subject"), max_length=500)
    content_text = models.TextField(_("Text Content"))
    content_html = models.TextField(_("HTML Content"), blank=True)
    trigger = models.CharField(
        _("Trigger"),
        max_length=100,
        choices=Trigger.choices,
        default=Trigger.SYSTEM,
        db_index=True,
    )
    site_host = models.CharField(_("Site Host"), max_length=255, blank=True, db_index=True)
    page_url = models.CharField(_("Page / URL"), max_length=1000, blank=True)
    outgoing_backend = models.CharField(_("Outgoing Backend"), max_length=255)
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=Status.choices,
        default=Status.SENT,
        db_index=True,
    )
    error_message = models.TextField(_("Error Message"), blank=True)
    sent_at = models.DateTimeField(_("Sent At"), auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _("Email Log")
        verbose_name_plural = _("Email Logs")
        ordering = ["-sent_at"]

    def __str__(self):
        return f"[{self.sent_at:%Y-%m-%d %H:%M}] {self.trigger} -> {self.recipient} ({self.status})"
