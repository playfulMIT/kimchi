from rest_framework import serializers
from .models import Session
from .fields import GetOrCreateSlugRelatedField #?


class SessionSerializer(serializers.ModelSerializer):
    # session_id = GetOrCreateSlugRelatedField(queryset=Session.objects.all(), slug_field='session')
    class Meta:
        model = Session
        fields = ('local_creation_time', 'session_id', 'app_name', 'event_type', 'params', 'creation_time', 'is_sent')
