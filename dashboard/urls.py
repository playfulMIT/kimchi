from django.conf.urls import include, url, re_path
from rest_framework import routers

from . import views

urlpatterns = [
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/players", views.get_player_list),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/sessions", views.get_player_to_session_map),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/snapshot", views.get_snapshot_metrics),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/attempted", views.get_attempted_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/completed", views.get_completed_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/timeperpuzzle", views.get_time_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/funnelperpuzzle", views.get_funnel_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/shapesperpuzzle", views.get_shapes_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/modesperpuzzle", views.get_modes_per_puzzle),
    re_path(r"^(?P<slug>[a-zA-Z0-9-_]+)/dashboard/", views.dashboard),
]