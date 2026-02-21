from rest_framework import serializers

from users.models import UserProfile, Preferences


class PreferencesSerializer(serializers.ModelSerializer):
    user_profile_id = serializers.SerializerMethodField()
    lookup_field = 'user_profile'
    
    def get_user_profile_id(self, obj):
        return obj.user_profile.id
    
    class Meta:
        model = Preferences
        fields = ('user_profile_id', 'product_news', 'resources')


class UserProfileSerializer(serializers.ModelSerializer):
    preferences = PreferencesSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = ('id', 'first_name', 'last_name', 'is_superuser', 'email', 'full_name', 'photo_url', 'is_attorney', 'preferences')


class UserProfileSerializerAbbreviated(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('id', 'full_name', 'photo_url', 'is_attorney')
