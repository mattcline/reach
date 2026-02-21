from rest_framework import serializers

from inbox.models import Message
from users.serializers import UserProfileSerializerAbbreviated


class MessageSerializer(serializers.ModelSerializer):
    sender = UserProfileSerializerAbbreviated(read_only=True)
    recipient = UserProfileSerializerAbbreviated(read_only=True)
    
    class Meta:
        model = Message
        fields = ('id', 'sender', 'recipient', 'content', 'timestamp', 'read')
