import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from datacollection.models import URL, CustomSession, Player
from shadowspect.models import Level, Replay


def get_config_json(request):
    print("sessionpk config: " + str(request.session.__dict__))
    session = CustomSession.objects.get(session_key=request.session.session_key)
    print("sessionpk customsession: " + str(session.__dict__))
    urlpk = request.session["urlpk"]
    url = URL.objects.get(pk=urlpk)
    data = json.loads(url.data)
    print(data)
    print(request.session)
    # Check to see if a replay should be generated
    if "replay_metadata" in request.session:
        data["replayFiles"] = ["generated_replay.json"]
        data["canEdit"] = True
        data["useGuests"] = True
        print(data)
    if "groupID" not in data and url is not None:
        print("no group id, injecting it from URL")
        data["groupID"] = urlpk
    return JsonResponse(data)


def get_level_json(request, slug):
    level = Level.objects.get(filename=slug)
    data = json.loads(level.data)
    return JsonResponse(data)


def get_replay_json(request):
    url_name, player, level, attempt = request.session["replay_metadata"]
    url = URL.objects.get(name=url_name)
    player = Player.objects.filter(url=url).get(id=player)
    # Instantiate an empty queryset that can be used to merge all player querysets
    # player_events = Event.objects.none()
    # for session in player.customsession_set.all():
    #     session_events = Event.objects.filter(session=session)
    #     player_events = player_events | session_events
    #
    # generic_replay = {"events": [], }
    # start_found = False
    # start_event = 0
    # end_event = 0
    #
    # for event in player_events.values():
    #     if 'ws-start_level' in event['type'] and level_name in event['data']:
    #         start_event = event['id']
    #         start_found = True
    #     if start_found and 'ws-exit_to_menu' in event['type'] and event['id'] > start_event:
    #         end_event = event['id']
    #         break
    #
    # for event in player_events.values():
    #     if start_event <= event['id'] <= end_event:
    #         generic_replay["events"].append(event)
    replays = Replay.objects.filter(
        player=player,
        url=url,
        level=level
    )
    replay_obj = replays.all()[attempt] # force eval of queryset
    replay_json = json.loads(replay_obj.replay)
    return JsonResponse(replay_json)


def generate_session(request, url):
    if not request.session.session_key:
        request.session.save()
        print("created session key")
    # print("session key: " + request.session.session_key)
    session = CustomSession.objects.get(session_key=request.session.session_key)

    if session.useragent is None:
        session.useragent = str(request.META.get("HTTP_USER_AGENT"))
    if session.ip is None:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            session.ip = x_forwarded_for.split(",")[0]
        else:
            session.ip = request.META.get("REMOTE_ADDR")
    session.save(update_fields=["useragent", "ip"])
    session.accessed = False
    session.modified = False
    request.session.accessed = False
    request.session.modified = False
    url_obj = get_object_or_404(URL, pk=url)
    request.session["urlpk"] = url
    session.url = url_obj
    session.save(update_fields=["url"])
    return session
