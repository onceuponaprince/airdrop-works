from django.urls import path

from . import consumers

websocket_urlpatterns = [
    path("ws/twitter/feed/", consumers.TwitterFeedConsumer.as_asgi()),
]
