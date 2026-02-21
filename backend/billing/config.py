import os


PRICE_ID_TO_NUM_ALLOWED_AI_CREDITS = {
    os.environ.get('STRIPE_STARTER_MONTHLY_PRICE_ID'): 20,
    os.environ.get('STRIPE_PRO_MONTHLY_PRICE_ID'): 100,
    os.environ.get('STRIPE_MAX_MONTHLY_PRICE_ID'): 200
}

def get_num_allowed_ai_credits_for_price_id(price_id: str) -> int:
    return PRICE_ID_TO_NUM_ALLOWED_AI_CREDITS.get(price_id, 0)
