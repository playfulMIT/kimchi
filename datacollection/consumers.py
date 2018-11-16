from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import Event, Player, URL, PlayerSession
from django.contrib.sessions.models import Session
from django.db import close_old_connections
from django.core import serializers
from .utils import get_group
from games.models import Level, LevelSet

class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        close_old_connections()
        self.scope["session"].save()
        key = self.scope["session"].session_key
        self.session = Session.objects.get(session_key=key)
        print('socket open')
        print(key)
        print('sent key')
        await self.accept()
        await self.send(text_data=key)
        close_old_connections()

    async def receive(self, text_data=None, bytes_data=None):
        close_old_connections()
        print("received data")
        if (text_data):
            print("got text data")
            data_json = json.loads(text_data)
        if (bytes_data):
            print("got byte data")
            # print(bytes_data.decode("utf-8"))
            data_json = json.loads(bytes_data.decode("utf-8"))
        type = "ws-" + data_json["type"]
        Event.objects.create(session=self.session, type=type, data=data_json["data"])

        if 'start_game' in type:
            url, namejson = get_group(self, data_json)
            players = Player.objects.filter(url=url).values('name')
            players_json = json.dumps(list(players))
            print("player json: " + players_json)
            r = {"status": 200, "players":[]}
            for p in players:
                r["players"].append(p["name"])
            r = json.dumps(r)
            print("players response: " + r)
            await self.send(text_data=r)
        elif any(x in type for x in ['login_user', 'create_user']):
            url, namejson = get_group(self, data_json)
            name = namejson["user"]
            player, created = Player.objects.get_or_create(url=url, name=name)
            playersession = PlayerSession.objects.create(player=player,session=self.session)
            if not created:
                print('found player')
                # get a player's progress here
                attempted = []
                completed = []
                for l in player.attempted.all():
                    attempted.append(l.name)
                for l in player.completed.all():
                    completed.append(l.name)
                if 'login_user' in type:
                    ######
                    response = json.dumps([{
                        "status": 200,
                        "message": "found",
                        "attempted": attempted,
                        "completed": completed
                    }])
                else:
                    response = json.dumps([{
                        "status": 409,
                        "message": "exists",
                        "attempted": attempted,
                        "completed": completed
                    }])
            else:
                print('created player')
                response = json.dumps([{
                    "status": 201,
                    "message": "created"
                }])

            print(response)
            await self.send(text_data=response)
        elif any(x in type for x in ['puzzle_started', 'puzzle_complete']):
            print('level started/complete event')
            print(data_json)
            levelsetname = data_json['set_id']
            levelset, levelsetcreated = LevelSet.objects.get_or_create(name=levelsetname)
            levelname = data_json['task_id']
            level, levelcreated = Level.objects.filter(levelset=levelset).get_or_create(name=levelname)
            playersession = PlayerSession.objects.get(session=self.session)
            if 'puzzle_started' in type:
                if not playersession.completed.filter(level=level).exists():
                    playersession.player.attempted.add(level)
            elif 'puzzle_complete' in type:
                playersession.player.attempted.remove(level)
                playersession.player.completed.add(level)


        close_old_connections()

    # async def disconnect(self, code=None):
    #     if (code):
    #         print(code)
    #     print("disconnect")