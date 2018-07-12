from rest_framework import viewsets, status
from datacollection.utils import get_client_ip
from .models import GameSession, Event
from .serializers import GameSessionSerializer, EventSerializer
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
import json
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.sessions.models import Session
import logging
from datetime import timedelta
from django.http import StreamingHttpResponse, HttpResponse
from django.utils import timezone

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
        if not request.session.session_key:
            request.session.save()
        # print(request.POST)
        key = request.data.get('session') if request.data.get('session') else str(request.session.session_key)
        print(key)
        print(request.data.get('session'))
        request.data._mutable = True
        request.data.update({'session': key})
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sessionObj = Session.objects.get(pk=key)
        serializer.save(session=sessionObj)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)






class Echo:
    """An object that implements just the write method of the file-like
    interface.
    """
    def __init__(self, column_headers):
        self.header = column_headers
        self.header_written = False
    def write(self, value):
        if not self.header_written:
            value = self.header + '\n' + str(value) + '\n'
            self.header_written = True
        """Write the value by returning it, instead of storing in a buffer."""
        value_string = str(value) + '\n'
        return value_string.encode('utf-8')

def filtered_data_as_http_response(rows, headers, filename):
    if rows:
        pseudo_buffer = Echo(headers)
        response = StreamingHttpResponse((pseudo_buffer.write(row) for row in rows),
                                         content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="' + filename + '"'
    else:
        response = HttpResponse("No data found with current filters")
    return response

def streaming_event_csv(request):
    """A view that streams a large CSV file."""
    # yesterday = timezone.now() - timedelta(days=1)
    # rows = Message.objects.filter(creation_time__gt=yesterday).order_by("transcript", "creation_time")
    rows = Event.objects.all().order_by("session", "time")
    return filtered_data_as_http_response(rows,
                         "session;time;type;data;id",
                         "eventlogs.csv")
