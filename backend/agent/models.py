import uuid

from django.db import models


class AgentMessage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_profile = models.ForeignKey('users.UserProfile', on_delete=models.CASCADE, related_name='agent_messages')
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, related_name='agent_messages')
    
    USER = 'user'
    AGENT = 'agent'
    ROLE_CHOICES = (
        (USER, 'User'),
        (AGENT, 'Agent')
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional data like model version, token count, etc.")
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."
