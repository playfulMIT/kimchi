from django.conf.urls import include, url
from rest_framework import routers
# from django.conf import settings
from . import views
from django.urls import path, re_path


urlpatterns = [
    path('test/', views.mitfp),
    path('playtest/', views.playtest),
    path('sept18/', views.gamews),
    path('stg0910/', views.stg0910),
    path('stg0924/', views.stg0924),
    path('', views.shapes),
    re_path(r'^(?P<slug>[a-zA-Z0-9-]+)/$', views.wildcard_url),
]

