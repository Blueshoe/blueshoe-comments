from django.conf import settings
from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import User


@receiver(user_logged_in)
def adjust_session_length(sender, request, user, **kwargs):
    """
    Staff users get a shorter session length (e.g. 12 hours) for security.
    """
    if user.is_staff:
        request.session.set_expiry(getattr(settings, "STAFF_SESSION_AGE", 12 * 60 * 60))


@receiver(pre_delete, sender=User)
def anonymize_user_comments(sender, instance, **kwargs):
    """
    When a user is deleted, their comments should be retained but anonymized
    to maintain the thread structure.
    """
    # Will be implemented once we have the Comment model in the 'comments' app
    # to avoid circular imports. We can do:
    from comments.models import Comment

    Comment.objects.filter(author=instance).update(
        author=None,
        guest_name="Deleted User",
        is_deleted_author=True,
        notify_replies=False,
        ip_hash="",
    )
