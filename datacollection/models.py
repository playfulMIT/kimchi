from django.contrib.sessions.models import Session
from django.db import models
from django.utils import timezone

from shadowspect.models import LevelSet, Level


from django.contrib.sessions.backends.db import SessionStore as DBStore
from django.contrib.sessions.base_session import AbstractBaseSession


class CustomSession(AbstractBaseSession):
    account_id = models.IntegerField(null=True, db_index=True)

    @classmethod
    def get_session_store_class(cls):
        return SessionStore

class SessionStore(DBStore):
    @classmethod
    def get_model_class(cls):
        return CustomSession

    def create_model_instance(self, data):
        obj = super().create_model_instance(data)
        try:
            account_id = int(data.get('_auth_user_id'))
        except (ValueError, TypeError):
            account_id = None
        obj.account_id = account_id
        return obj


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
        key = "session_missing" if self.session is None else self.session.session_key
        return key
