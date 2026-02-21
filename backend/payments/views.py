import os
import logging
from datetime import timedelta

import stripe
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from pairdraft.settings import IS_PRODUCTION
from billing.config import get_num_allowed_ai_credits_for_price_id
from billing.models import Usage
from users.models import UserProfile

stripe.api_key = os.environ.get('STRIPE_API_KEY')
endpoint_secret = os.environ.get('STRIPE_ENDPOINT_SECRET')

logger = logging.getLogger('django')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    try:
        lookup_key = request.data.get('lookup_key')

        if not lookup_key:
            return Response('lookup_key is required', status=status.HTTP_400_BAD_REQUEST)

        prices = stripe.Price.list(
            lookup_keys=[lookup_key],
            expand=['data.product']
        )

        domain = os.environ.get('FRONTEND_URL', 'http://localhost:3000') if IS_PRODUCTION else 'http://localhost:3000'

        session_params = {
            'line_items': [
                {
                    'price': prices.data[0].id,
                    'quantity': 1,
                },
            ],
            'mode': 'subscription',
            'success_url': domain + '/account' + '?success=true&session_id={CHECKOUT_SESSION_ID}',
            'cancel_url': domain + '/pricing' + '?canceled=true',
            'metadata': {
                'user_profile_id': str(request.user.user_profile.id)
            },
            'payment_method_types': ['card'], # so we don't have to additionally handle 'checkout.session.async_payment_succeeded' event in webhook
            'automatic_tax': {'enabled': True}
        }

        # Add customer if we have one
        if request.user.user_profile.stripe_customer_id:
            session_params['customer'] = request.user.user_profile.stripe_customer_id
            
        session = stripe.checkout.Session.create(**session_params)
        
        return Response({"url": session.url}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error creating subscription checkout session: {e}")
        return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
def webhook(request):
    """Stripe webhook endpoint."""
    payload = request.body
    sig_header = request.META['HTTP_STRIPE_SIGNATURE']
    event = None

    try:
      event = stripe.Webhook.construct_event(
        payload, sig_header, endpoint_secret
      )
    except ValueError as e:
      # Invalid payload
      return JsonResponse({}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError as e:
      # Invalid signature
      return JsonResponse({}, status=status.HTTP_400_BAD_REQUEST)
    
    event_type = event['type']
    logger.info(f"Received Stripe webhook event: {event_type}")
    
    if event_type == 'checkout.session.completed':
        session = stripe.checkout.Session.retrieve(
          event['data']['object']['id']
        )

        user_profile_id = session.metadata.get('user_profile_id')
        customer_id = session.customer
        
        # Capture customer ID if user doesn't have one yet
        if user_profile_id and customer_id:
            try:
                user_profile = UserProfile.objects.get(id=user_profile_id)
                if not user_profile.stripe_customer_id:
                    user_profile.stripe_customer_id = customer_id
                    user_profile.save()
                    logger.info(f"Captured customer ID {customer_id} for user {user_profile.full_name}")
                else:
                    logger.info(f"User {user_profile.full_name} already has customer ID {user_profile.stripe_customer_id}")
            except UserProfile.DoesNotExist:
                logger.warning(f"User profile {user_profile_id} not found for customer ID capture")
        
        logger.info(f"Checkout session completed for session {session.id}")

    elif event_type == 'invoice.paid':
        subscription_id = event['data']['object']['subscription']

        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            customer_id = subscription.customer

            user_profile = UserProfile.objects.filter(stripe_customer_id=customer_id).first()
            if not user_profile:
                logger.warning(f"No user found for customer {customer_id}")
                return

            subscription_items = stripe.SubscriptionItem.list(
                subscription=subscription.id
            )
            if subscription_items.data:
                subscription_item = subscription_items.data[0]
                price_id = subscription_item.price.id

                allowed = get_num_allowed_ai_credits_for_price_id(price_id)

                Usage.objects.create(
                    user_profile=user_profile,
                    period_start=timezone.datetime.fromtimestamp(subscription_item.current_period_start, tz=timezone.utc),
                    period_end=timezone.datetime.fromtimestamp(subscription_item.current_period_end, tz=timezone.utc) - timedelta(seconds=1),
                    allowed=allowed
                )

                logger.info(f"Created usage record for {user_profile.full_name}: {subscription_id}")

        except stripe.error.StripeError as e:
            logger.error(f"Error updating usage record from subscription {subscription_id}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error updating usage record from subscription {subscription_id}: {e}")
    else:
        logger.info(f"Unhandled event type: {event_type}")

    # Passed signature verification
    return JsonResponse({}, status=status.HTTP_200_OK)
