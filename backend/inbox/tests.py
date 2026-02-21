from rest_framework.test import APITestCase, APIRequestFactory
from users import util as users_util
from inbox.models import Message
from inbox.views import MessageViewSet


class RecipientsLatestMessageTest(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = MessageViewSet()
        
    @classmethod
    def setUpTestData(cls):
        cls.buyer, cls.buyer_user_profile = users_util.create_user('buyer@pairdraft.com')
        cls.seller, cls.seller_user_profile = users_util.create_user('seller@pairdraft.com')
        Message.objects.create(sender=cls.buyer_user_profile, recipient=cls.seller_user_profile, content='Hello')
        Message.objects.create(sender=cls.seller_user_profile, recipient=cls.buyer_user_profile, content='Hello')

    def test_get_recipients_latest_messages_normalizes_sender_and_recipient(self):
        request = self.factory.get('/', {'user_profile_id': self.buyer_user_profile.id}, format='json')  # omitting journey_id
        request.user = self.buyer
        self.view.request = request
        response = self.view.recipients_latest_message(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
