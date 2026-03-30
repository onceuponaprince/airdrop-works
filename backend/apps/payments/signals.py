from django.dispatch import receiver


def create_user_subscription(sender, instance, created, **kwargs):
    if created:
        from .models import UserSubscription

        UserSubscription.objects.get_or_create(user=instance)
