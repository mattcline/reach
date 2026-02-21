from typing import Optional
from unittest.mock import patch, Mock

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APIRequestFactory

from users import util as users_util
from properties.tests import create_test_property
from tokens.models import DocumentToken
from documents.models import Document, Action
from documents.permissions import IsAuthorizedDocument
from documents.views import DocumentViewSet


# TODO: fix
class DocumentViewSetTest(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = DocumentViewSet()
        
    @classmethod
    def setUpTestData(cls):
        cls.property = create_test_property()

        # Create a buyer
        cls.buyer, user_profile = users_util.create_user('buyer@pairdraft.com')
        # journey, _ = agent_util.create_journey(user_profile, cls.property, role=JourneyUserProfile.BUYER)
        
        # associate two documents with the buyer
        cls.document1 = Document.objects.create()
        cls.document2 = Document.objects.create()
        
        # Create an unrelated seller
        cls.seller, user_profile = users_util.create_user('seller@pairdraft.com')
        # journey, _ = agent_util.create_journey(user_profile, cls.property, role=JourneyUserProfile.SELLER)
        
        # associate one document with the seller
        cls.document3 = Document.objects.create()
        
    def test_get_queryset_returns_documents_for_only_that_user(self):
        request = self.factory.get('/')
        request.user = self.buyer
        self.view.request = request
        
        queryset = self.view.get_queryset()
        self.assertEqual(set(queryset), set([self.document1, self.document2]))
        
    def test_get_queryset_returns_no_documents_for_user_with_no_documents(self):
        # Create a user with no documents
        user, user_profile = users_util.create_user('test@pairdraft.com')
        # journey, _ = agent_util.create_journey(user_profile, self.property, role=JourneyUserProfile.BUYER)
        
        request = self.factory.get('/')
        request.user = user
        self.view.request = request
        
        queryset = self.view.get_queryset()
        self.assertEqual(queryset.count(), 0)
        
    def test_get_queryset_returns_all_documents_for_superuser(self):
        request = self.factory.get('/')
        request.user = User.objects.create_superuser(username='admin', password='adminpass', email='admin@admin.com')
        self.view.request = request
        
        queryset = self.view.get_queryset()
        self.assertEqual(set(queryset), set([self.document1, self.document2, self.document3]))


# TODO: fix
class IsAuthorizedDocumentTest(TestCase):
    def create_user_with_access_level(self, access_level: Optional[str]) -> User:
        """Creates a user with a journey and associates the document with the journey if an access_level is provided."""
        # Create a user and journey for that user
        user, user_profile = users_util.create_user('test@pairdraft.com')
        # journey, _ = agent_util.create_journey(user_profile, self.property, role=JourneyUserProfile.BUYER)
        
        # Associate the document with the journey
        if access_level is not None:
            # TODO: create an Action
            pass
        
        return user

    def setUp(self):
        self.factory = APIRequestFactory()
    
    @classmethod
    def setUpTestData(cls):
        cls.property = create_test_property()
        cls.document = Document.objects.create()

    def test_superuser_has_permission(self):
        # Create a request with a superuser
        request = self.factory.get('/')
        request.user = User.objects.create_superuser(username='admin', password='adminpass', email='admin@admin.com')

        # Check if the permission is granted
        permission = IsAuthorizedDocument()
        self.assertTrue(permission.has_object_permission(request, None, self.document))

    def test_owner_has_read_permission(self):
        # Create a request with the document owner
        request = self.factory.get('/')
        request.user = self.create_user_with_access_level()

        # Check if the permission is granted
        permission = IsAuthorizedDocument()
        self.assertTrue(permission.has_object_permission(request, None, self.document))
        
    def test_owner_has_write_permission(self):
        # Create a request with the document owner
        request = self.factory.put('/') # PUT is used for write access
        request.user = self.create_user_with_access_level()

        # Check if the permission is granted
        permission = IsAuthorizedDocument()
        self.assertTrue(permission.has_object_permission(request, None, self.document))

    def test_non_owner_without_read_permission(self):
        # Create a request with a user who does not have read permission
        request = self.factory.get('/')
        request.user = self.create_user_with_access_level(access_level=None)

        # Check if the permission is denied
        permission = IsAuthorizedDocument()
        self.assertFalse(permission.has_object_permission(request, None, self.document))

    def test_non_owner_with_read_permission(self):
        # Create a request with a user who has read permission
        request = self.factory.get('/')
        request.user = self.create_user_with_access_level()

        # Check if the permission is granted
        permission = IsAuthorizedDocument()
        self.assertTrue(permission.has_object_permission(request, None, self.document))
        
    def test_non_owner_with_write_permission(self):
        # Create a request with a user who has read permission
        request = self.factory.put('/') # PUT is used for write access
        request.user = self.create_user_with_access_level()

        # Check if the permission is granted
        permission = IsAuthorizedDocument()
        self.assertTrue(permission.has_object_permission(request, None, self.document))


# DocumentViewSet tests

class SubmitTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        _, cls.from_user = users_util.create_user('buyer@pairdraft.com')
        _, cls.to_user = users_util.create_user('seller@pairdraft.com')

        # from_user creates a document
        cls.document = Document.objects.create()
        Action.objects.create(
            document=cls.document,
            from_user=cls.from_user,
            type=Action.CREATE
        )

    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = DocumentViewSet.as_view({'post': 'submit'})
        self.url = f"/documents/{self.document.id}/submit/"
        
    @patch('documents.models.Document.get_available_actions', return_value=[])
    def test_unauthorized_user(
        self,
        get_available_actions_mock: Mock
    ):
        request = self.factory.post(self.url)
        request.user = self.from_user.user
        response = self.view(request, pk=self.document.id)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data, f'You cannot {Action.SUBMIT} the offer.')
    
    def test_no_recipient(self):
        request = self.factory.post(self.url)
        request.user = self.from_user.user
        response = self.view(request, pk=self.document.id)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, 'No recipient specified.')
    
    @patch('documents.views.gmail_send_message')
    @patch('documents.models.Document.get_to_user')
    def test_to_user(
        self,
        get_to_user_mock: Mock,
        gmail_send_message_mock: Mock
    ):
        """
        Test when no user is specified
        but we grab the to_user from the document history.
        """
        get_to_user_mock.return_value = self.to_user

        request = self.factory.post(self.url)
        request.user = self.from_user.user
        
        self.assertEqual(1, Action.objects.count())

        response = self.view(request, pk=self.document.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(2, Action.objects.count())
        self.assertTrue(
            Action.objects.filter(
                type=Action.SUBMIT,
                from_user=self.from_user,
                to_user=self.to_user,
                document=self.document
            ).exists()
        )
        
        link = f'http://localhost:3000/login?next=/documents/{self.document.id}'
        gmail_send_message_mock.assert_called_once_with(
            'seller@pairdraft.com',
            'You have a new offer!',
            f'Hello {self.to_user.first_name} {self.to_user.last_name},\n\nYou have a new offer from ' +
            f'{self.from_user.full_name}! ' +
            f'Click the link below to view the document:\n\n{link}\n\nBest,\nPairDraft Team'
        )

    @patch('documents.views.gmail_send_message')
    def test_email_for_existing_user(
        self,
        gmail_send_message_mock: Mock
    ):
        request = self.factory.post(
            self.url,
            {
                'email': 'seller@pairdraft.com'
            }
        )
        request.user = self.from_user.user
        
        self.assertEqual(1, Action.objects.count())

        response = self.view(request, pk=self.document.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(2, Action.objects.count())
        self.assertTrue(
            Action.objects.filter(
                type=Action.SUBMIT,
                from_user=self.from_user,
                to_user=self.to_user,
                document=self.document
            ).exists()
        )
        
        link = f'http://localhost:3000/login?next=/documents/{self.document.id}'
        gmail_send_message_mock.assert_called_once_with(
            'seller@pairdraft.com',
            'You have a new offer!',
            f'Hello {self.to_user.first_name} {self.to_user.last_name},\n\nYou have a new offer from ' +
            f'{self.from_user.full_name}! ' +
            f'Click the link below to view the document:\n\n{link}\n\nBest,\nPairDraft Team'
        )

    @patch('documents.views.gmail_send_message')
    def test_email_for_new_user(
        self,
        gmail_send_message_mock: Mock
    ):
        request = self.factory.post(
            self.url,
            {
                'email': 'new_user@pairdraft.com',
                'first_name': 'New',
                'last_name': 'User'
            }
        )
        request.user = self.from_user.user
        
        self.assertEqual(1, Action.objects.count())
        
        self.assertEqual(0, DocumentToken.objects.count())

        response = self.view(request, pk=self.document.id)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(1, Action.objects.count())
        
        self.assertEqual(1, DocumentToken.objects.count())
        document_token = DocumentToken.objects.filter(document=self.document).first()
        if not document_token:
            self.fail('document_token is None')
        
        link = f'http://localhost:3000/login?next=/documents/{self.document.id}/link-offeree?token={document_token.token}'
        gmail_send_message_mock.assert_called_once_with(
            'new_user@pairdraft.com',
            'You have a new offer!',
            f'Hello New User,\n\nYou have a new offer from ' +
            f'{self.from_user.full_name}! ' +
            f'Click the link below to view the document:\n\n{link}\n\nBest,\nPairDraft Team'
        )
