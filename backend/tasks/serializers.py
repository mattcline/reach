from rest_framework import serializers
from tasks.models import Task
from documents.serializers import DocumentSerializer


class TaskSerializer(serializers.ModelSerializer):
    document = DocumentSerializer(read_only=True)
    
    class Meta:
        model = Task
        fields = ('id', 'title', 'due_date', 'completed', 'document')
