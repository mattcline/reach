"""
Error handling utilities for authentication endpoints.

This module provides standardized error response formats, logging utilities,
and security monitoring for all authentication-related operations.
"""

import logging
from typing import Dict, Any, Optional, Union
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from django.utils import timezone
from enum import Enum

# Configure logger for authentication security events
auth_logger = logging.getLogger('auth_security')
django_logger = logging.getLogger('django')
logger = logging.getLogger(__name__)


class AuthErrorCode(Enum):
    """Standardized error codes for authentication operations."""
    
    # Input validation errors
    EMAIL_REQUIRED = "EMAIL_REQUIRED"
    EMAIL_INVALID = "EMAIL_INVALID"
    INVALID_INPUT = "INVALID_INPUT"
    
    # Token-related errors
    TOKEN_INVALID = "TOKEN_INVALID"
    
    # User-related errors
    USER_NOT_FOUND = "USER_NOT_FOUND"
    USER_CREATION_FAILED = "USER_CREATION_FAILED"
    
    # Email service errors
    EMAIL_SEND_FAILED = "EMAIL_SEND_FAILED"
    
    # Generic errors
    INTERNAL_ERROR = "INTERNAL_ERROR"


class AuthErrorSeverity(Enum):
    """Error severity levels for logging and monitoring."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


def create_error_response(
    error_code: Union[AuthErrorCode, str],
    message: str,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    method: Optional[str] = None,
    retry_after: Optional[int] = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> Response:
    """
    Create a standardized error response for authentication endpoints.
    
    Args:
        error_code: Standardized error code
        message: Human-readable error message
        status_code: HTTP status code
        method: Authentication method (e.g., 'magic_code')
        retry_after: Seconds to wait before retrying (for rate limiting)
        additional_data: Additional data to include in response
        
    Returns:
        DRF Response object with standardized error format
    """
    error_code_str = error_code.value if isinstance(error_code, AuthErrorCode) else error_code
    
    response_data = {
        "success": False,
        "error": message,
        "error_code": error_code_str,
        "timestamp": timezone.now().isoformat()
    }
    
    if method:
        response_data["method"] = method
    
    if retry_after is not None:
        response_data["retry_after"] = retry_after
    
    if additional_data:
        response_data.update(additional_data)
    
    return Response(response_data, status=status_code)


def log_auth_event(
    event_type: str,
    email: Optional[str] = None,
    method: Optional[str] = None,
    action: Optional[str] = None,
    error_code: Optional[Union[AuthErrorCode, str]] = None,
    severity: AuthErrorSeverity = AuthErrorSeverity.LOW,
    additional_data: Optional[Dict[str, Any]] = None,
    request_ip: Optional[str] = None,
    user_agent: Optional[str] = None
) -> None:
    """
    Log authentication events for security monitoring.
    
    Args:
        event_type: Type of event (e.g., 'otp_requested', 'token_verified')
        email: Email address involved in the event
        method: Authentication method used
        action: Action type ('login' or 'signup')
        error_code: Error code if this is an error event
        severity: Severity level of the event
        additional_data: Additional data to log
        request_ip: IP address of the request
        user_agent: User agent string
    """
    log_data = {
        "event_type": event_type,
        "timestamp": timezone.now().isoformat(),
        "severity": severity.value
    }
    
    if email:
        # Mask email for privacy in logs (show first 2 chars and domain)
        email_parts = email.split('@')
        if len(email_parts) == 2:
            masked_email = f"{email_parts[0][:2]}***@{email_parts[1]}"
        else:
            masked_email = "***@***"
        log_data["email"] = masked_email
    
    if method:
        log_data["method"] = method
    
    if action:
        log_data["action"] = action
    
    if error_code:
        error_code_str = error_code.value if isinstance(error_code, AuthErrorCode) else error_code
        log_data["error_code"] = error_code_str
    
    if request_ip:
        log_data["request_ip"] = request_ip
    
    if user_agent:
        log_data["user_agent"] = user_agent
    
    if additional_data:
        log_data.update(additional_data)
    
    # Log to appropriate logger based on severity
    log_message = f"Auth Event: {event_type}"
    if email:
        log_message += f" for {masked_email}"
    
    if severity in [AuthErrorSeverity.HIGH, AuthErrorSeverity.CRITICAL]:
        auth_logger.error(log_message, extra=log_data)
    elif severity == AuthErrorSeverity.MEDIUM:
        auth_logger.warning(log_message, extra=log_data)
    else:
        auth_logger.info(log_message, extra=log_data)


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP address from request.
    
    Args:
        request: Django request object
        
    Returns:
        Client IP address or None
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request) -> Optional[str]:
    """
    Extract user agent from request.
    
    Args:
        request: Django request object
        
    Returns:
        User agent string or None
    """
    return request.META.get('HTTP_USER_AGENT')


def validate_email_input(email: Optional[str]) -> Optional[Response]:
    """
    Validate email input and return error response if invalid.
    
    Args:
        email: Email address to validate
        
    Returns:
        Error response if validation fails, None if valid
    """
    if not email:
        return create_error_response(
            error_code=AuthErrorCode.EMAIL_REQUIRED,
            message="Email is required",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError
    
    try:
        validate_email(email)
    except ValidationError:
        return create_error_response(
            error_code=AuthErrorCode.EMAIL_INVALID,
            message="Invalid email format",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    return None


def log_successful_auth(
    event_type: str,
    email: str,
    method: str,
    action: str,
    request = None,
    additional_data: Optional[Dict[str, Any]] = None
) -> None:
    """
    Log successful authentication events.
    
    Args:
        event_type: Type of successful event
        email: Email address
        method: Authentication method
        action: Action type
        request: Django request object
        additional_data: Additional data to log
    """
    request_ip = get_client_ip(request) if request else None
    user_agent = get_user_agent(request) if request else None
    
    log_auth_event(
        event_type=event_type,
        email=email,
        method=method,
        action=action,
        severity=AuthErrorSeverity.LOW,
        additional_data=additional_data,
        request_ip=request_ip,
        user_agent=user_agent
    )
