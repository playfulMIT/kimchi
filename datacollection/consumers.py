from channels.generic.websocket import AsyncWebsocketConsumer
import json
import re



class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        print("connect")
        # await self.send({
        #     "type": "websocket.accept",
        # })
        await self.accept()

        async def receive(self, text_data):
            print(text_data)
            print("got data")
            # await self.send({
            #     "type": "websocket.send",
            #     "text": event["text"],
            # })
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
