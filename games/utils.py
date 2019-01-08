import json

from django.http import HttpResponse

from datacollection.models import URL
from games.models import LevelSet, Level


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
