import logging

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie

from rest_framework import status, permissions, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pairdraft import views_util
from tokens.models import UnsubscribeToken
from users.models import Preferences, UserProfile
from users.permissions import IsAuthorizedPreferences
from users.serializers import PreferencesSerializer, UserProfileSerializer

logger = logging.getLogger('django')


# TODO: look into deprecating this in favor of the UserProfileViewSet
# we have to use JsonResponse instead of Response we can't add @api_view() decorator
# since we can't add a permission class
@ensure_csrf_cookie # required in order to set initial csrf cookie on the frontend
def index(request):
    # used to refresh the user on the frontend
    if request.user.is_authenticated:
        user_profile = UserProfile.objects.filter(user=request.user).first()
        return JsonResponse({ 
            "user_profile": UserProfileSerializer(user_profile, context={'request': request}).data if user_profile else None,
        }, 
        status=status.HTTP_200_OK)
    else:
        return JsonResponse({}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete(request):
    """
    Delete the authenticated user's account
    """
    try:
        user = request.user
        user.delete()
        return Response(
            {'message': 'Account successfully deleted'},
            status=status.HTTP_204_NO_CONTENT
        )
    except Exception as e:
        return Response(
            {'error': 'Failed to delete account'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class UserProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows user profiles to be viewed or edited.
    """
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filters query to only return the user profile of the current user, 
        unless the user is a superuser.
        """
        if views_util.is_superuser(self.request.user):
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)

    @action(detail=True, methods=['get'])
    def editable_fields(self, request, pk=None):
        """Returns a list of editable fields to be used for editing a user's profile on the frontend."""
        user_profile = self.get_object()
        type = request.query_params.get('type')
        editable_fields = views_util.get_editable_fields(user_profile, type=type)
        return Response(editable_fields, status=status.HTTP_200_OK)


class PreferencesViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows preferences to be viewed or edited.
    """
    serializer_class = PreferencesSerializer
    permission_classes = [IsAuthorizedPreferences]
    
    def get_queryset(self):
        """
        Filters query to only return the preferences of the current user, 
        unless the user is a superuser.
        """
        if views_util.is_superuser(self.request.user):
            return Preferences.objects.all()
        
        # if a token was provided, check if it is valid and return the preferences for that user
        token = self.request.GET.get('token')
        if token:
            return self.get_queryset_from_token(token)

        return Preferences.objects.filter(user_profile__user=self.request.user) # TODO: test this
    
    def get_queryset_from_token(self, token: str):
        unsubscribe_token = UnsubscribeToken.objects.filter(token=token, date_expires__gt=timezone.now()).first()
        if unsubscribe_token:
            user_profile = UserProfile.objects.filter(email=unsubscribe_token.email).first()
            if user_profile:
                return Preferences.objects.filter(user_profile=user_profile)
        return Preferences.objects.none()   # return an empty queryset if token is invalid
    
    def get_preferences(self):
        token = self.request.GET.get('token')
        user_id = self.request.GET.get('user_id')
        if token:
            return self.get_queryset_from_token(token).first()
        elif user_id:
            return Preferences.objects.filter(user_profile__id=user_id).first()

    @action(detail=False, methods=['get'])
    def editable_fields(self, request, pk=None):
        """Returns a list of editable fields to be used for editing a user's preferences on the frontend."""
        preferences = self.get_preferences()
        if not preferences:
            return Response("Invalid token or user id", status=status.HTTP_400_BAD_REQUEST)

        type = request.query_params.get('type')
        editable_fields = views_util.get_editable_fields(preferences, type=type)
        return Response(editable_fields, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['patch'])
    def update_preferences(self, request, pk=None):
        """Update a Preferences object given a token or user_id."""
        preferences = self.get_preferences()
        if not preferences:
            return Response("Invalid token or user id", status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(preferences, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
