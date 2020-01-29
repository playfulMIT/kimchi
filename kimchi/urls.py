"""kimchi URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path

from datacollection.views import generate_replay
from shadowspect.utils import get_config_json, get_level_json
from shadowspect.views import debug

urlpatterns = [
    path("debug/", debug),
    path("admin/", admin.site.urls),
    path("", include("datacollection.urls")),
    path("", include("shadowspect.urls")),
    path("", include("dashboard.urls")),
    path("static/shadowspect_static/StreamingAssets/config.json", get_config_json),
    re_path(
        r"^static/shadowspect_static/StreamingAssets/(?P<slug>[a-zA-Z0-9-_]+).json",
        get_level_json,
    ),
    re_path(r"^replay/(?P<slug>[a-zA-Z0-9-]+).json", generate_replay),
]
