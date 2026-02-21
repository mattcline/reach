import logging
logger = logging.getLogger('django')

from rest_framework import viewsets, permissions, status
from rest_framework.pagination import LimitOffsetPagination

from pairdraft import views_util
from terms.models import Agreement, Terms
from terms.serializers import AgreementCreateSerializer, AgreementDetailSerializer, TermsSerializer
from terms.permissions import IsAuthorizedAgreement, IsAuthorizedTerms


class AgreementViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows agreements to be viewed or edited.
    """
    queryset = Agreement.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAuthorizedAgreement]
    
    def get_serializer_class(self):
        """
        Return a different serializer class depending on the action.
        """
        if self.action in ['create', 'update']:
            return AgreementCreateSerializer
        return AgreementDetailSerializer
    
    def get_queryset(self):
        """Filters agreements based on user permissions."""
        if views_util.is_superuser(self.request.user):
            return Agreement.objects.all()
        return Agreement.objects.filter(user_profile__user=self.request.user)
    
    
class TermsViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows terms to be viewed or edited.
    """
    queryset = Terms.objects.all()
    serializer_class = TermsSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthorizedTerms]
    filterset_fields = ['name']
    pagination_class = LimitOffsetPagination  # allows the frontend to get the most up-to-date terms by passing limit=1 in the query string
    
    # TODO: restrict the terms here (maybe to the most recent for each type)
    # because we don't want to show all different versions of the terms
    def get_queryset(self):
        return Terms.objects.order_by("-date_created")
