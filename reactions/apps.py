from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ReactionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "reactions"
    verbose_name = _("Reactions & Engagement")
