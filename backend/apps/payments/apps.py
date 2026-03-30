from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"

    def ready(self):
        from django.conf import settings
        from django.db.models.signals import post_save

        from .signals import create_user_subscription

        post_save.connect(create_user_subscription, sender=settings.AUTH_USER_MODEL)
