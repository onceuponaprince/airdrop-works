"""
ASGI config for airdrop-works.

Exposes the ASGI application as ``config.asgi.application``.
Currently unused (Gunicorn serves WSGI), but referenced by
ASGI_APPLICATION in base settings and required for future
WebSocket / async view support.
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
application = get_asgi_application()
