from rest_framework import serializers
from .models import Event, Trace
from .fields import GetOrCreateSlugRelatedField #?


class AppDataSerializer(serializers.ModelSerializer):
    session_id = GetOrCreateSlugRelatedField(queryset=UUID.objects.all(), slug_field='session_id')
    class Meta:
        model = AppData
        fields = ('url', 'session_id', 'app_name', 'event_type', 'params', 'creation_time', 'is_sent')
