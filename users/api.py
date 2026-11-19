import datetime

from django.db import transaction
from django.http import HttpRequest, HttpResponse
from django.utils import timezone
from ninja import Router, Schema
from ninja.responses import Response

router = Router(tags=["Users"])


class DeleteMeIn(Schema):
    confirm: bool


@router.delete("/me/", response={204: None, 400: dict, 401: dict, 403: dict})
def delete_me(request: HttpRequest, payload: DeleteMeIn):
    if not request.user.is_authenticated:
        return Response({"detail": "Authentication required"}, status=401)

    user = request.user

    # Re-auth check (10 minutes)
    if not user.last_login or (timezone.now() - user.last_login) > datetime.timedelta(minutes=10):
        return Response({"code": "reauth_required"}, status=403)

    if not payload.confirm:
        return Response({"detail": "Confirmation required. Send {'confirm': true}."}, status=400)

    with transaction.atomic():
        # Invalidate session
        request.session.flush()
        # Delete user (triggers CASCADE and pre_delete signal for comment anonymization)
        user.delete()

    return HttpResponse(status=204)
