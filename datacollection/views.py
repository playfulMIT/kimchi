from rest_framework import viewsets, status
from datacollection.utils import get_client_ip
from .models import GameSession, Event
from .serializers import GameSessionSerializer, EventSerializer
from django.views.decorators.csrf import csrf_exempt

import json


# @csrf_exempt
class GameSessionViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows sessions to be viewed or edited.
    """
    queryset = GameSession.objects.all()
    serializer_class = GameSessionSerializer

    def perform_create(self, serializer):
        ip_list = get_client_ip(self.request).split(',')
        public_ip = str(ip_list[len(ip_list)-1])
        other_ip = None
        if len(ip_list) > 1:
            other_ip = str(ip_list[0])
        serializer.save(client_ip=public_ip,
                        client_ip_other=other_ip)
# @csrf_exempt
class EventViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows fingerprints to be viewed or edited.
    """
    queryset = Event.objects.all()
    serializer_class = EventSerializer

    def create(self, request, *args, **kwargs):
        print(request.data)
        data = json.loads(request.data)
        data['session_id'] = request.session
        request.data = json.dumps(data)
        super.create(self, request, *args, **kwargs)



# class CreateModelMixin(object):
#     """
#     Create a model instance.
#     """
#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         self.perform_create(serializer)
#         headers = self.get_success_headers(serializer.data)
#         return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
#
#     def perform_create(self, serializer):
#         serializer.save()
#
#     def get_success_headers(self, data):
#         try:
#             return {'Location': str(data[api_settings.URL_FIELD_NAME])}
#         except (TypeError, KeyError):
# return {}