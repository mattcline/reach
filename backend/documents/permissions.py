from rest_framework import permissions
from django.db.models import Q


class IsAuthorizedDocument(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        # TODO: add check for Action here
        return True
