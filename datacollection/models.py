from django.contrib.sessions.models import Session
from django.db import models
from django.utils import timezone

from games.models import LevelSet, Level


class Event(models.Model):
    time = models.DateTimeField(default=timezone.now)
    # user = models.ForeignKey(User, on_delete=models.CASCADE) # index on user
    session = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL)
    type = models.CharField(max_length=32)
    data = models.TextField()

    def __str__(self):
        session = str(self.session) if self.session else 'no_session'
        time = str(self.time) if self.time else 'no_time'
        type = str(self.type) if self.type else 'no_type'
        data = str(self.data) if self.data else 'no_data'
        id = str(self.id) if self.id else 'no_id'
        return session + ';' + time + ';' + type + ';' + data + ';' + id


class URL(models.Model):
    name = models.CharField(primary_key=True, max_length=50)
    # owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    levelsets = models.ManyToManyField(LevelSet, blank=True)
    useGuests = models.BooleanField(default=False)
    canEdit = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Player(models.Model):
    name = models.CharField(max_length=50)
    # sessions = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL, many=True)
    url = models.ForeignKey(URL, null=True, on_delete=models.SET_NULL)
    attempted = models.ManyToManyField(Level, blank=True, related_name='levels_attempted')
    completed = models.ManyToManyField(Level, blank=True, related_name='levels_completed')

    def __str__(self):
        return self.name


class PlayerSession(models.Model):
    player = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)
    session = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL)

    def __str__(self):
        key = "session_missing" if self.session.session_key is None else self.session.session_key
        return key
