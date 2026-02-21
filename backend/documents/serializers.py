from rest_framework import serializers

from documents.models import Document, Action, Thread, Comment
from users.models import UserProfile
from users.serializers import UserProfileSerializerAbbreviated
from properties.serializers import PropertyAddressSerializer

 
class ActionSerializer(serializers.ModelSerializer):
    from_user = UserProfileSerializerAbbreviated(read_only=True)
    to_user = UserProfileSerializerAbbreviated(read_only=True)
    
    class Meta:
        model = Action
        fields = ('id', 'type', 'from_user', 'to_user', 'timestamp')


class DocumentSerializer(serializers.ModelSerializer):
    root = serializers.PrimaryKeyRelatedField(
        queryset=Document.objects.all(),
        required=False,
        allow_null=True
    )
    actions = ActionSerializer(many=True, read_only=True)
    property_address = PropertyAddressSerializer(source='property', read_only=True)

    class Meta:
        model = Document
        fields = ('id', 'title', 'root', 'actions', 'property', 'property_address')


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.PrimaryKeyRelatedField(queryset=UserProfile.objects.all(), write_only=True)
    author_details = UserProfileSerializerAbbreviated(source='author', read_only=True)
    thread = serializers.PrimaryKeyRelatedField(queryset=Thread.objects.all(), write_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'content', 'timestamp', 'author', 'author_details', 'thread')


class ThreadSerializer(serializers.ModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Thread
        fields = ('id', 'document', 'resolved', 'comments')
