from django.urls import path, re_path
from django.views.generic import RedirectView
from shadowspect.utils import get_config_json, get_level_json, get_replay_json
# from datacollection.views import generate_replay
from . import views

urlpatterns = [
    path("static/shadowspect_static/StreamingAssets/config.json", get_config_json),
    path("static/shadowspect_static/StreamingAssets/generated_replay.json", get_replay_json),
    re_path(
        r"^static/shadowspect_static/StreamingAssets/(?P<slug>[a-zA-Z0-9-_]+).json",
        get_level_json,
    ),
    # re_path(r"^replay/(?P<slug>[a-zA-Z0-9-]+).json", generate_replay),
    path("mturk/", views.mturk),
    path("levelloader/", views.levelloader),
    path("", RedirectView.as_view(url="http://shadowspect.org")),
    path("<slug:slug>/", views.wildcard_url),
    path("<slug:slug>/players/", views.wildcard_players),
    re_path(r'^(?P<slug>\w+)/?P<player>[a-zA-Z0-9-_.]+/$', views.wildcard_levels),
    re_path(r'^(?P<slug>\w+)/?P<player>[a-zA-Z0-9-_.]+/?P<player>[a-zA-Z0-9-_.]+/$', views.wildcard_replay),
    # path("<slug:slug>/players/<slug:player>/", views.wildcard_levels),
    # path("<slug:slug>/players/<slug:player>/<slug:level>/", views.wildcard_replay),
]
