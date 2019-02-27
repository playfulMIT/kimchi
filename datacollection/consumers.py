import json

from channels.generic.websocket import AsyncWebsocketConsumer
from django.db import close_old_connections

from shadowspect.models import Level, LevelSet
from .models import Event, Player, CustomSession
from .utils import get_group


class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        print('connection opening')
        close_old_connections()
        print('headers:')
        print(type(self.scope["headers"]))
        print(str(self.scope["headers"]))

        print('ws session: ' + str(self.scope["session"].session_key))
        if self.scope["session"].session_key is None:
            self.scope["session"].save()
            # session.ip = str(request.META.get('REMOTE_ADDR'))
            self.scope["session"].accessed = False
            self.scope["session"].modified = False
            print('new session: ' + str(self.scope["session"].session_key))

        self.key = self.scope["session"].session_key
        session_modified = False
        self.customsession = CustomSession.objects.get(session_key=self.key)
        if self.customsession.ip is None:
            self.customsession.ip = self.scope["headers"]['x-forwarded-for']
            session_modified = True
        if self.customsession.useragent is None:
            self.customsession.useragent = self.scope["headers"]['user-agent']
            session_modified = True
        if session_modified:
            self.customsession.save(update_fields=['ip', 'useragent'])
            self.scope["session"].accessed = False
            self.scope["session"].modified = False
        print('custom session state:')
        print(str(self.customsession.__dict__))
        await self.accept()
        await self.send(text_data=self.key)
        close_old_connections()

    async def receive(self, text_data=None, bytes_data=None):
        close_old_connections()
        if (text_data):
            data_json = json.loads(text_data)
        if (bytes_data):
            data_json = json.loads(bytes_data.decode("utf-8"))
        type = "ws-" + data_json["type"]
        Event.objects.create(session=self.customsession, type=type, data=data_json["data"])
        print(str(data_json))
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
            self.customsession = CustomSession.objects.get(session_key=self.key)

            if not created:
                # get a player's progress here
                attempted = []
                completed = []
                print("name: " + name)
                name_valid = (not name == "guest" and not name == "")
                if name_valid:
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
                self.customsession = CustomSession.objects.get(session_key=self.key)
                print(str(self.customsession.__dict__))
                self.customsession.player = player
                self.customsession.save(update_fields=['player'])
                print(str(self.customsession.__dict__))
                response = json.dumps([{
                    "status": 201,
                    "message": "created"
                }])

            await self.send(text_data=response)
        elif any(x in type for x in ['puzzle_started', 'puzzle_complete']):
            levelsetname = json.loads(data_json['data'])['set_id']
            levelset, levelsetcreated = LevelSet.objects.get_or_create(name=levelsetname)
            levelname = json.loads(data_json['data'])['task_id']
            url, namejson = get_group(self, data_json)
            name = namejson["user"]
            name_valid = ( not name == "guest" and not name == "" )
            print('name: ' + name)
            try:
                level = Level.objects.get(filename=levelname)
            except Level.DoesNotExist:
                level = Level.objects.create(filename=levelname, levelset=levelset)
            if 'puzzle_started' in type and name_valid:
                self.customsession.player.attempted.add(level)
            elif 'puzzle_complete' in type and name_valid:
                self.customsession.player.completed.add(level)
            # self.customsession.save()

        close_old_connections()

    async def disconnect(self, code=None):
        # self.session.clear()
        Event.objects.create(session=self.customsession, type="ws-disconnect", data="{}")
        if (code):
            print(code)
        print("disconnect")
