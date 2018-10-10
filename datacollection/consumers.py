from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import Event
from django.contrib.sessions.models import Session
from django.db import close_old_connections


class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        close_old_connections()
        self.scope["session"].save()
        self.session = Session.objects.get(session_key=self.scope["session"].session_key)
        close_old_connections()
        await self.accept()

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
        Event.objects.create(session=self.session, type=data_json["type"], data=data_json["data"])
        close_old_connections()

    # async def disconnect(self, code=None):
    #     if (code):
    #         print(code)
    #     print("disconnect")
#
#
# from channels.generic.websocket import AsyncWebsocketConsumer
#
# class DataCollectionConsumer(AsyncWebsocketConsumer):
#     groups = ["broadcast"]
#
#     async def connect(self):
#         print("connect")
#
#         await self.accept()
#
#     async def receive(self, text_data=None, bytes_data=None):
#         print("recieve")
#         await self.close()
#
#
#     async def disconnect(self, close_code):
#         print("disconnect")
#
