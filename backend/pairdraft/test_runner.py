"""
Custom test runner that mocks email sending.
"""

import sys
from django.test.runner import DiscoverRunner
from unittest.mock import patch


class EmailMockingTestRunner(DiscoverRunner):
    """Test runner that automatically mocks email sending"""
    
    def setup_test_environment(self, **kwargs):
        """Set up the test environment, including email mocking"""
        super().setup_test_environment(**kwargs)
        
        # Mock the email service functions
        self.email_patches = []
        
        # Mock email functions at multiple import locations
        email_functions = [
            'pairdraft.email_service.gmail_send_message',
            'pairdraft.email_service.gmail_send_html_message',
            'pairdraft.email_service.send_magic_link_email_safe',
            'tokens.views.gmail_send_message',  # Direct import in views
        ]
        
        for func_path in email_functions:
            mock = patch(func_path)
            mock_obj = mock.start()
            # Return appropriate response based on function
            if 'gmail_send' in func_path:
                mock_obj.return_value = {"id": "mock-email-id"}
            else:
                mock_obj.return_value = {'success': True, 'message_id': 'mock-email-id'}
            self.email_patches.append(mock)
        
    def teardown_test_environment(self, **kwargs):
        """Tear down the test environment"""
        # Stop all email patches
        for patch_obj in self.email_patches:
            patch_obj.stop()
        
        super().teardown_test_environment(**kwargs)