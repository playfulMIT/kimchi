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
            print("got text data")
            data_json = json.loads(text_data)
        if (bytes_data):
            print("got byte data")
            # print(bytes_data.decode("utf-8"))
            data_json = json.loads(bytes_data.decode("utf-8"))
        type = "ws-" + data_json["type"]
        Event.objects.create(session=self.session, type=type, data=data_json["data"])

        namedata = data_json["data"]
        namejson = json.loads(namedata)

        if 'urlpk' in self.scope["session"]:
            urlpk = self.scope["session"]['urlpk']
            url = URL.objects.get(pk=urlpk)
        else:
            if "group" in namejson:
                urlpk = namejson["group"]
            else:
                urlpk = "no-url-or-group-specified"
            url, nourl = URL.objects.get_or_create(pk=urlpk)

        if 'start_game' in type:
            players = Player.objects.filter(url=url)
            playerlist = []
            for p in players:
                playerlist.append(p.name)

            playerstring = ','.join(playerlist)
            await self.send(text_data=playerstring)
        elif any(x in type for x in ['login_user', 'create_user']):
            name = namejson["user"]
            if 'group' in namedata:
                url=URL.objects.get_or_create(url=namejson["group"])

            player, created = Player.objects.get_or_create(url=url, name=name)
            playersession = PlayerSession.objects.create(player=player,session=self.session)
            if created:
                print('created player')
                response = json.dumps({
                    "status":  201,
                    "message": "created"
                })
            else:
                print('found player')
                # get a player's progress here

                ######
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