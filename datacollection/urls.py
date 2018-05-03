from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views
from django.views.decorators.csrf import csrf_exempt


router = routers.DefaultRouter()
router.register(r'sessions', views.GameSessionViewSet)
router.register(r'events', views.EventViewSet)



urlpatterns = [
    url(r'^api/gamesession/?$', csrf_exempt(views.GameSessionViewSet)),
    url(r'^api/event/?$', csrf_exempt(views.EventViewSet)),
    url(r'^api/', include(router.urls)),
    ]
