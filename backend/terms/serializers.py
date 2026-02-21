from rest_framework import serializers

from terms.models import Agreement, Terms
from users.serializers import UserProfileSerializer
from users.models import UserProfile
from documents.models import Document


class TermsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Terms
        fields = ('id', 'name', 'title', 'text', 'date_created')


class AgreementCreateSerializer(serializers.ModelSerializer):    
    class Meta:
        model = Agreement
        fields = ('terms', 'user_profile', 'document')


class AgreementDetailSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(read_only=True)
    terms = TermsSerializer(read_only=True)
    
    class Meta:
        model = Agreement
        fields = ('terms', 'user_profile', 'document', 'date_signed')
