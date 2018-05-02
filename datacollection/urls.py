from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views

router = routers.DefaultRouter()
router.register(r'sessions', views.GameSessionViewSet)
router.register(r'events', views.EventViewSet)



urlpatterns = [
    url(r'^api/gamesession/?$', views.GameSessionViewSet),
    url(r'^api/event/?$', views.EventViewSet),
    url(r'^api/', include(router.urls)),
    ]
