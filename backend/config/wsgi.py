"""
WSGI config for airdrop-works.

Defaults to local settings — production deployments must set
DJANGO_SETTINGS_MODULE=config.settings.production explicitly
(via Dockerfile ENV or docker-compose environment).
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
application = get_wsgi_application()
