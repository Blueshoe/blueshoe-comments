from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from .utils import render_and_sanitize_markdown


class Comment(models.Model):
    STATUS_CHOICES = [
        ("approved", _("Approved")),
        ("pending", _("Pending")),
        ("rejected", _("Rejected")),
        ("spam", _("Spam")),
    ]
    MODERATION_FLAG_CHOICES = [
        ("clean", _("Clean")),
        ("spam", _("Spam")),
        ("illegal", _("Illegal")),
    ]

    # Tenancy & Threading
    site_host = models.CharField(max_length=255, db_index=True)
    thread_slug = models.CharField(max_length=255, db_index=True)
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")

    # Author Info
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    guest_name = models.CharField(max_length=100, blank=True, default="")
    is_deleted_author = models.BooleanField(default=False)

    # Content
    body_markdown = models.TextField(max_length=5000)
    body_html = models.TextField(blank=True)

    # User preferences
    notify_replies = models.BooleanField(default=False)

    # Moderation & Anti-Spam
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    moderation_flag = models.CharField(max_length=20, choices=MODERATION_FLAG_CHOICES, blank=True, null=True)
    moderation_reason = models.TextField(blank=True, default="")
    ip_hash = models.CharField(max_length=64, blank=True, default="")

    # Timestamps & Tracking
    edited_at = models.DateTimeField(null=True, blank=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = _("Comment")
        verbose_name_plural = _("Comments")
        indexes = [
            models.Index(fields=["site_host", "thread_slug"]),
        ]

    def save(self, *args, **kwargs):
        # Always render HTML from Markdown before saving
        self.body_html = render_and_sanitize_markdown(self.body_markdown)
        super().save(*args, **kwargs)

    @property
    def is_team(self):
        if self.author:
            return self.author.is_staff or self.author.email.endswith("@blueshoe.de")
        return False

    def __str__(self):
        return f"Comment {self.id} on {self.thread_slug}"
