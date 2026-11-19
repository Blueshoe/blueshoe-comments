from django.conf import settings
from django.db import models

from comments.models import Comment


class Reaction(models.Model):
    KIND_CHOICES = [
        ("like", "👍"),
        ("love", "❤️"),
        ("rocket", "🚀"),
        ("celebrate", "🎉"),
        ("insightful", "💡"),
    ]

    site_host = models.CharField(max_length=255, db_index=True)
    thread_slug = models.CharField(max_length=255, db_index=True)
    comment = models.ForeignKey(Comment, null=True, blank=True, on_delete=models.CASCADE, related_name="reactions")

    kind = models.CharField(max_length=20, choices=KIND_CHOICES)

    # Deduplication
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE)
    anon_hash = models.CharField(max_length=64, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["site_host", "thread_slug"]),
            models.Index(fields=["comment"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["comment", "kind", "user"],
                condition=models.Q(user__isnull=False, comment__isnull=False),
                name="unique_user_comment_reaction",
            ),
            models.UniqueConstraint(
                fields=["thread_slug", "kind", "user"],
                condition=models.Q(user__isnull=False, comment__isnull=True),
                name="unique_user_page_reaction",
            ),
            models.UniqueConstraint(
                fields=["comment", "kind", "anon_hash"],
                condition=models.Q(user__isnull=True, comment__isnull=False),
                name="unique_anon_comment_reaction",
            ),
            models.UniqueConstraint(
                fields=["thread_slug", "kind", "anon_hash"],
                condition=models.Q(user__isnull=True, comment__isnull=True),
                name="unique_anon_page_reaction",
            ),
        ]

    def __str__(self):
        target = f"Comment {self.comment_id}" if self.comment_id else f"Page {self.thread_slug}"
        return f"{self.kind} on {target}"
