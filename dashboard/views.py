import json
import datetime
from operator import or_
from functools import reduce

from django.db.models import Q
from django.shortcuts import render
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse

from datacollection.models import Event, CustomSession, Player, URL
from shadowspect.models import Level
from dataprocessing.models import Task

import numpy as np

# TODO: convert code to use the task output

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

def create_player_map(url):
    pk_to_player_map = dict()
    player_list = create_player_list(url, True)
    for (player, pk) in player_list:
        if not player or player == "null":
            continue
        pk_to_player_map[pk] = player
    return pk_to_player_map

def get_player_list(request, slug):
    return JsonResponse(create_player_map(slug))

def get_player_to_session_map(request, slug):
    return JsonResponse(create_player_to_session_map(slug))

def get_puzzles(request, slug):
    def get_puzzle_properties(puzzle_filename):
        level = Level.objects.get(filename=puzzle_filename)
        return json.loads(level.data)["puzzleName"]

    puzzles = dict()
    url = URL.objects.get(name=slug)
    config = url.data
    config_dict = json.loads(config)
    
    puzzles["canUseSandbox"] = config_dict["canUseSandbox"]
    puzzles["puzzles"] = dict()

    for puzzleSet in config_dict["puzzleSets"]:
        if puzzleSet["canPlay"]:
            puzzles["puzzles"][puzzleSet["name"].lower()] = [get_puzzle_properties(p) for p in puzzleSet["puzzles"]]
    
    return JsonResponse(puzzles)

def get_snapshot_metrics(request, slug):
    player_to_snapshot_map = dict()
    player_to_session_map = create_player_to_session_map(slug)
    requested_puzzle = request.GET.get('puzzle', None)

    for player in player_to_session_map:
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-snapshot']]), 
            session__pk__in=sessions
        ).order_by('time')

        current_puzzle = None
        for event in events:
            data = json.loads(event.data)
            if event.type == "ws-puzzle_started":
                current_puzzle = data['task_id']
                if requested_puzzle and requested_puzzle != current_puzzle:
                    current_puzzle = None
                    continue

                if not current_puzzle in player_to_snapshot_map:
                    player_to_snapshot_map[current_puzzle] = dict()

                if not player in player_to_snapshot_map[current_puzzle]:
                    player_to_snapshot_map[current_puzzle][player] = 0
            elif current_puzzle:
                player_to_snapshot_map[current_puzzle][player] += 1

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

def get_completed_puzzles_map(url):
    players = create_player_list(url)

    completed = dict()
    for player in players:
        try:
            completed[player] = set(Player.objects.get(pk=player, url__name=url).completed.values_list("filename", flat=True))
        except ObjectDoesNotExist:
            completed[player] = []
    return completed

def get_completed_puzzles(request, slug):
    return JsonResponse(get_completed_puzzles_map(slug))

def get_time_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    puzzle_player_time_map = dict()
    requested_puzzle = request.GET.get('puzzle', None)

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, 
                [Q(type=event_type) for event_type in ['ws-puzzle_started', 'ws-puzzle_complete']]), 
            session__pk__in=sessions
        ).order_by('time')
        
        puzzle_time_map = dict()
        key = None
        for event in events:
            key = json.loads(event.data)['task_id']
            if requested_puzzle and requested_puzzle != key:
                continue

            if not key in puzzle_time_map:
                puzzle_time_map[key] = []

            if event.type == "ws-puzzle_started":
                puzzle_time_map[key].append({
                    'start': event.time,
                    'end': None
                })
            else:
                puzzle_time_map[key][-1]['end'] = event.time

        for puzzle in puzzle_time_map:
            if not puzzle in puzzle_player_time_map:
                puzzle_player_time_map[puzzle] = dict()
            if not player in puzzle_player_time_map[puzzle]:
                puzzle_player_time_map[puzzle][player] = []

            for attempt in puzzle_time_map[puzzle]:
                start = attempt['start'] 
                end = attempt['end']

                if start and end:
                    puzzle_player_time_map[puzzle][player].append((end - start).total_seconds())
                else:
                    puzzle_player_time_map[puzzle][player].append(None)

    return JsonResponse(puzzle_player_time_map)

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
    requested_puzzle = request.GET.get('puzzle', None)

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
                if requested_puzzle and requested_puzzle != current_puzzle:
                    current_puzzle = None
                    continue
                if not current_puzzle in puzzle_shape_map:
                    puzzle_shape_map[current_puzzle] = dict()
                if not player in puzzle_shape_map[current_puzzle]:
                    puzzle_shape_map[current_puzzle][player] = [0] * 6
            elif current_puzzle:
                shape_type = data['shapeType']
                puzzle_shape_map[current_puzzle][player][shape_type - 1] += 1

    return JsonResponse(puzzle_shape_map)

def get_modes_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    puzzle_mode_map = dict()
    requested_puzzle = request.GET.get('puzzle', None)

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
                if requested_puzzle and requested_puzzle != current_puzzle:
                    current_puzzle = None
                    continue

                if not current_puzzle in puzzle_mode_map:
                    puzzle_mode_map[current_puzzle] = dict()
                if not player in puzzle_mode_map[current_puzzle]:
                    puzzle_mode_map[current_puzzle][player] = [False] * 3
            elif current_puzzle:
                mode = data['xfmMode']
                puzzle_mode_map[current_puzzle][player][mode - 1] = True

    return JsonResponse(puzzle_mode_map)


def get_task_metrics(request, slug):
    url = URL.objects.get(name=slug)
    tasks = list(Task.objects.filter(input_urls=url).values_list("result", flat=True))
    return JsonResponse(tasks, safe=False)

def get_levels_of_activity(request, slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computeLevelsOfActivity(['leja']")
        result = json.loads(task_result)

        new_result = {}
        max_index = len(result['group'])
        player_map = {v: k for k, v in create_player_map("leja").items()}

        for i_num in range(max_index):
            i = str(i_num)
            user = player_map.get(result['user'][i])
            if user == None:
                continue

            if result['task_id'][i] not in new_result:
                new_result[result['task_id'][i]] = {}

            if user not in new_result[result['task_id'][i]]:
                new_result[result['task_id'][i]][user] = {}

            new_result[result['task_id'][i]][user][result['metric'][i]] = float(result['value'][i])

        completed_map = get_completed_puzzles_map(slug)
        for task in new_result:
            statistics = {}
            completed_statistics = {}
            values = {}
            completed_values = {}
            class_avg = {
                'active_time': 0,
                'create_shape': 0,
                'delete_shape': 0,
                'different_events': 0,
                'event': 0,
                'move_shape': 0,
                'paint': 0,
                'redo_action': 0,
                'rotate_view': 0,
                'scale_shape': 0,
                'snapshot': 0,
                'undo_action': 0
            }

            for key in class_avg:
                statistics[key] = {
                    'min': float("inf"),
                    'max': float("-inf"),
                    'median': 0,
                    'mean': 0,
                    'stdev': 0
                }
                completed_statistics[key] = {
                    'min': float("inf"),
                    'max': float("-inf"),
                    'median': 0,
                    'mean': 0,
                    'stdev': 0
                }
                values[key] = []
            
            users = new_result[task]
            items = users.items()
            
            for student, value in items:
                if value['create_shape'] == 0:
                    continue
                if task in completed_map[student]:
                    for key in value.keys():
                        class_avg[key] += value[key]
                        values[key].append(value[key])
                        completed_values[key].append(value[key])

                        if statistics[key]['min'] > value[key]:
                            statistics[key]['min'] = value[key]
                        if statistics[key]['max'] < value[key]:
                            statistics[key]['max'] = value[key]

                        if completed_statistics[key]['min'] > value[key]:
                            completed_statistics[key]['min'] = value[key]
                        if completed_statistics[key]['max'] < value[key]:
                            completed_statistics[key]['max'] = value[key]
                else:
                    for key in value.keys():
                        class_avg[key] += value[key]
                        values[key].append(value[key])

                        if statistics[key]['min'] > value[key]:
                            statistics[key]['min'] = value[key]
                        if statistics[key]['max'] < value[key]:
                            statistics[key]['max'] = value[key]
            
            for key in class_avg:
                class_avg[key] /= len(users)
                
                statistics[key]['median'] = np.median(values[key])
                statistics[key]['mean'] = np.mean(values[key])
                statistics[key]['stdev'] = np.std(values[key])

                completed_statistics[key]['median'] = np.median(completed_values[key])
                completed_statistics[key]['mean'] = np.mean(completed_values[key])
                completed_statistics[key]['stdev'] = np.std(completed_values[key])
            
            new_result[task]['avg'] = class_avg
            new_result[task]['stats'] = statistics
            new_result[task]['completed_stats'] = completed_statistics
        return JsonResponse(new_result)
    except ObjectDoesNotExist:
        return JsonResponse({})