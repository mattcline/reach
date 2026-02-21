import re
from rest_framework import serializers
from .models import WaitlistSignup


class WaitlistSignupSerializer(serializers.ModelSerializer):
    # Valid app names based on frontend/lib/data/apps.ts
    VALID_APPS = ['maps', 'docs', 'reviews', 'notes', 'metrics', 'analytics']
    
    class Meta:
        model = WaitlistSignup
        fields = ['email', 'app_name', 'created_at']
        read_only_fields = ['created_at']
    
    def validate_email(self, value):
        """Validate email format and normalize."""
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, value):
            raise serializers.ValidationError("Invalid email format")
        return value.lower()  # Normalize email
    
    def validate_app_name(self, value):
        if value not in self.VALID_APPS:
            raise serializers.ValidationError(
                f"Invalid app name. Must be one of: {', '.join(self.VALID_APPS)}"
            )
        return value