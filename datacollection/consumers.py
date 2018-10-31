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
        if 'start_game' in type:
            urlpk = self.scope["session"]['urlpk']
            url = URL.objects.get(pk=urlpk)
            players = Player.objects.filter(url=url)
            playerlist = []
            for p in players:
                playerlist.append(p.name)

            # playerjson = serializers.serialize("python", players)
            # print(playerjson)
            data = ','.join(playerlist)
            print(data)
            await self.send(text_data=data)
        if 'create_user' in type:
            urlpk = self.scope["session"]['urlpk']
            url = URL.objects.get(pk=urlpk)
            name = json.loads(data_json["data"])["name"]
            player = Player.objects.create(url=url, name=name)
            playersession = PlayerSession.objects.create(player=player,session=self.session)

        close_old_connections()

    # async def disconnect(self, code=None):
    #     if (code):
    #         print(code)
    #     print("disconnect")
#
#