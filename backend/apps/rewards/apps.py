from django.apps import AppConfig


class RewardsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.rewards"

    def ready(self):
        # Register admin classes lazily to avoid import-time model import conflicts
        try:
            from . import admin as admin_mod

            if hasattr(admin_mod, "register_reward_admins"):
                admin_mod.register_reward_admins()
        except Exception:
            # Swallow errors; admin registration is best-effort in test environments
            pass
