"""Auto-create a Profile whenever a new User is saved."""
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_on_user_creation(sender, instance, created, **kwargs):
    if created:
        from .models import Profile
        Profile.objects.get_or_create(user=instance)
