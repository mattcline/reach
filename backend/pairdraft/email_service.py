import os
import json
import base64
import uuid
import logging
import time
from typing import Optional, Dict, Any

logger = logging.getLogger('django')

from django.utils import timezone
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from pairdraft.settings import IS_PRODUCTION
from tokens.models import UnsubscribeToken
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


SCOPES = ['https://www.googleapis.com/auth/gmail.send']


def authenticate_gmail():
    token_json = os.getenv('GMAIL_TOKEN')
    if not token_json:
        raise ValueError("GMAIL_TOKEN environment variable not set")
    
    creds = Credentials.from_authorized_user_info(
        json.loads(token_json), SCOPES
    )
    
    # Refresh if expired (happens automatically on first use if needed)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    
    return build('gmail', 'v1', credentials=creds)


def gmail_send_message(recipient_email: str, subject: str, content: str, skip_unsubscribe: bool = False):
    """Create and send an email message containing HTML content.
    
    Args:
        recipient_email (str): Email address to send to
        subject (str): Email subject line
        content (str): HTML email content
        skip_unsubscribe (bool, optional): Skip adding unsubscribe links (for pre-templated content)
        
    Returns: Message object, including message id

    Load pre-authorized user credentials from the environment.
    TODO(developer) - See https://developers.google.com/identity
    for guides on implementing OAuth2 for the application.
    """
    # TODO: check if user is opted into receiving this type of email

    try:
        service = authenticate_gmail()
        
        # Create unsubscribe token (only if not skipping unsubscribe)
        if not skip_unsubscribe:
            token = UnsubscribeToken.objects.filter(email=recipient_email).first()
            if token:
                # update token expiration date
                token.date_expires = timezone.now() + timezone.timedelta(days=3)
                # refresh token value
                token.token = uuid.uuid4().hex
                token.save()
            else:
                # create new token if one doesn't already exist
                token = UnsubscribeToken(email=recipient_email)
                token.save()
            
            # Add unsubscribe link to content
            url = os.environ.get('FRONTEND_URL', 'http://localhost:3000') if IS_PRODUCTION else 'http://localhost:3000'

            manage_email_preferences_link = f'<a href="{url}/email-preferences?token={token.token}">Manage your email preferences</a>'
            unsubscribe_link = f'<a href="{url}/email-preferences?token={token.token}">unsubscribe</a>'
            unsubscribe_html = f'<p style="font-size: 12px; color: #666; margin-top: 32px;">{manage_email_preferences_link} or {unsubscribe_link}.</p>'

            content += unsubscribe_html

        message = MIMEText(content, 'html')

        message["To"] = recipient_email
        message["From"] = f"Reach <{os.environ.get('EMAIL_FROM', 'noreply@example.com')}>"
        message["Subject"] = subject

        # encoded message
        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

        create_message = {"raw": encoded_message}
        # pylint: disable=E1101
        send_message = (
            service.users()
            .messages()
            .send(userId="me", body=create_message)
            .execute()
      )
        logger.info(f'Message Id: {send_message["id"]}')
    except HttpError as error:
        logger.info(f"An error occurred sending gmail to {recipient_email}: {error}")
        send_message = None
    return send_message
