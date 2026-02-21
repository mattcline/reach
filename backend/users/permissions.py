from django.utils import timezone
from rest_framework import permissions
from tokens.models import UnsubscribeToken


class IsAuthorizedPreferences(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """
    def has_permission(self, request, view):
        if 'token' in request.query_params:
            # check if the token is valid
            token = request.query_params.get('token')
            if UnsubscribeToken.objects.filter(token=token, date_expires__gt=timezone.now()).exists():
                return True
      
        # if token is not provided, default to checking if the user is authenticated (taken from DRF's permissions.IsAuthenticated)
        return bool(request.user and request.user.is_authenticated)  
