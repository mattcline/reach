import os
import logging

import stripe
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from pairdraft.settings import IS_PRODUCTION
from billing.models import Usage

stripe.api_key = os.environ.get('STRIPE_API_KEY')

logger = logging.getLogger('django')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    Check if user has active subscriptions and return subscription details.
    Assume user only has one subscription.
    """
    try:
        user_profile = request.user.user_profile

        if user_profile.stripe_customer_id:
            # get all active subscriptions for this customer
            subscriptions = stripe.Subscription.list(
                customer=user_profile.stripe_customer_id,
                status='active',
                limit=10
            )

            for subscription in subscriptions.data:
                full_subscription = stripe.Subscription.retrieve(
                    subscription.id
                )
                subscription_items = stripe.SubscriptionItem.list(
                    subscription=subscription.id,
                    expand=["data.price.product"]
                )
                if subscription_items.data:
                    # grab the first subscription item, assume user only has one subscription
                    item = subscription_items.data[0]
                    product = item.price.product

                    return Response(
                        {
                            "subscription": {
                                "product_name": product.name,
                                "status": full_subscription.status,
                            }
                        },
                        status=status.HTTP_200_OK
                    )

        return Response({'subscription': None}, status=status.HTTP_200_OK)

    except stripe.error.StripeError as e:
        logger.error(f"Error fetching subscription status for user {request.user.id}: {e}")
        return Response({'subscription': None}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    """Create Stripe Customer Portal session for subscription management."""
    try:
        user_profile = request.user.user_profile

        # Check if user has a Stripe customer ID
        if not user_profile.stripe_customer_id:
            return Response({
                'error': 'No Stripe customer found. Please create a subscription first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        domain = os.environ.get('FRONTEND_URL', 'http://localhost:3000') if IS_PRODUCTION else 'http://localhost:3000'

        session = stripe.billing_portal.Session.create(
            customer=user_profile.stripe_customer_id,
            return_url=f'{domain}/account',
        )

        logger.info(f"Created portal session for user {user_profile.full_name}: {session.id}")

        return Response(
            {
                'url': session.url,
                'session_id': session.id
            },
            status=status.HTTP_200_OK
        )

    except stripe.error.StripeError as e:
        logger.error(f"Error creating portal session for user {request.user.id}: {e}")
        return Response({
            'error': f'Failed to create billing portal session: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.error(f"Unexpected error creating portal session for user {request.user.id}: {e}")
        return Response({
            'error': 'An unexpected error occurred'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_user_usage(request):
    """Check user's current usage."""
    user_profile = request.user.user_profile

    now = timezone.now()

    usage = Usage.objects.filter(
        user_profile=user_profile,
        period_start__lte=now,
        period_end__gt=now
    ).first()

    return Response(
        {
            'used': usage.used if usage else 0,
            'allowed': usage.allowed if usage else 0,
            'remaining': usage.remaining if usage else 0,
            'billing_period_end': usage.period_end.isoformat() if usage else None,
            'days_until_reset': (usage.period_end - now).days + 1 if usage else 0 # +1 to include current day
        },
        status=status.HTTP_200_OK
    )
