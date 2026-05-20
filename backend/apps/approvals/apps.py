from django.apps import AppConfig


class ApprovalsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.approvals"

    def ready(self) -> None:
        # Import signal handlers to wire post-save audit logging
        try:
            from . import signals  # noqa: F401
        except Exception:
            # Avoid raising during migrations or test discovery if signals import fails
            pass
