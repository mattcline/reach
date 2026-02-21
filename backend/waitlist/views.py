from rest_framework import viewsets, permissions
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .models import WaitlistSignup
from .serializers import WaitlistSignupSerializer


@method_decorator(ratelimit(key='ip', rate='5/m', method='POST'), name='create')
class WaitlistSignupViewSet(viewsets.ModelViewSet):
    """
    API endpoint for waitlist signups.
    Public endpoint - no authentication required.
    Rate limited to 5 signups per minute per IP address.
    """
    queryset = WaitlistSignup.objects.all()
    serializer_class = WaitlistSignupSerializer
    permission_classes = [permissions.AllowAny]
    
    # Only allow creating signups (POST), not listing/updating/deleting
    http_method_names = ['post']
