import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.sessions.models import Session
from django.db import close_old_connections

from games.models import Level, LevelSet
from .models import Event, Player, PlayerSession
from .utils import get_group


class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        close_old_connections()
        self.scope["session"].save()
        key = self.scope["session"].session_key
        self.session = Session.objects.get(session_key=key)
        await self.accept()
        await self.send(text_data=key)
        close_old_connections()

    async def receive(self, text_data=None, bytes_data=None):
        close_old_connections()
        if (text_data):
            data_json = json.loads(text_data)
        if (bytes_data):
            data_json = json.loads(bytes_data.decode("utf-8"))
        type = "ws-" + data_json["type"]
        Event.objects.create(session=self.session, type=type, data=data_json["data"])

        if 'start_game' in type:
            url, namejson = get_group(self, data_json)
            players = Player.objects.filter(url=url).values('name')
            players_json = json.dumps(list(players))
            r = {"status": 200, "players": []}
            for p in players:
                r["players"].append(p["name"])
            r = json.dumps(r)
            await self.send(text_data=r)
        elif any(x in type for x in ['login_user', 'create_user']):
            url, namejson = get_group(self, data_json)
            name = namejson["user"]
            player, created = Player.objects.get_or_create(url=url, name=name)
            self.playersession, playersessioncreated = PlayerSession.objects.get_or_create(player=player,
                                                                                           session=self.session)
            if not created:
                # get a player's progress here
                attempted = []
                completed = []
                if not name == "guest":
                    for l in player.attempted.all():
                        attempted.append(l.filename)
                    for l in player.completed.all():
                        completed.append(l.filename)
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

            await self.send(text_data=response)
        elif any(x in type for x in ['puzzle_started', 'puzzle_complete']):
            levelsetname = json.loads(data_json['data'])['set_id']
            levelset, levelsetcreated = LevelSet.objects.get_or_create(name=levelsetname)
            levelname = json.loads(data_json['data'])['task_id']
            try:
                level = Level.objects.get(filename=levelname)
            except Level.DoesNotExist:
                level = Level.objects.create(filename=levelname, levelset=levelset)
            if 'puzzle_started' in type:
                self.playersession.player.attempted.add(level)
            elif 'puzzle_complete' in type:
                self.playersession.player.completed.add(level)

        close_old_connections()

    async def disconnect(self, code=None):
        # self.session.clear()
        if (code):
            print(code)
        print("disconnect")
