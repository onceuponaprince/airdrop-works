import os

env = os.environ.get("DJANGO_ENV", "local")

if env == "production":
    from .production import *  # noqa
else:
    from .local import *  # noqa
