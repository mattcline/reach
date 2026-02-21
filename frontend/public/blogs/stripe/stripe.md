## How to Set Up Payments for a Platform of Agents

October 2, 2025

I built a platform for my agents and I needed a way to monetize them.  Instead of setting up subscription plans for *each* agent, I decided to set up subscription plans for **all** agents on the platform.

It looks like this:

![Alt text](/blogs/stripe/pricing.png)

#### AI Credits

When a user signs up for a plan, they are given an allotment of **AI credits** to redeem using *any* number of agents on the platform.

Think of each AI credit as a unit of *value* and each plan has a different amount of credits.

Users are free to choose how to spend their AI credits and when they subscribe to a plan, they have the assurance of an upper bound on their spending.

#### Value to Unit of Work Ratio
 
Since each agent is different, each unit of work corresponds to a different level of value.  For example, an image generation (1 unit of work) produces more value than a simple paragraph text generation (also 1 unit of work).

Since these units of work carry different value, they are redeemable by a different amount of AI credits.  For example, 1 image generation is redeemable by 5 AI credits and 1 paragraph text suggestion requires .1 AI credits.

I show this unit of work to AI credit ratio by estimating what the user can achieve with each agent:

![Alt text](/blogs/stripe/examples.png)

So now whenever I add a new agent to the platform, the only thing I need to do is define the unit of work to AI credit ratio.  Which is a lot easier than setting up new subscription plans for each new agent.

#### Checkout via Stripe

I use Stripe to handle my payments and subscriptions.

Stripe documentation has a few different guides (with boilerplate code ready to use) and I chose this one: [https://docs.stripe.com/billing/quickstart](https://docs.stripe.com/billing/quickstart)

I chose that one because it uses a prebuilt Stripe-hosted checkout page, which is simpler than other alternatives like [embedding a form](https://docs.stripe.com/checkout/embedded/quickstart) to manage checkout.

Here's the overall flow:

##### Create checkout session

![Alt text](/blogs/stripe/create_checkout_session.png)

The client reaches out to my server to create a checkout session and recieve a url to the Stripe-hosted checkout page.

Here are the parameters I specify when creating the checkout session in Stripe:

```
{
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
```

Note that I pass 'user_profile_id' in 'metadata' - this is useful for fulfilling the subscription and is covered below (see `checkout.session.completed` event).

Upon successful checkout in Stripe's hosted checkout page, navigate to Account page.  Upon failed checkout, navigate back to pricing page.

#### Fulfill the subscription

Stripe's servers send your server events when things happen, like when the customer pays for a subscription.

When you're testing events locally, you want to make sure you receive events via a webhook function.  But first, you have to create a tunnel from your local environment to Stripe's servers so you can listen to these events.  To do that, run the following command:

```
stripe listen --forward-to localhost:8000/payments/webhook/
```

In this example, the backend server is running on port 8000 and my webhook function is accessible via `payments/webhook`.  Note that you will need to adjust these parameters according to your setup.

Note: when you're ready to deploy to production, configure the webhook endpoint so it can receive events from Stripe:
https://dashboard.stripe.com/webhooks

For more information about webhooks, see https://docs.stripe.com/webhooks

Upon a user successfully checking out and purchasing a subscription, the webhook function is responsible for **"fulfilling"** the subscription by enabling usage in the platform.

In my webhook, I listen for two events: 

1. `checkout.session.completed`: associate Stripe customer id with user profile
2. `invoice.paid`: create Usage record (next section) and allot the correct amount of AI credits to the user according to the subscription plan

#### Usage

I have a Usage model to track the amount of available and used/redeemed AI credits for a user during a certain billing period.  It looks like this:

```
class Usage(models.Model):
	user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
	period_start = models.DateTimeField(help_text="Start of billing period")
	period_end = models.DateTimeField(help_text="End of billing period")
	used = models.IntegerField(default=0, help_text="Number of AI credits used in this billing period")
	allowed = models.IntegerField(help_text="Number of AI credits allowed for this billing period")
```

Whenever a user uses a certain amount of AI credits, I update the Usage record for that user.

I also display this information for the user to monitor their own usage in their account page:

![Alt text](/blogs/stripe/usage.png)

#### Manage Subscription

Users need to be able to manage their subscription.  Thankfully, Stripe makes this really easy with their "Customer portal".

![Alt text](/blogs/stripe/manage.png)

The user can view and manage their subscription in their account page.

If they click "Manage", the client sends (which creates a portal session via create-portal-session (similar redirect to create-checkout-session), covered in the quickstart guide too)

Similar to creating a checkout session (which I covered earlier), Stripe creates a portal session where the user can manage their subscription (cancel, update, etc.).

![Alt text](/blogs/stripe/create_portal_session.png)

##### Setting up Stripe Customer Portal

Note: it's important to make sure you're in test mode:

![Alt text](/blogs/stripe/test_mode.png)

1. In the Stripe dashboard, navigate to Settings -> Billing -> Customer Portal
2. Expand "Subscriptions"
3. Turn on "Customers can switch plans"
4. Add all products (subscription plans)
5. Click "Save Changes"