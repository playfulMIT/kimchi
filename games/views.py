from django.shortcuts import render
from django.http import HttpResponse
from datacollection.models import URL
from games.models import LevelSet,Level
from django.shortcuts import get_object_or_404
import json
# Create your views here.

def mitfp(request):
    # print(request.session.session_key)
    # request.session.save()
    # print(request.session.session_key)
    return render(request, 'games/mitftp.html', {'title':"shapes 0.3.0 playtest 3"})

    # return HttpResponse(request.session.session_key)

def shapes(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/shapes.html', {'title':"shapes 0.2.0 playtest 2",'sessionID':request.session.session_key})

def playtest(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/playtest.html', {'title':"shapes 0.3.0 playtest 3",'sessionID':request.session.session_key})


def gamews(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/gamews.html', {'title':"shapes 0.4.0 playtest 3",'sessionID':request.session.session_key})

def stg0910(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/stg0910.html', {'title': "shadow tangrams 0.1.0", 'sessionID': request.session.session_key})

def stg0924(request):
    if not request.session.session_key:
        request.session.save()
    return render(request, 'games/stg24.html', {'title': "shadow tangrams 0.2.0", 'sessionID': request.session.session_key})

def wildcard_url(request, slug):
    if not request.session.session_key:
        request.session.save()
    url = get_object_or_404(URL, pk=slug)
    request.session['urlpk'] = url.pk
    return render(request, 'games/test.html', {'title': "shadow tangrams 0.2.0", 'sessionID': request.session.session_key})

def get_config_json(request):
    print("success")
    url = URL.objects.get(pk=request.session['urlpk'])
    data = {}
    data['groupID'] = url.name
    data['useGuests'] = False
    data['canEdit'] = False
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
    data['shapeData'] = json.loads(level.shapeData.replace("\r","").replace("\n",""))
    data['solutionCameraAngles'] = level.solutionCameraAngles.split(",")
    return HttpResponse(json.dumps(data))

