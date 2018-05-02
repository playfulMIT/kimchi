


from datacollection.utils import get_client_ip



class FingerprintViewSet(viewsets.ModelViewSet):

    """
    API endpoint that allows fingerprints to be viewed or edited.
    """
    queryset = Fingerprint.objects.all().order_by('-creation_time')
    serializer_class = FingerprintSerializer

    def perform_create(self, serializer):
        ip_list = get_client_ip(self.request).split(',')
        public_ip = str(ip_list[len(ip_list)-1])
        other_ip = None
        if len(ip_list) > 1:
            other_ip = str(ip_list[0])
        serializer.save(client_ip=public_ip,
                        client_ip_other=other_ip)