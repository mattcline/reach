from functools import wraps
from users.models import UserProfile


def get_user_profile(view_func):
    @wraps(view_func)
    def wrapped_func(request, *args, **kwargs):
        user_profile = UserProfile.objects.filter(user=request.user).first()
        response = view_func(request, *args, **kwargs, user_profile=user_profile)
        return response
    return wrapped_func 
