from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views



router = routers.DefaultRouter()
router.register(r'gamesession', views.GameSessionViewSet)
router.register(r'events', views.EventViewSet)


#
# urlpatterns = [
#     url(r'^api/gamesession/?$', views.GameSessionViewSet),
#     url(r'^api/events/?$', views.EventViewSet),
#     url(r'^api/', include(router.urls)),
#     ]
