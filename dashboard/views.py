import json
import datetime
from operator import or_
from functools import reduce

from django.db.models import Q
from django.shortcuts import render
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse

from datacollection.models import Event, CustomSession, Player

def dashboard(request, slug):
    return render(request, "dashboard/dashboard.html", {"url": slug})

# TODO: should this be based on the last url per student (currently implemented) or any url they have been on?
def create_player_to_session_map(url):
    player_to_session_map = dict()
    sessions = CustomSession.objects.filter(url__name=url)
    
    for session in sessions:
        if session.player:
            if session.player.pk in player_to_session_map:
                player_to_session_map[session.player.pk].append(session.pk)
            else:
                player_to_session_map[session.player.pk] = [session.pk]
    return player_to_session_map

def create_player_list(url, include_name = False):
    if include_name:
        return CustomSession.objects.filter(url__name=url).values_list("player__name", "player__pk").distinct()
    return CustomSession.objects.filter(url__name=url).values_list("player__pk", flat = True).distinct()

def get_player_list(request, slug):
    pk_to_player_map = dict()
    player_list = create_player_list(slug, True)
    for (player, pk) in player_list:
        if not player or player == "null":
            continue
        pk_to_player_map[pk] = player
    return JsonResponse(pk_to_player_map)

def get_player_to_session_map(request, slug):
    return JsonResponse(create_player_to_session_map(slug))

def get_snapshot_metrics(request, slug):
    player_to_snapshot_map = dict()
    player_to_session_map = create_player_to_session_map(slug)

    for player in player_to_session_map:
        sessions = player_to_session_map[player]
        player_to_snapshot_map[player] = Event.objects.filter(session__pk__in=sessions, type='ws-snapshot').count()

    return JsonResponse(player_to_snapshot_map)

def get_attempted_puzzles(request, slug):
    players = create_player_list(slug)

    attempted = dict()
    for player in players:
        try:
            attempted[player] = list(Player.objects.get(pk=player, url__name=slug).attempted.values_list("filename", flat=True))
        except ObjectDoesNotExist:
            attempted[player] = []

    return JsonResponse(attempted)

def get_completed_puzzles(request, slug):
    players = create_player_list(slug)

    completed = dict()
    for player in players:
        try:
            completed[player] = list(Player.objects.get(pk=player, url__name=slug).completed.values_list("filename", flat=True))
        except ObjectDoesNotExist:
            completed[player] = []

    return JsonResponse(completed)

def get_time_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    player_time_map = dict()

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-puzzle_complete']]), 
            session__pk__in=sessions
        ).order_by('time')
        
        puzzle_time_map = dict()
        for event in events:
            key = json.loads(event.data)['task_id']
            if not key in puzzle_time_map:
                puzzle_time_map[key] = []

            if event.type == "ws-puzzle_started":
                puzzle_time_map[key].append({
                    'start': event.time,
                    'end': None
                })
            else:
                puzzle_time_map[key][-1]['end'] = event.time

        player_time_map[player] = dict()
        for puzzle in puzzle_time_map:
            player_time_map[player][puzzle] = []
            for attempt in puzzle_time_map[puzzle]:
                start = attempt['start'] 
                end = attempt['end']

                if start and end:
                    player_time_map[player][puzzle].append((end - start).total_seconds())
                else:
                    player_time_map[player][puzzle].append(None)

    return JsonResponse(player_time_map)

def get_funnel_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    puzzle_funnel_map = dict()

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-create_shape', 'ws-check_solution', 'ws-puzzle_complete']]), 
            session__pk__in=sessions
        ).order_by('time')
        
        current_puzzle = None
        for event in events:
            if event.type == "ws-puzzle_started":
                current_puzzle = json.loads(event.data)['task_id']
                if not current_puzzle in puzzle_funnel_map:
                    puzzle_funnel_map[current_puzzle] = dict()
                if not player in puzzle_funnel_map[current_puzzle]:
                    puzzle_funnel_map[current_puzzle][player] = {
                        'started': 0,
                        'create_shape': 0,
                        'submitted': 0,
                        'completed': 0
                    }
                puzzle_funnel_map[current_puzzle][player]['started'] += 1
            elif event.type == "ws-create_shape":
                puzzle_funnel_map[current_puzzle][player]['create_shape'] += 1
            elif event.type == "ws-check_solution":
                puzzle_funnel_map[current_puzzle][player]['submitted'] += 1
            elif event.type == "ws-puzzle_complete":
                puzzle_funnel_map[current_puzzle][player]['completed'] += 1

    return JsonResponse(puzzle_funnel_map)

# TODO: should i account for deleted shapes? what about shapes per attempt? 
def get_shapes_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    puzzle_shape_map = dict()

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-create_shape']]), 
            session__pk__in=sessions
        ).order_by('time')
        
        current_puzzle = None
        for event in events:
            data = json.loads(event.data)
            if event.type == "ws-puzzle_started":
                current_puzzle = data['task_id']
                if not current_puzzle in puzzle_shape_map:
                    puzzle_shape_map[current_puzzle] = dict()
                if not player in puzzle_shape_map[current_puzzle]:
                    puzzle_shape_map[current_puzzle][player] = [0] * 6
            elif event.type == "ws-create_shape":
                shape_type = data['shapeType']
                puzzle_shape_map[current_puzzle][player][shape_type - 1] += 1

    return JsonResponse(puzzle_shape_map)

def get_modes_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    puzzle_mode_map = dict()

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-mode_change']]), 
            session__pk__in=sessions
        ).order_by('time')
        
        current_puzzle = None
        for event in events:
            data = json.loads(event.data)
            if event.type == "ws-puzzle_started":
                current_puzzle = data['task_id']
                if not current_puzzle in puzzle_mode_map:
                    puzzle_mode_map[current_puzzle] = dict()
                if not player in puzzle_mode_map[current_puzzle]:
                    puzzle_mode_map[current_puzzle][player] = [False] * 3
            elif event.type == "ws-mode_change":
                mode = data['xfmMode']
                puzzle_mode_map[current_puzzle][player][mode - 1] = True

    return JsonResponse(puzzle_mode_map)