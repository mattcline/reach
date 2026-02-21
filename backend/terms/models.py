import uuid
from django.db import models
from django.utils import timezone
from users.models import UserProfile


class Terms(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100) # terms_of_service, offer_initiation, offer_completion
    title = models.CharField(max_length=100, default="")
    text = models.TextField()
    date_created = models.DateTimeField("date created", default=timezone.now)

    def __str__(self):
        return self.name
      

class Agreement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    terms = models.ForeignKey(Terms, on_delete=models.CASCADE)
    user_profile = models.ForeignKey(UserProfile, on_delete=models.SET_NULL, null=True, blank=True)
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, null=True, blank=True) # used for document-specific agreements
    date_signed = models.DateTimeField("date signed", default=timezone.now)
