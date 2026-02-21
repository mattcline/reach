import uuid
from django.db import models


class WaitlistSignup(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    app_name = models.CharField(max_length=50)  # 'docs', 'maps', 'reviews', etc.
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.email} - {self.app_name}"
