from rest_framework import serializers

from agent.models import AgentMessage


class AgentMessageSerializer(serializers.ModelSerializer):
    user_profile_name = serializers.CharField(source='user_profile.full_name', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    
    class Meta:
        model = AgentMessage
        fields = ('id', 'user_profile', 'user_profile_name', 'document', 'document_title', 
                 'role', 'content', 'timestamp', 'metadata')
        read_only_fields = ('id', 'timestamp')
