from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views
from django.urls import path


urlpatterns = [
    path('test/', views.mitfp),
    path('playtest/', views.playtest),
    path('', views.shapes),
]

