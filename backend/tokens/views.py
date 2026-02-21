from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
import logging
logger = logging.getLogger('tokens')

from tokens.models import SocketToken, MagicCodeToken
from users.models import UserProfile
from tokens.errors import (
    AuthErrorCode,
    AuthErrorSeverity,
    create_error_response,
    log_auth_event,
    log_successful_auth,
    validate_email_input,
    get_client_ip,
    get_user_agent
)
from pairdraft.email_service import gmail_send_message
from pairdraft.settings import IS_PRODUCTION
from django.contrib.auth import login
from users.serializers import UserProfileSerializer
import os


@api_view()
@permission_classes([IsAuthenticated])
def create_socket_token(request):
    """
    We have this endpoint because ws requests do not come from the same domain
    which means the csrftoken and sessionid cookies are not passed in the ws request
    so we need to authenticate the user with a custom token.
    
    Things I've tried:
    - setting the cookies' samesite to none and turning on secure flag 
        but Safari and mobile Chrome browser by default do not send cookies cross domain
    """
    try:
        socket_token = SocketToken.objects.create(
            user_profile=request.user.user_profile,
            date_expires=timezone.now() + timezone.timedelta(minutes=1)
        )
        socket_token.save()
        
        return Response({ "token": socket_token.token }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error creating socket token: {e}")
        return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_magic_code_email(email: str, code: str, action: str, first_name: str = None) -> bool:
    """
    Send magic code email to user.
    
    Args:
        email: Recipient email address
        code: 6-digit verification code
        action: Action type ('login' or 'signup')
        first_name: User's first name for personalization
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    try:    
        subject = "Your Reach login code"
        greeting = f"Hi {first_name}," if first_name else "Hi there,"
        content = f"""
        <div>
            <div>
                {greeting}
            </div>

            <div>
                {'Welcome to Reach!' if action == 'signup' else ''}  Your verification code is:
            </div>

            <div>{code}</div>

            <div>
                {'Enter this code on the signup page to complete your account setup.' if action == 'signup' else 'Enter this code on the login page to access your Reach account.'}
            </div>
            <div>
                This code will expire in 15 minutes for security reasons.
            </div>
            <div>
                If you didn't request this, you can safely ignore this email.
            </div>
            <div>
                Best regards,
                Reach Team
            </div>
        </div>"""
        
        # Send email
        result = gmail_send_message(email, subject, content)
        return result is not None
        
    except Exception as e:
        logger.error(f"Error sending magic code email to {email}: {e}")
        return False


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def magic_code_request(request):
    """
    Request a magic code for authentication.
    Handles both login and signup scenarios based on email existence.
    """
    try:
        # Validate input data
        validation_error = validate_email_input(request.data.get('email'))
        if validation_error:
            return validation_error
        
        email = request.data.get('email')
        
        # Check if user exists to determine action
        user_exists = User.objects.filter(email=email).exists()
        action = 'login' if user_exists else 'signup'
        
        # Get user profile if user exists
        user_profile = None
        first_name = None
        if user_exists:
            user = User.objects.get(email=email)
            user_profile = getattr(user, 'user_profile', None)
            if user_profile:
                first_name = user_profile.first_name
        
        # Create magic code token
        try:
            token = MagicCodeToken.create_for_email(email, action, user_profile)
        except Exception as e:
            logger.error(f"Error creating magic code token: {e}")
            return create_error_response(
                error_code=AuthErrorCode.INTERNAL_ERROR,
                message="Failed to create verification code",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                method="magic_code"
            )
        
        # Send magic code email
        email_sent = send_magic_code_email(email, token.code, action, first_name)
        
        if not email_sent:
            log_auth_event(
                event_type="magic_code_email_failed",
                email=email,
                method="magic_code",
                action=action,
                error_code=AuthErrorCode.EMAIL_SEND_FAILED,
                severity=AuthErrorSeverity.HIGH,
                request_ip=get_client_ip(request),
                user_agent=get_user_agent(request)
            )
            return create_error_response(
                error_code=AuthErrorCode.EMAIL_SEND_FAILED,
                message="Failed to send email. Please try again.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                method="magic_code"
            )
        
        # Log successful request
        log_successful_auth(
            event_type="magic_code_requested",
            email=email,
            method="magic_code",
            action=action,
            request=request,
            additional_data={
                "token_id": str(token.id),
                "expires_in": token.get_expiry_seconds(),
                "user_exists": user_exists
            }
        )
        
        return Response({
            "success": True,
            "method": "magic_code",
            "action": action,
            "message": "Verification code sent to your email",
            "expires_in": token.get_expiry_seconds()
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in magic_code_request endpoint: {e}")
        return create_error_response(
            error_code=AuthErrorCode.INTERNAL_ERROR,
            message="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            method="magic_code"
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def magic_code_verify(request):
    """
    Verify a magic code for authentication.
    """
    try:
        # Validate input data
        code = request.data.get('code')
        email = request.data.get('email')
        
        if not code or not email:
            return create_error_response(
                error_code=AuthErrorCode.INVALID_INPUT,
                message="Email and code are required",
                status_code=status.HTTP_400_BAD_REQUEST,
                method="magic_code"
            )
        
        # Get valid token by code and email
        token_obj = MagicCodeToken.get_valid_token_by_code(code, email)
        
        if not token_obj:
            log_auth_event(
                event_type="magic_code_verification_failed",
                email=email,
                method="magic_code",
                error_code=AuthErrorCode.TOKEN_INVALID,
                severity=AuthErrorSeverity.MEDIUM,
                additional_data={"code": code},
                request_ip=get_client_ip(request),
                user_agent=get_user_agent(request)
            )
            return create_error_response(
                error_code=AuthErrorCode.TOKEN_INVALID,
                message="Invalid or expired code",
                status_code=status.HTTP_400_BAD_REQUEST,
                method="magic_code"
            )
        
        # Mark token as used
        token_obj.mark_as_used()
        
        # Extract token info
        token_info = {
            'email': token_obj.email,
            'action': token_obj.action,
            'user_profile': token_obj.user_profile,
            'token_id': str(token_obj.id)
        }
        
        email = token_info['email']
        action = token_info['action']
        existing_user_profile = token_info['user_profile']
        
        # Handle user creation for signup tokens
        if action == 'signup' and not existing_user_profile:
            try:
                # For signup, we need first_name and last_name
                first_name = request.data.get('first_name', '')
                last_name = request.data.get('last_name', '')
                
                # Create new user
                user = User.objects.create_user(username=email, email=email)
                user.save()
                
                # Create user profile
                user_profile = UserProfile.objects.create(
                    user=user,
                    email=email,
                    first_name=first_name,
                    last_name=last_name
                )
                
                log_successful_auth(
                    event_type="user_created_via_magic_code",
                    email=email,
                    method="magic_code",
                    action=action,
                    request=request,
                    additional_data={"user_id": str(user.id), "user_profile_id": str(user_profile.id)}
                )
                
            except Exception as e:
                log_auth_event(
                    event_type="user_creation_failed",
                    email=email,
                    method="magic_code",
                    action=action,
                    error_code=AuthErrorCode.USER_CREATION_FAILED,
                    severity=AuthErrorSeverity.HIGH,
                    additional_data={"error_type": type(e).__name__, "error_message": str(e)},
                    request_ip=get_client_ip(request),
                    user_agent=get_user_agent(request)
                )
                return create_error_response(
                    error_code=AuthErrorCode.USER_CREATION_FAILED,
                    message="Failed to create user account",
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    method="magic_code"
                )
        
        elif action == 'login' or existing_user_profile:
            # For login or existing users, get the user profile
            if existing_user_profile:
                user_profile = existing_user_profile
                user = user_profile.user
            else:
                # Find user by email
                try:
                    user = User.objects.get(email=email)
                    # Handle users without profiles (e.g., legacy users with passwords)
                    try:
                        user_profile = user.user_profile
                    except UserProfile.DoesNotExist:
                        # Create profile for existing user
                        logger.warning(f"User {email} exists but has no profile. Creating profile.")
                        user_profile = UserProfile.objects.create(
                            user=user,
                            email=email,
                            first_name=user.first_name or '',
                            last_name=user.last_name or ''
                        )
                        log_auth_event(
                            event_type="user_profile_created_for_existing_user",
                            email=email,
                            method="magic_code",
                            action=action,
                            severity=AuthErrorSeverity.LOW,
                            additional_data={"user_id": str(user.id), "user_profile_id": str(user_profile.id)},
                            request_ip=get_client_ip(request),
                            user_agent=get_user_agent(request)
                        )
                except User.DoesNotExist:
                    log_auth_event(
                        event_type="user_not_found_during_login",
                        email=email,
                        method="magic_code",
                        action=action,
                        error_code=AuthErrorCode.USER_NOT_FOUND,
                        severity=AuthErrorSeverity.MEDIUM,
                        request_ip=get_client_ip(request),
                        user_agent=get_user_agent(request)
                    )
                    return create_error_response(
                        error_code=AuthErrorCode.USER_NOT_FOUND,
                        message="User not found",
                        status_code=status.HTTP_404_NOT_FOUND,
                        method="magic_code"
                    )
        
        # Authenticate the user
        login(request, user)
        
        # Serialize user profile
        serialized_user_profile = UserProfileSerializer(user_profile).data
        
        # Log successful authentication
        log_successful_auth(
            event_type="magic_code_authentication_successful",
            email=email,
            method="magic_code",
            action=action,
            request=request,
            additional_data={
                "user_id": str(user.id),
                "user_profile_id": str(user_profile.id)
            }
        )
        
        return Response({
            "success": True,
            "method": "magic_code",
            "action": action,
            "user_profile": serialized_user_profile,
            "needs_profile_completion": action == 'signup' and not first_name
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error in magic_code_verify endpoint: {e}")
        return create_error_response(
            error_code=AuthErrorCode.INTERNAL_ERROR,
            message="Internal server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            method="magic_code"
        )
