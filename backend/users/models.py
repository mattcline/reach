import datetime
import uuid
from typing import Optional
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from pairdraft.interfaces import ModelWithFormFields


class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=200, blank=True)
    last_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(unique=True)
    join_date = models.DateTimeField("date joined", default=timezone.now)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='user_profile')

    # google-specific fields
    google_id = models.CharField(max_length=100, unique=True, blank=True, null=True)
    photo_url = models.CharField(max_length=1000, blank=True, null=True)
        
    is_attorney = models.BooleanField(default=False, blank=True, verbose_name="Is Attorney", help_text="Whether this user is an attorney")

    stripe_customer_id = models.CharField(max_length=255, null=True, blank=True, help_text="Stripe customer ID for billing")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    def joined_recently(self):
        return self.join_date >= timezone.now() - datetime.timedelta(days=1)
    
    @property
    def is_superuser(self):
        return self.user.is_superuser
    
    @property
    def full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return ""
    
    @staticmethod
    def get_most_recent_user_profile_for_user(user):
        return UserProfile.objects.filter(user=user).order_by('-join_date').first()

    NAME_FIELDS = ["first_name", "last_name"]

    def get_form_fields(self, type: Optional[str] = None):
        if type == "name":
            return [field for field in self._meta.get_fields() if field.name in self.NAME_FIELDS]
        else:
            return []


class Preferences(models.Model, ModelWithFormFields):
    user_profile = models.OneToOneField(UserProfile, on_delete=models.CASCADE, primary_key=True, related_name='preferences')

    EMAIL_PREFERENCE_FIELDS = ["product_news", "resources"]

    product_news = models.BooleanField(default=True, blank=True, verbose_name="Product News", help_text="New features and other product improvements")
    resources = models.BooleanField(default=True, blank=True, verbose_name="Resources", help_text="New blog posts and product guides")    

    def get_form_fields(self, type: Optional[str] = None):
        if type == "email":
            return [field for field in self._meta.get_fields() if field.name in self.EMAIL_PREFERENCE_FIELDS]
        else:
            return []
