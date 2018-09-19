from django.conf.urls import url

from . import consumers

websocket_urlpatterns = [
    url(r'^ws/chat/(?P<role>[-\s\w]+)/(?P<scenario>[-\s\w]+)/(?P<room_name>[^/]+)/$', consumers.ChatConsumer),
]