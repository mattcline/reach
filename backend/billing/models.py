import uuid

from django.db import models

from users.models import UserProfile


class Usage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    period_start = models.DateTimeField(help_text="Start of billing period")
    period_end = models.DateTimeField(help_text="End of billing period")
    used = models.IntegerField(default=0, help_text="Number of AI credits used in this billing period")
    allowed = models.IntegerField(help_text="Number of AI credits allowed for this billing period")

    def __str__(self):
        return f"{self.user_profile.full_name} ({self.plan_tier}): {self.used}/{self.allowed} credits"

    @property
    def remaining(self):
        return max(0, self.allowed - self.used)

    @property
    def can_use(self):
        return self.used < self.allowed
