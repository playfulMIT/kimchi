import json
import datetime
from operator import or_
from functools import reduce
from collections import defaultdict

from django.db.models import Q, Min
from django.shortcuts import render
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse

from datacollection.models import Event, CustomSession, Player, URL
from shadowspect.models import Level, Replay
from dataprocessing.models import Task

import numpy as np

def dashboard(request, slug):
    return render(request, "dashboard/dashboard.html", {"url": slug})

def thesis_dashboard(request, slug):
    return render(request, "dashboard/thesis_dashboard.html", {"url": slug})

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

def get_puzzle_name(puzzle_filename):
    level = Level.objects.get(filename=puzzle_filename)
    return json.loads(level.data)["puzzleName"]

def get_puzzle_pk(puzzle_filename):
    level = Level.objects.get(filename=puzzle_filename)
    return level.pk

def get_puzzles_dict(url):
    puzzles = dict()
    url = URL.objects.get(name=url)
    config = url.data
    config_dict = json.loads(config)
    
    puzzles["canUseSandbox"] = config_dict["canUseSandbox"]
    puzzles["puzzles"] = dict()

    for puzzleSet in config_dict["puzzleSets"]:
        if puzzleSet["canPlay"]:
            puzzles["puzzles"][puzzleSet["name"].lower()] = [get_puzzle_name(p) for p in puzzleSet["puzzles"]]
    
    return puzzles

def get_puzzle_keys(request, slug):
    url = URL.objects.get(name=slug)
    config_dict = json.loads(url.data)
    result = dict()

    for puzzleSet in config_dict["puzzleSets"]:
        if puzzleSet["canPlay"]:
            result.update({get_puzzle_name(p): get_puzzle_pk(p) for p in puzzleSet["puzzles"]})

    return JsonResponse(result)

def get_replay_urls(request, slug, player, level):
    replays = Replay.objects.filter(
        player=player,
        level=level
    )
    return JsonResponse({"urls": list(map(lambda replay: replay.url.name, replays))})

def get_puzzles(request, slug):
    return JsonResponse(get_puzzles_dict(slug))

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

def get_attempted_puzzles_map(url, safe_for_serialization=False):
    players = create_player_list(url)

    attempted = defaultdict(list) if safe_for_serialization else defaultdict(set)
    persistence_data = get_persistence_by_puzzle_data_from_server(url, False)

    for player in players:
        if player in persistence_data:
            for puzzle in persistence_data[player].keys():
                if safe_for_serialization:
                    attempted[player].append(puzzle)
                else:
                    attempted[player].add(puzzle)
    return attempted

def get_completed_puzzles_map(url, safe_for_serialization=False):
    players = create_player_list(url)

    completed = defaultdict(list) if safe_for_serialization else defaultdict(set)
    persistence_data = get_persistence_by_puzzle_data_from_server(url, False)

    for player in players:
        if player in persistence_data:
            for puzzle in persistence_data[player].keys():
                if persistence_data[player][puzzle]['completed'] == 1:
                    if safe_for_serialization:
                        completed[player].append(puzzle)
                    else:
                        completed[player].add(puzzle)
    return completed

def get_attempted_puzzles(request, slug):
    return JsonResponse(get_attempted_puzzles_map(slug, True))

def get_completed_puzzles(request, slug):
    return JsonResponse(get_completed_puzzles_map(slug, True))

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
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computeFunnelByPuzzle(['" + slug + "']")
        result = json.loads(task_result)

        new_result = defaultdict(lambda: defaultdict(list))
        player_map = {v: k for k, v in create_player_map(slug).items()}

        for i in result['group'].keys():
            user = player_map.get(result['user'][i])

            if user == None:
                continue

            puzzle = result['task_id'][i]
            funnel_dict = result['funnel'][i]
            
            new_result[user][puzzle] = funnel_dict

        return JsonResponse(new_result)
    except ObjectDoesNotExist:
        return JsonResponse({})

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

def get_sequence_between_puzzles(request, slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="sequenceBetweenPuzzles(['" + slug + "']")
        result = json.loads(task_result)

        new_result = {}
        max_index = len(result['user'])
        player_map = {v: k for k, v in create_player_map(slug).items()}

        for i_num in range(max_index):
            i = str(i_num)
            user = player_map.get(result['user'][i])

            if user == None:
                continue

            if user not in new_result:
                new_result[user] = {}

            puzzle, status = list(result['task_id'][i].items())[0]
            new_result[user][result['sequence'][i]] = { 'session': result['session'][i], 'puzzle': puzzle, 'status': status}
        
        return JsonResponse(new_result)
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_levels_of_activity(request, slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computeLevelsOfActivity(['" + slug + "']")
        result = json.loads(task_result)

        return JsonResponse(result)
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_machine_learning_outliers(request, slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computeLevelsOfActivityOutliers(['" + slug + "']")
        result = json.loads(task_result)

        return JsonResponse(result)
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_persistence_by_attempt_data_from_server(slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computePersistence(['" + slug + "']")
        result = json.loads(task_result)

        new_result = {}
        columns = ['task_id','puzzle_difficulty' ,'completed','timestamp', 'active_time','percentileActiveTime','n_events','percentileEvents', 'n_check_solution','percentileAtt','percentileComposite' ,'persistence','n_breaks','n_snapshot','n_rotate_view','n_manipulation_events','time_failed_submission_exit','avg_time_between_submissions','cum_weighted_difficulty_perc_composite','percentileCompositeAcrossAttempts','persistenceAcrossAttempts','cum_global_puzzle_attempts','cum_this_puzzle_attempt','cum_avg_perc_composite', 'cum_avg_persistence']
        player_map = {v: k for k, v in create_player_map(slug).items()}

        for i in result['group'].keys():
            user = player_map.get(result['user'][i])

            if user == None:
                continue

            if user not in new_result:
                new_result[user] = []
            
            persistence_dict = {}
            for column in columns:
                persistence_dict[column] = json.loads(result[column][i]) if column == 'cum_avg_persistence' else result[column][i]
            
            cum_avg_persistence_dict = persistence_dict['cum_avg_persistence']
            cum_avg_persistence_dict_minimizing_no_behavior = {k:(v*.01 if k == 'NO_BEHAVIOR' else v) for k,v in cum_avg_persistence_dict.items()}
            
            persistence_dict['cum_persistence_label'] = max(cum_avg_persistence_dict, key=cum_avg_persistence_dict.get)
            persistence_dict['cum_persistence_label_minimizing_no_behavior'] = max(cum_avg_persistence_dict_minimizing_no_behavior, key=cum_avg_persistence_dict_minimizing_no_behavior.get)
            new_result[user].append(persistence_dict)

        return new_result
    except ObjectDoesNotExist:
        return {}

def get_persistence_by_puzzle_data_from_server(slug, should_perform_aggregation = True):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computePersistenceByPuzzle(['" + slug + "']")
        result = json.loads(task_result)

        new_result = defaultdict(lambda: defaultdict(dict))
        columns = ['puzzle_difficulty', 'puzzle_category', 'n_attempts','completed','timestamp', 'active_time','percentileActiveTime','n_events','percentileEvents', 'n_check_solution','percentileAtt','percentileComposite' ,'persistence','n_breaks','n_snapshot','n_rotate_view','n_manipulation_events','time_failed_submission_exit','avg_time_between_submissions']
        player_map = {v: k for k, v in create_player_map(slug).items()}

        user_scores = defaultdict(list)
        user_labels = defaultdict(list)
        user_active_time = defaultdict(list)
        for i in result['group'].keys():
            user = player_map.get(result['user'][i])

            if user == None:
                continue

            puzzle = result['task_id'][i]
            for column in columns:
                new_result[user][puzzle][column] = result[column][i]
            user_scores[user].append(result["percentileComposite"][i])
            user_labels[user].append(result["persistence"][i])
            user_active_time[user].append(result["percentileActiveTime"][i])

        default_dict = {"NON_PERSISTANT": 0, "NO_BEHAVIOR": 0, "PRODUCTIVE_PERSISTANCE": 0, "UNPRODUCTIVE_PERSISTANCE": 0, "RAPID_SOLVER": 0}
        if should_perform_aggregation:
            for user in user_scores.keys():
                unique_elements, counts_elements = np.unique(user_labels[user], return_counts=True)
                user_dict = dict(zip(unique_elements, np.divide(counts_elements * 100, len(user_labels[user]))))
                new_result[user]['cumulative'] = {
                    'score': np.mean(user_scores[user]),
                    'labels': {**default_dict, **user_dict},
                    'percentileActiveTime': np.mean(user_active_time[user])
                }
        return new_result
    except ObjectDoesNotExist:
        return {}

def get_persistence_by_attempt_data(request, slug):
    return JsonResponse(get_persistence_by_attempt_data_from_server(slug))

def get_persistence_by_puzzle_data(request, slug):
    return JsonResponse(get_persistence_by_puzzle_data_from_server(slug))

def get_insights(request, slug):
    persistence_data = get_persistence_by_attempt_data_from_server(slug)
    completed_puzzles = get_completed_puzzles_map(slug)

    puzzles = defaultdict(lambda: {'total_attempts': 0, 'successful_attempts': 0})
    students = defaultdict(lambda: defaultdict(list))

    warning_puzzles = []
    stuck_students = defaultdict(list)
    
    for student in persistence_data.keys():
        for attempt in persistence_data[student]:
            puzzle = attempt['task_id']
            if puzzle not in completed_puzzles[student]:
                students[student][puzzle].append(attempt['timestamp'])
            puzzles[puzzle]['total_attempts'] += 1
            if attempt['completed'] == 1:
                puzzles[puzzle]['successful_attempts'] += 1

    for puzzle in puzzles.keys():
        ratio_successful_attempt = float(puzzles[puzzle]['successful_attempts'])/puzzles[puzzle]['total_attempts']
        if ratio_successful_attempt < 0.5:
            warning_puzzles.append(puzzle)

    for student in students.keys():
        for puzzle in students[student].keys():
            num_attempts = len(students[student][puzzle])
            delta = students[student][puzzle][-1] - students[student][puzzle][0]
            if delta >= .5 * 1000 * 60 * 60 or num_attempts > 5:
                stuck_students[student].append(puzzle)
    
    return JsonResponse({"warning_puzzles": warning_puzzles, "stuck_students": stuck_students})

def get_puzzle_difficulty_mapping(request, slug):
    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="getPuzzleDifficulty(['" + slug + "']")
        result = json.loads(task_result)

        return JsonResponse(result)
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_misconceptions_data(request, slug):
    columns = ['time', 'n_attempt', 'type', 'complete', 'pictures_matched', 'p_pictures_matched', 'shapes_used', 'labels']

    try:
        task_result = Task.objects.values_list('result', flat=True).get(signature__contains="computeMisconceptions(['" + slug + "']")
        result = json.loads(task_result)

        new_result = defaultdict(lambda: defaultdict(list))
        player_map = {v: k for k, v in create_player_map(slug).items()}

        for i in result['group_id'].keys():
            if len(result['labels'][i]) == 0:
                continue 

            user = player_map.get(result['user'][i])

            if user == None:
                continue

            puzzle = result['task_id'][i]
            attempt_dict = {}
            
            for column in columns:
                attempt_dict[column] = result[column][i]
            new_result[user][puzzle].append(attempt_dict)

        return JsonResponse(new_result)
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_last_processed_time(request, slug):
    try:
        min_time = Task.objects.filter(signature__contains="(['" + slug + "'])").aggregate(Min('time_ended'))['time_ended__min']
        return JsonResponse({'date': min_time})
    except ObjectDoesNotExist:
        return JsonResponse({})

def get_report_summary(request, slug, start = None, end = None):
    player_to_session_map = create_player_to_session_map(slug)
    player_to_report_map = defaultdict(lambda: {'puzzles': defaultdict(lambda: {'total_time': 0, 'active_time': 0, 'opened': 0, 'submitted': 0, 'completed': 0}), 'total_time': 0, 'active_time': 0, 'last_active': None})
    
    if start and end:
        start = datetime.datetime.fromtimestamp(int(start), datetime.timezone.utc)
        end = datetime.datetime.fromtimestamp(int(end), datetime.timezone.utc)

    threshold_activity = 60 # np.percentile(allDifferences, 98) is 10 seconds
    limit = 3600

    for player in player_to_session_map:
        sessions = player_to_session_map[player]
        events = []
        if start and end:
            events = Event.objects.filter(Q(session__pk__in=sessions) & Q(time__gte=start) & Q(time__lte=end)).order_by('time')
        else:
            events = Event.objects.filter(session__pk__in=sessions).order_by('time')

        # TODO: class average?
        previous_event = None
        current_puzzle = None

        for event in events:
            data = json.loads(event.data)
            event_time = event.time
            player_to_report_map[player]['last_active'] = event_time

            
            if(event.type in ['ws-start_level', 'ws-puzzle_started']):
                current_puzzle = data['task_id']
                
                if current_puzzle:
                    player_to_report_map[player]['puzzles'][current_puzzle]['opened'] = 1

                    delta_seconds = (event_time - previous_event.time).total_seconds()
                    if delta_seconds < limit:
                        player_to_report_map[player]['total_time'] += delta_seconds
                        player_to_report_map[player]['puzzles'][current_puzzle]['total_time'] += delta_seconds

                previous_event = event     
                       
            # the event is not final event
            elif (event.type not in ['ws-create_user', 'ws-login_user']):       
                if current_puzzle:  
                    if event.type == 'ws-check_solution':
                        player_to_report_map[player]['puzzles'][current_puzzle]['submitted'] += 1
                    elif event.type == 'ws-puzzle_complete':
                        player_to_report_map[player]['puzzles'][current_puzzle]['completed'] += 1

                    delta_seconds = (event_time - previous_event.time).total_seconds()
                    if delta_seconds < limit:
                        player_to_report_map[player]['total_time'] += delta_seconds
                        player_to_report_map[player]['puzzles'][current_puzzle]['total_time'] += delta_seconds
                    if delta_seconds < threshold_activity:
                        player_to_report_map[player]['active_time'] += delta_seconds
                        player_to_report_map[player]['puzzles'][current_puzzle]['active_time'] += delta_seconds

                previous_event = event 

    return JsonResponse(player_to_report_map)