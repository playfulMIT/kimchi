from channels.generic.websocket import AsyncWebsocketConsumer
import json
from .models import Event
from django.contrib.sessions.models import Session


class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        print("connect")
        self.scope["session"].save()
        print(self.scope["session"])
        print(self.scope["session"].session_key)
        self.session = Session.objects.get(session_key=self.scope["session"].session_key)
        await self.accept()

    async def receive(self, text_data=None, bytes_data=None):
        if (text_data):
            # print(text_data)
            print("got data")
            text_data_json = json.loads(text_data)
            Event.objects.create(session=self.session, type=text_data_json["type"], data = text_data_json["data"])
            # print(text_data_json)
        if (bytes_data):
            print(bytes_data)

    async def disconnect(self):
        print("disconnect")
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
