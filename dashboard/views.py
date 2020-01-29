import json
import datetime
from operator import or_
from functools import reduce

from django.db.models import Q

from django.shortcuts import render
from django.core.exceptions import ObjectDoesNotExist

from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.response import Response

from datacollection.models import Event, CustomSession, Player
from datacollection.serializers import EventSerializer

# logger = logging.getLogger(__name__)

def dashboard(request, slug):
    return render(request, "shadowspect/dashboard.html", {"url":slug})

# right now, im doing it based on the last url saved to the player but maybe this should be changed 
def create_player_to_session_map(url):
    player_to_session_map = dict()
    sessions = CustomSession.objects.filter(url__name=url)
    
    for session in sessions:
        if session.player:
            if session.player.name in player_to_session_map:
                player_to_session_map[session.player.name].append(session.pk)
            else:
                player_to_session_map[session.player.name] = [session.pk]
    return player_to_session_map

def create_player_list(url):
    return CustomSession.objects.filter(url__name=url).values_list("player__name", flat=True).distinct()
    
def get_player_list(request, slug):
    return JsonResponse({ 'players': list(create_player_list(slug)) })

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
            attempted[player] = list(Player.objects.get(name=player, url__name=slug).attempted.values_list("filename", flat=True))
        except ObjectDoesNotExist:
            attempted[player] = []

    return JsonResponse(attempted)

def get_completed_puzzles(request, slug):
    players = create_player_list(slug)

    completed = dict()
    for player in players:
        try:
            completed[player] = list(Player.objects.get(name=player, url__name=slug).completed.values_list("filename", flat=True))
        except ObjectDoesNotExist:
            completed[player] = []

    return JsonResponse(completed)

def get_time_per_puzzle(request, slug):
    player_to_session_map = create_player_to_session_map(slug)
    player_time_map = dict()

    for player in player_to_session_map.keys():
        sessions = player_to_session_map[player]
        events = Event.objects.filter(
            reduce(or_, [Q(type='ws-puzzle_complete'), Q(type='ws-puzzle_started')]), session__pk__in=sessions
        ).order_by('time')
        
        puzzle_time_map = dict()
        for event in events:
            # TODO: should we count elapsed time for second, third, ... tries of a puzzle?
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

    # url -> player -> session -> event list
    # person__event for all events from that person to do the reverse  