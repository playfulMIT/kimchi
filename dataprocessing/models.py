from django.db import models
from django.utils import timezone
from datacollection.models import CustomSession, URL, Event, Player


class Task(models.Model):
    signature = models.TextField(blank=True)
    input_urls = models.ManyToManyField(URL)
    input_sessions = models.ManyToManyField(CustomSession)
    input_events = models.ManyToManyField(Event)
    input_players = models.ManyToManyField(Player)
    state = models.TextField(blank=True)
    time_started = models.DateTimeField(default=timezone.now)
    errors = models.TextField(blank=True)
    result = models.TextField(blank=True)
    time_ended = models.DateTimeField(blank=True)