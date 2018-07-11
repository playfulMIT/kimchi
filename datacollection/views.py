from rest_framework import viewsets, status
from datacollection.utils import get_client_ip
from .models import GameSession, Event
from .serializers import GameSessionSerializer, EventSerializer
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
import json
from django.contrib.sessions.models import Session
import logging

logger = logging.getLogger(__name__)



# @csrf_exempt
class GameSessionViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows sessions to be viewed or edited.
    """
    queryset = GameSession.objects.all()
    serializer_class = GameSessionSerializer

    def create(self, request, *args, **kwargs):
        ip_list = get_client_ip(self.request).split(',')
        public_ip = str(ip_list[len(ip_list) - 1])
        other_ip = None
        if len(ip_list) > 1:
            other_ip = str(ip_list[0])
        #experimental
        # if not request.session.get('has_session'):
        #     request.session['has_session'] = True
        # print('session key:')
        # print(request.session.session_key)
        # if request.session.session_key:
        #     # print('session key:')
        #     # print(request.session.session_key)
        #     session = Session.objects.get(session_key=request.session.session_key)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(client_ip=public_ip,
                        client_ip_other=other_ip,
                        # session=session,
                        # user=request.user
                        )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class EventViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows fingerprints to be viewed or edited.
    """

    queryset = Event.objects.all().order_by('-id')
    serializer_class = EventSerializer

    def create(self, request, *args, **kwargs):
        print('key: ' + request.session.session_key)
        request.session.save()
        sessionObject = Session.objects.get(pk=request.session.session_key)
        print(sessionObject)

        print('key: ' + request.session.session_key)
        serializer = self.get_serializer(data=request.data)
        # serializer.is_valid(raise_exception=True)
        print('saving...')

        serializer.save(session=sessionObject)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)




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