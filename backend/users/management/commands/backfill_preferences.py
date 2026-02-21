from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile, Preferences


# Preferences model was created after UserProfile so there are some user profiles that do not have a preferences object.
class Command(BaseCommand):
    help = "Creates preferences objects for user profiles without one."
         
    def handle(self, *args, **options):
        # Get all user profiles
        user_profiles = UserProfile.objects.all()
        for up in user_profiles:
            if not Preferences.objects.filter(user_profile=up).exists():
                preferences = Preferences.objects.create(user_profile=up)
                preferences.save()
                print(f"Created preferences for {up.email}")
                
        self.stdout.write(
            self.style.SUCCESS('Successfully backfilled preferences.')
        )
