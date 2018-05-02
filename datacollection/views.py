from rest_framework import viewsets, status
from datacollection.utils import get_client_ip
from .models import Session


class SessionViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows fingerprints to be viewed or edited.
    """
    queryset = Session.objects.all().order_by('-creation_time')
    serializer_class = SessionSerializer

    def perform_create(self, serializer):
        ip_list = get_client_ip(self.request).split(',')
        public_ip = str(ip_list[len(ip_list)-1])
        other_ip = None
        if len(ip_list) > 1:
            other_ip = str(ip_list[0])
        serializer.save(client_ip=public_ip,
                        client_ip_other=other_ip)