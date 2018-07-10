from rest_framework import serializers
from .models import GameSession, Event
from .fields import GetOrCreateSlugRelatedField #?
from django.contrib.sessions.models import Session



class GameSessionSerializer(serializers.ModelSerializer):
    # session_id = GetOrCreateSlugRelatedField(queryset=GameSession.objects.all(), slug_field='session')
    class Meta:
        model = GameSession
        fields = ('__all__')


class EventSerializer(serializers.ModelSerializer):
    # session = Session.objects.get(pk=session)
    class Meta:
        model = Event
        fields = ('__all__')