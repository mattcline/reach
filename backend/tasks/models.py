import uuid
from django.db import models
from django.utils import timezone


def one_week_from_now():
    return timezone.now() + timezone.timedelta(weeks=1)


class Task(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=100, default="")
    due_date = models.DateTimeField("due date", default=one_week_from_now)
    completed = models.BooleanField(default=False)
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE, null=True, blank=True)
    # TODO: add user_profile field
