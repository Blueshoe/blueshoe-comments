from django.utils.translation import activate, deactivate
from django.utils.translation import gettext as _


def test_translation_en_and_de():
    # 1. Default English
    activate("en")
    assert _("Approved") == "Approved"
    assert _("Deleted User") == "Deleted User"
    assert _("Guest") == "Guest"

    # 2. German
    activate("de")
    assert _("Approved") == "Freigegeben"
    assert _("Deleted User") == "Gelöschter Nutzer"
    assert _("Guest") == "Gast"

    deactivate()
