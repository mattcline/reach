"""
Tests for MagicCodeToken authentication.
"""

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from tokens.models import MagicCodeToken
from users.models import UserProfile


class MagicCodeTokenTest(TestCase):
    """Only the most critical token security tests."""
    
    def test_token_expires(self):
        """Expired tokens must be invalid."""
        expired_token = MagicCodeToken.objects.create(
            email="test@example.com",
            action='login',
            date_expires=timezone.now() - timezone.timedelta(minutes=1)
        )
        self.assertFalse(expired_token.is_valid())
    
    def test_token_single_use(self):
        """Tokens can only be used once."""
        token = MagicCodeToken.create_for_email("test@example.com", 'login')
        token.mark_as_used()
        self.assertFalse(token.is_valid())
    
    def test_new_token_invalidates_old(self):
        """Creating a new token invalidates the previous one."""
        token1 = MagicCodeToken.create_for_email("test@example.com", 'login')
        token2 = MagicCodeToken.create_for_email("test@example.com", 'login')
        token1.refresh_from_db()
        self.assertFalse(token1.is_valid())
        self.assertTrue(token2.is_valid())
    
    def test_passwordless_login_works(self):
        """Basic passwordless login flow works."""
        # Create user
        user = User.objects.create_user(
            username='test@example.com',
            email='test@example.com'
        )
        user.set_unusable_password()
        user.save()
        
        profile = UserProfile.objects.create(
            user=user,
            email='test@example.com',
            first_name='Test',
            last_name='User'
        )
        
        # Create token
        token = MagicCodeToken.create_for_email(
            email='test@example.com',
            action='login',
            user_profile=profile
        )
        
        # Verify token
        response = self.client.post('/auth/magic-code/verify/', {
            'email': 'test@example.com',
            'code': token.code
        })
        
        self.assertEqual(response.status_code, 200)
