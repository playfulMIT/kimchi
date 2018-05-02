from rest_framework import serializers
from .models import GameSession, Event
from .fields import GetOrCreateSlugRelatedField #?


class GameSessionSerializer(serializers.ModelSerializer):
    # session_id = GetOrCreateSlugRelatedField(queryset=Session.objects.all(), slug_field='session')
    class Meta:
        model = GameSession
        fields = ('__all__')


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ('__all__')