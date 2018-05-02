from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views

router = routers.DefaultRouter()
router.register(r'sessions', views.SessionViewSet)
# router.register(r'appdata', views.AppDataViewSet)
# router.register(r'configuration', views.ConfigurationViewSet)
# router.register(r'users', views.UserViewSet)


urlpatterns = [
    url(r'^api/session/?$', views.SessionViewSet.as_view()),
    url(r'^api/', include(router.urls)),
    ]
