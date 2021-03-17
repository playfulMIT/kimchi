from django.conf.urls import include, url, re_path
from rest_framework import routers

from . import views

urlpatterns = [
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/versiontime", views.get_last_processed_time),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/players", views.get_player_list),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/sessions", views.get_player_to_session_map),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/puzzles", views.get_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/puzzlekeys", views.get_puzzle_keys),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/snapshotsperpuzzle", views.get_snapshot_metrics),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/attempted", views.get_attempted_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/completed", views.get_completed_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/timeperpuzzle", views.get_time_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/funnelperpuzzle", views.get_funnel_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/shapesperpuzzle", views.get_shapes_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/modesperpuzzle", views.get_modes_per_puzzle),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/levelsofactivity", views.get_levels_of_activity),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/sequencebetweenpuzzles", views.get_sequence_between_puzzles),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/mloutliers", views.get_machine_learning_outliers),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/persistence", views.get_persistence_by_attempt_data),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/puzzlepersistence", views.get_persistence_by_puzzle_data),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/insights", views.get_insights),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/difficulty", views.get_puzzle_difficulty_mapping),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/misconceptions", views.get_misconceptions_data),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/competency", views.get_competency_data),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/report/(?P<start>[0-9]+)/(?P<end>[0-9]+)", views.get_report_summary),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/report", views.get_report_summary),
    re_path(r"^api/dashboard/(?P<slug>[a-zA-Z0-9-_]+)/(?P<player>[a-zA-Z0-9-_.]+)/(?P<level>[a-zA-Z0-9-_.]+)/replayurls", views.get_replay_urls),
    re_path(r"^(?P<slug>[a-zA-Z0-9-_]+)/dashboard/", views.dashboard),
    re_path(r"^(?P<slug>[a-zA-Z0-9-_]+)/thesisdashboard/", views.thesis_dashboard)
]
