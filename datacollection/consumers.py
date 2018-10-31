from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import Event, Player, URL, PlayerSession
from django.contrib.sessions.models import Session
from django.db import close_old_connections
from django.core import serializers


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
            # print(text_data)
            print("got text data")
            data_json = json.loads(text_data)

            # print(text_data_json)
        if (bytes_data):
            print("got byte data")
            # print(bytes_data.decode("utf-8"))
            data_json = json.loads(bytes_data.decode("utf-8"))
        # print("data json")
        # print(data_json)
        type = "ws-" + data_json["type"]
        Event.objects.create(session=self.session, type=type, data=data_json["data"])
        urlpk = self.scope["session"]['urlpk']
        url = URL.objects.get(pk=urlpk)
        if 'start_game' in type:
            players = Player.objects.filter(url=url)
            playerlist = []
            for p in players:
                playerlist.append(p.name)

            playerstring = ','.join(playerlist)
            await self.send(text_data=playerstring)
        elif any(x in type for x in ['login_user', 'create_user']):
            namedata = data_json["data"]
            namejson = json.loads(namedata)
            name=namejson["user"]
            player, created = Player.objects.get_or_create(url=url, name=name)
            playersession = PlayerSession.objects.create(player=player,session=self.session)
            if created:
                response = json.dumps({
                    "status":  201,
                    "message": "created"
                })
            else:
                response = json.dumps({
                    "status": 200,
                    "message": "found"
                })
            print(response)
            await self.send(text_data=response)



        close_old_connections()

    # async def disconnect(self, code=None):
    #     if (code):
    #         print(code)
    #     print("disconnect")
#
#