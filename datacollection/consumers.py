from channels.generic.websocket import AsyncWebsocketConsumer
import json
import re



class DataCollectionConsumer(AsyncWebsocketConsumer):

    async def websocket_connect(self, event):
        await self.send({
            "type": "websocket.accept",
        })

    async def websocket_receive(self, event):
        print(event)
        await self.send({
            "type": "websocket.send",
            "text": event["text"],
        })
