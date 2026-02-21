from rest_framework.decorators import action
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from django.utils import timezone
from pairdraft import views_util
from agent.serializers import AgentMessageSerializer
from agent.models import AgentMessage
import logging

logger = logging.getLogger('django')


class AgentMessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows agent messages to be viewed or created.
    """
    queryset = AgentMessage.objects.all()
    serializer_class = AgentMessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document', 'user_profile', 'role']
    
    def get_queryset(self):
        """Filter messages based on user permissions."""
        if views_util.is_superuser(self.request.user):
            return AgentMessage.objects.all()
        return AgentMessage.objects.filter(user_profile__user=self.request.user)
    
    def create(self, request):
        """Create a new agent message."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Ensure user can only create messages for themselves
        user_profile = request.user.user_profile
        serializer.save(user_profile=user_profile)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export conversation history for a document."""
        document_id = request.query_params.get('document_id')
        if not document_id:
            return Response(
                {"error": "document_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        messages = self.get_queryset().filter(document_id=document_id).order_by('timestamp')
        serializer = self.get_serializer(messages, many=True)
        
        # Format for export
        export_data = {
            "document_id": document_id,
            "export_date": timezone.now().isoformat(),
            "messages": serializer.data
        }
        
        return Response(export_data)