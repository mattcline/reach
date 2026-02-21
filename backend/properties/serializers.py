from rest_framework import serializers
from rest_framework.fields import UUIDField
from properties.models import Property
from properties.permissions import IsAuthorized


class PropertySerializer(serializers.ModelSerializer):
    id = UUIDField(format='hex', read_only=True)
    slug = serializers.SerializerMethodField()  # https://www.django-rest-framework.org/api-guide/fields/#serializermethodfield

    class Meta:
        model = Property
        fields = '__all__'
        
    def get_slug(self, obj):
        return obj.slug

    
class PropertyAddressSerializer(PropertySerializer):
    # used for a subset of property fields including address and slug
    class Meta:
        model = Property
        fields = ('id', 'slug', 'address', 'city', 'state', 'zip_code', 'public_listing')
