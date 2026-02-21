from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory

from properties.models import Property
from properties.views import PropertyViewSet


def create_test_property() -> Property:
    property, _ = Property.objects.update_or_create(
        address='123 Main St.', 
        city='Test', 
        state='CA', 
        zip_code='12345',
        zpid='1'
    )
    property.save()
    return property


class PropertyViewSetTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
    
    @classmethod
    def setUpTestData(cls):
        cls.property = create_test_property()
        
    def test_returns_existing_property_with_same_zpid(self):
        """If a property already exists with the same zpid, return it."""
        # Create a request with a superuser
        request = self.factory.post('/properties/', {
            'zpid': '1'
        })
        request.user = User.objects.create_superuser(
            username='admin',
            password='adminpass',
            email='admin@admin.com'
        )

        # Ensure that only one property exists
        self.assertEqual(Property.objects.count(), 1)
    
        response = PropertyViewSet.as_view({'post': 'create'})(request)
        self.assertEqual(response.status_code, 200)
        
        # Ensure that only one property exists
        self.assertEqual(Property.objects.count(), 1)

    def test_returns_existing_property_with_same_slug(self):
        """If a property already exists with the same slug, return it."""
        # Create a request with a superuser
        request = self.factory.post('/properties/', {
            'address': '123 Main St.',
            'city': 'Test',
            'state': 'CA',
            'zip_code': '12345'
        })
        request.user = User.objects.create_superuser(
            username='admin',
            password='adminpass',
            email='admin@admin.com'
        )

        # Ensure that only one property exists
        self.assertEqual(Property.objects.count(), 1)
    
        response = PropertyViewSet.as_view({'post': 'create'})(request)
        self.assertEqual(response.status_code, 200)
        
        # Ensure that only one property exists
        self.assertEqual(Property.objects.count(), 1)
