import datetime
import uuid
import random

from django.db import models
from django.utils import timezone


class Token(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=50)
    date_created = models.DateTimeField("date created", default=timezone.now)
    date_expires = models.DateTimeField("date expires")
    
    def save(self, *args, **kwargs):
        if not self.token:
            self.token = uuid.uuid4().hex
            
        # Calculate expiration date (3 days after creation)
        if not self.date_expires:
            self.date_expires = self.date_created + timezone.timedelta(days=3)
        
        # Call the original save method
        super().save(*args, **kwargs)
        

class UnsubscribeToken(Token):
    # we point to email instead of UserProfile because emails who don't have a UserProfile can opt out too
    email = models.CharField(max_length=200)


class SocketToken(Token):
    user_profile = models.ForeignKey('users.UserProfile', on_delete=models.CASCADE)


class DocumentToken(Token):
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE)


class AuthenticationToken(Token):
    """Base class for all authentication tokens"""
    email = models.EmailField()
    action = models.CharField(max_length=20, choices=[('login', 'Login'), ('signup', 'Signup')])
    user_profile = models.ForeignKey('users.UserProfile', null=True, blank=True, on_delete=models.CASCADE)
    used_at = models.DateTimeField(null=True, blank=True)
    
    def is_valid(self):
        """Check if token is valid (not used and not expired)"""
        return not self.used_at and self.date_expires > timezone.now()
    
    def mark_as_used(self):
        """Mark token as used"""
        self.used_at = timezone.now()
        self.save()
    
    def is_expired(self):
        """Check if token is expired"""
        return self.date_expires <= timezone.now()
    
    def is_used(self):
        """Check if token has been used"""
        return self.used_at is not None
    
    def get_time_until_expiry(self):
        """Get time remaining until token expires"""
        if self.is_expired():
            return timezone.timedelta(0)
        return self.date_expires - timezone.now()
    
    def get_expiry_seconds(self):
        """Get seconds until token expires"""
        return int(self.get_time_until_expiry().total_seconds())
    
    @classmethod
    def invalidate_previous_tokens(cls, email, action):
        """Invalidate all previous unused tokens for the same email and action"""
        cls.objects.filter(
            email=email,
            action=action,
            used_at__isnull=True,
            date_expires__gt=timezone.now()
        ).update(used_at=timezone.now())
    
    @classmethod
    def cleanup_expired_tokens(cls):
        """Remove expired tokens from database"""
        expired_count = cls.objects.filter(date_expires__lte=timezone.now()).count()
        cls.objects.filter(date_expires__lte=timezone.now()).delete()
        return expired_count
    
    def save(self, *args, **kwargs):
        # Override default expiration for authentication tokens (15 minutes)
        if not self.date_expires:
            self.date_expires = self.date_created + timezone.timedelta(minutes=15)
        super().save(*args, **kwargs)


class MagicCodeToken(AuthenticationToken):
    """Token for email-based magic code authentication"""
    code = models.CharField(max_length=6, blank=True, null=True)
    
    class Meta:
        verbose_name = "Magic Code Token"
        verbose_name_plural = "Magic Code Tokens"
    
    def __str__(self):
        return f"Magic Code Token for {self.email} ({self.action})"
    
    def generate_code(self):
        """Generate a 6-digit code"""
        return str(random.randint(100000, 999999))
    
    def save(self, *args, **kwargs):
        # Generate code if not provided
        if not self.code:
            self.code = self.generate_code()
        super().save(*args, **kwargs)
    
    @classmethod
    def create_for_email(cls, email, action, user_profile=None):
        """Create a new magic code token for an email, invalidating previous ones"""
        # Invalidate previous tokens
        cls.invalidate_previous_tokens(email, action)
        
        # Create new token
        token = cls.objects.create(
            email=email,
            action=action,
            user_profile=user_profile
        )
        return token
    
    @classmethod
    def get_valid_token(cls, token_value):
        """Get a valid token by token value"""
        try:
            token = cls.objects.get(token=token_value)
            if token.is_valid():
                return token
            return None
        except cls.DoesNotExist:
            return None
    
    @classmethod
    def get_valid_token_by_code(cls, code, email):
        """Get a valid token by code and email"""
        try:
            token = cls.objects.get(code=code, email=email)
            if token.is_valid():
                return token
            return None
        except cls.DoesNotExist:
            return None
