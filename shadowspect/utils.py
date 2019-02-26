import json

from django.http import HttpResponse

from datacollection.models import URL, CustomSession
from shadowspect.models import LevelSet, Level


def get_config_json(request):
    print("success")
    url = URL.objects.get(pk=request.session['urlpk'])
    data = {}
    data['groupID'] = url.name
    data['useGuests'] = url.useGuests
    data['canEdit'] = url.canEdit
    data['puzzleSets'] = []
    puzzlesets = LevelSet.objects.filter(url__pk=request.session['urlpk'])
    for p in puzzlesets:
        pj = {}
        pj['name'] = p.name
        pj['canPlay'] = p.canPlay
        pj['puzzles'] = []
        levels = Level.objects.filter(levelset__pk=p.id)
        for l in levels:
            pj['puzzles'].append(l.filename)
        data['puzzleSets'].append(pj)
    return HttpResponse(json.dumps(data))


def get_level_json(request, slug):
    data = {}
    level = Level.objects.get(filename=slug)
    data['puzzleName'] = level.ingamename
    data['description'] = level.description
    data['gridDim'] = 5
    data['shapeData'] = json.loads(level.shapeData.replace("\r", "").replace("\n", ""))
    data['solutionCameraAngles'] = [int(x) for x in level.solutionCameraAngles.split(',')]
    return HttpResponse(json.dumps(data))


def generate_session(request):
    if not request.session.session_key:
        request.session.save()
        request.session.accessed = False
        request.session.modified = False
        print('created session key')
    print("session key: " + request.session.session_key)
    session, created = CustomSession.objects.get_or_create(session_key=request.session.session_key)
    if created:
        print('created')
    print("session dict: " + str(session.__dict__))
    print("request dict:" + str(request.session.__dict__))
    if session.useragent is None:
        session.useragent = str(request.META.get('HTTP_USER_AGENT'))
    if session.ip is None:
        session.ip = str(request.META.get('REMOTE_ADDR'))
    session.save(update_fields=['useragent', 'ip'])
    session.accessed = False
    session.modified = False
    request.session.accessed = False
    request.session.modified = False
    return session
