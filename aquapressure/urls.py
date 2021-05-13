from django.urls import path, re_path
from django.views.generic import RedirectView, TemplateView
from shadowspect.utils import get_config_json, get_level_json, get_replay_json
# from datacollection.views import generate_replay
from . import views
from kimchi.settings import HOMEPAGE

urlpatterns = [
    path("static/aquapressure_static/StreamingAssets/config.json", get_config_json),
    # path("static/shadowspect_static/StreamingAssets/generated_replay.json", get_replay_json),
    # re_path(
    #     r"^static/shadowspect_static/StreamingAssets/(?P<slug>[a-zA-Z0-9-_]+).json",
    #     get_level_json,
    # ),
    # path("static/shadowspect_replay_static/StreamingAssets/config.json", get_config_json),
    # path("static/shadowspect_replay_static/StreamingAssets/generated_replay.json", get_replay_json),
    # re_path(
    #     r"^static/shadowspect_replay_static/StreamingAssets/(?P<slug>[a-zA-Z0-9-_]+).json",
    #     get_level_json,
    # ),
    # path("mturk/", views.mturk),
    # path("levelloader/", views.levelloader),
    path("",TemplateView.as_view(template_name="aquapressure/index.html")),
    path("comingSoon.html",TemplateView.as_view(template_name="aquapressure/comingSoon.html")),
    path("index.html",RedirectView.as_view(url="")),
    path("<slug:slug>/", views.wildcard_url),
    # path("<slug:slug>/players/", views.wildcard_players),
    # re_path(r'^(?P<slug>\w+)/players/(?P<player>[a-zA-Z0-9-_.]+)/$', views.wildcard_levels),
    # re_path(r'^(?P<slug>\w+)/players/(?P<player>[a-zA-Z0-9-_.]+)/(?P<level>[a-zA-Z0-9-_.]+)/$', views.wildcard_attempts),
    # re_path(r'^(?P<slug>\w+)/players/(?P<player>[a-zA-Z0-9-_.]+)/(?P<level>[a-zA-Z0-9-_.]+)/(?P<attempt>[a-zA-Z0-9-_.]+)/$', views.wildcard_replay),
]
