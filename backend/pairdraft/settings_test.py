"""
Test settings for Django project.
Inherits from main settings but disables rate limiting middleware.
"""

from .settings import *
from unittest.mock import Mock

# Remove rate limiting middleware for tests
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'tokens.middleware.CSRFExemptAuthMiddleware',  # Handle CSRF for auth endpoints
    'django.middleware.csrf.CsrfViewMiddleware',
    # 'tokens.middleware.AuthenticationSecurityMiddleware',  # DISABLED for tests
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Use in-memory cache for tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# Disable Redis for tests
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

# Use console email backend for tests (prints to console instead of sending)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable actual email sending by clearing Google credentials
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = ''

# Use custom test runner that mocks email sending
TEST_RUNNER = 'pairdraft.test_runner.EmailMockingTestRunner'