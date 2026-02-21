from typing import Dict
from rest_framework import status, viewsets, permissions
from inbox.serializers import MessageSerializer
from django.db.models import Q
from inbox.models import Message
from users.models import UserProfile
from django.http import JsonResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
import logging
logger = logging.getLogger('django')


class MessageViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows messages to be viewed or edited.
    """
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    filterset_fields = ['sender', 'recipient']
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # filter messages to those the user has access to
        return Message.objects.filter(Q(sender__user=self.request.user) | Q(recipient__user=self.request.user))

    @action(detail=False, methods=['get'])
    def recipients_latest_message(self, request, pk=None):
        # TODO: store and retrieve recipients from redis
        # TODO: paginate messages, limit 10 per page

        user_profile_id = request.GET.get('user_profile_id', None)
        user_profile = UserProfile.objects.filter(id=user_profile_id).first()
        
        if not user_profile:
            return Response("User profile does not exist", status=status.HTTP_404_NOT_FOUND)

        filter_expression = Q(sender=user_profile) | Q(recipient=user_profile)
        
        messages = (
            Message.objects
            .filter(filter_expression)
            .order_by('sender', 'recipient')
            .distinct('sender', 'recipient')
        )

        # get latest message for each sender/recipient (A -> B or B -> A) pair since
        # we only filtered for unique sender/recipient pairs above
        recipients_latest_messages: Dict[str, Message] = {}
        for message in messages:
            if message.sender == user_profile:
                recipient = message.recipient
            else:
                recipient = message.sender
            
            # set or update the most recent message for this recipient
            if recipient.id not in recipients_latest_messages or message.timestamp > recipients_latest_messages[recipient.id].timestamp:
                recipients_latest_messages[recipient.id] = message
                
        # sort messages by timestamp in descending order
        sorted_recipients_latest_messages = list(recipients_latest_messages.values())
        sorted_recipients_latest_messages.sort(key=lambda x: x.timestamp, reverse=True)

        serializer = MessageSerializer(sorted_recipients_latest_messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def recipient_messages(self, request, pk=None):
        user_profile_id = request.GET.get('user_profile_id', None)
        recipient_id = request.GET.get('recipient_id', None)
        
        user_profile = UserProfile.objects.filter(id=user_profile_id).first()
        recipient = UserProfile.objects.filter(id=recipient_id).first()
        
        if not user_profile:
            return Response("User profile does not exist", status=status.HTTP_404_NOT_FOUND)
        
        if not recipient:
            return Response("Recipient does not exist", status=status.HTTP_404_NOT_FOUND)

        if not request.user.is_superuser and user_profile.user != request.user:
            return Response("You do not have access", status=status.HTTP_403_FORBIDDEN)

        filter_expression = Q(sender=user_profile) | Q(recipient=user_profile)
        messages = (
            Message.objects
            .filter(filter_expression)
            .order_by('timestamp')
        )
        
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
