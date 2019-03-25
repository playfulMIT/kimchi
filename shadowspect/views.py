from zipfile import ZipFile
import json
import uuid

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render

from datacollection.models import URL
from .utils import generate_session


def wildcard_url(request, slug):
    print('getting wildcard')
    session = generate_session(request)
    url = get_object_or_404(URL, pk=slug)
    session.url = url
    session.save(update_fields=['url'])
    print('session id: ' + str(request.session.session_key))
    print("customsession dict: " + str(session.__dict__))
    # response = str(request.session.session_key) + "\n" + str(session.__dict__)
    # return HttpResponse(response)
    return render(request, 'shadowspect/play.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def mturk(request):
    if not request.session.session_key:
        request.session.save()
    session = generate_session(request)
    session.url = URL.objects.get(pk="mturk")
    session.save(update_fields=['url'])
    return render(request, 'shadowspect/mturk.html',
                  {'title': "Shadow Tangrams", 'sessionID': request.session.session_key})


def debug(request):
    session = generate_session(request)
    response = str(request.session.session_key) + "\n" + str(session.__dict__)
    return HttpResponse(response)


def levelloader(request):
    if request.method == 'POST' and request.FILES['levelbundle']:
        print('levels uploaded')
        print("group" + request.POST['group'])
        created_group = False
        # group, created_group = URL.objects.get_or_create(name=request.POST['group'])


        levelbundle = request.FILES['levelbundle']
        zipfile = ZipFile(levelbundle)

        config = json.loads(zipfile.read("config.json"))
        print(type(config['puzzleSets']))
        print(config['puzzleSets'])

        for set in config['puzzleSets']:
            puzzles = set['puzzles']
            for puzzle in puzzles:
                puzzle_json = zipfile.read(puzzle)
                print(puzzle)
                print(puzzle_json)

        # for name in zipfile.namelist():
            # print(zipfile.read(name))
            # if name=="config.json":
            #     print('config found')
            #     config = json.loads(zipfile.read(name))
            #     print(config['groupID'])
            #     print(config['puzzleSets'])
            #     filename = uuid.uuid4()
            #     print(filename)
                # create url
                # create config.json
                # create levels
                # create replay?


        return render(request, 'shadowspect/levelloader.html', {
            'file_uploaded': True,
            'created_group': created_group
        })
    return render(request, 'shadowspect/levelloader.html')
