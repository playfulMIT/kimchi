from zipfile import ZipFile
import json
import uuid

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.shortcuts import render

from shadowspect.models import Level, Replay
from datacollection.models import URL, Player, CustomSession
from .utils import generate_session


def wildcard_url(request, slug):
    print("getting wildcard")
    session = generate_session(request, slug)
    print("session id: " + str(request.session.session_key))
    print("customsession dict: " + str(session.__dict__))
    print("sessionpk wildcard: " + str(request.session.__dict__))
    # response = str(request.session.session_key) + "\n" + str(session.__dict__)
    # return HttpResponse(response)
    return render(
        request,
        "shadowspect/play.html",
        {"title": "Shadow Tangrams", "sessionID": request.session.session_key},
    )


def wildcard_players(request, slug):
    url_obj = get_object_or_404(URL, pk=slug)
    players = Player.objects.filter(url=url_obj)
    list = {}
    for player in players:
        for session in player.customsession_set.all():
            list[session.session_key] = player.id
    return render(request, "shadowspect/list.html", {"items": list})


def wildcard_levels(request, slug, player):
    url_obj = get_object_or_404(URL, pk=slug)
    selected_player = Player.objects.filter(url=url_obj).get(id=player)
    print(selected_player)
    levels = {}
    for level in selected_player.attempted.all():
        levels['attempted ' + str(level.pk)] = level.filename.replace(" ", "_")
    for level in selected_player.completed.all():
        levels['completed ' + str(level.pk)] = level.filename.replace(" ", "_")
    return render(request, "shadowspect/list.html", {"items": levels})


def wildcard_replay(request, slug, player, level):
    request.session["replay_metadata"] = [slug, player.replace("_", " "), level.replace("_", " ")]
    session = generate_session(request, slug)
    return render(
        request,
        "shadowspect/play.html",
        {"title": "Shadow Tangrams", "sessionID": request.session.session_key},
    )


def mturk(request):
    if not request.session.session_key:
        request.session.save()
    session = generate_session(request, "mturk")
    return render(
        request,
        "shadowspect/mturk.html",
        {"title": "Shadow Tangrams", "sessionID": request.session.session_key},
    )


def debug(request):
    session = generate_session(request, "brandontest")
    response = str(request.session.session_key) + "\n" + str(session.__dict__)
    return HttpResponse(response)


def levelloader(request):
    if request.method == "POST" and request.FILES["levelbundle"]:
        print("levels uploaded")
        groupname = request.POST["group"]
        print("group: " + groupname)

        group, created_group = URL.objects.get_or_create(name=groupname)

        levelbundle = request.FILES["levelbundle"]
        zipfile = ZipFile(levelbundle)
        if created_group:
            config = json.loads(zipfile.read("config.json"))
            print(type(config["puzzleSets"]))
            print(config["puzzleSets"])
            set_index = 0
            while set_index < len(config["puzzleSets"]):
                puzzles = config["puzzleSets"][set_index]["puzzles"]
                print(puzzles)
                puzzle_index = 0
                while puzzle_index < len(puzzles):
                    puzzle = puzzles[puzzle_index]
                    print(puzzle)
                    puzzle_json = zipfile.read(puzzle + ".json")
                    puzzle_data = json.loads(puzzle_json)
                    puzzle_uuid = puzzle + "_" + str(uuid.uuid4())
                    Level.objects.create(
                        filename=puzzle_uuid, data=json.dumps(puzzle_data)
                    )
                    config["puzzleSets"][set_index]["puzzles"][
                        puzzle_index
                    ] = puzzle_uuid
                    puzzle_index += 1
                set_index += 1

            group.data = json.dumps(config)
            group.save()

            print(config["puzzleSets"])

        return render(
            request,
            "shadowspect/levelloader.html",
            {
                "file_uploaded": True,
                "created_group": created_group,
                "group_url": groupname,
            },
        )
    return render(
        request,
        "shadowspect/levelloader.html",
        {"file_uploaded": False, "created_group": False, "group_url": ""},
    )
