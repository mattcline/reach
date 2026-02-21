import os
from typing import Tuple
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

from users.models import UserProfile


def create_user(email, first_name='First', last_name='Last') -> Tuple[User, UserProfile]:
    user, _ = User.objects.update_or_create(
        username=email, email=email, defaults={'password': make_password(os.environ.get('LOCAL_USER_PASSWORD'))}
    )
    user.save()
    user_profile, _ = UserProfile.objects.update_or_create(
        first_name=first_name, last_name=last_name, email=email, user=user
    )
    user_profile.save()
    return user, user_profile
