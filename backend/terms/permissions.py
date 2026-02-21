from rest_framework import permissions


class IsAuthorizedAgreement(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        return obj.user_profile.user == request.user
    

class IsAuthorizedTerms(permissions.BasePermission):
    """
    Object-level permission to only allow superusers to edit terms.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # only superusers can edit terms
        return request.user.is_superuser
