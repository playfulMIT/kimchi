from channels.generic.websocket import AsyncWebsocketConsumer
import json
import re



class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        print("connect")
        self.scope["session"].save()
        print(self.scope["session"])
        await self.accept()

    async def receive(self, text_data):
        print(text_data)
        print("got data")
        # text_data_json = json.loads(text_data)
        # print(text_data_json)

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
