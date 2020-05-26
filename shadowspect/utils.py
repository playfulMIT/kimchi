import json

from django.http import JsonResponse

from datacollection.models import URL, CustomSession, Player, Event
from shadowspect.models import Level
from django.shortcuts import get_object_or_404


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
    url_name, player_name, level_name = request.session["replay_metadata"]
    url = URL.objects.get(name=url_name)
    player = Player.objects.filter(url=url).get(name=player_name)
    # Instantiate an empty queryset that can be used to merge all player querysets
    player_events = Event.objects.none()
    for session in player.customsession_set.all():
        session_events = Event.objects.filter(session=session)
        player_events = player_events | session_events

    generic_replay = { "events": [], }
    for event in player_events.values():
        generic_replay["events"].append(event)
    return JsonResponse(generic_replay)

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
