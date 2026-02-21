from django.db.models.signals import post_save
from django.dispatch import receiver
from users.models import UserProfile, Preferences


@receiver(post_save, sender=UserProfile)
def create_preferences(sender, instance, created, **kwargs):
    # if UserProfile was created, create a Preferences object for the user
    if created:
        Preferences.objects.create(user_profile=instance)
