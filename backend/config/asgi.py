"""
ASGI entrypoint — HTTP (Django) + WebSocket (Channels).

Run locally: ``daphne -b 0.0.0.0 -p 8000 config.asgi:application``
"""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

from django.core.asgi import get_asgi_application

django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import AllowedHostsOriginValidator  # noqa: E402

from apps.contributions.routing import (
    websocket_urlpatterns as contributions_websocket_patterns,
)  # noqa: E402
from apps.notifications.routing import (
    websocket_urlpatterns as notifications_websocket_patterns,
)  # noqa: E402
from apps.core.channels_auth import JWTAuthMiddleware  # noqa: E402

# Combine all WebSocket routes
websocket_urlpatterns = (
    contributions_websocket_patterns + notifications_websocket_patterns
)

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        ),
    }
)
