from django.db import models
from accounts.models import CustomUser as User
from django.contrib.sessions.models import Session
from django.utils import timezone
from games.models import LevelSet


# class GameSession(models.Model):
#     session = models.ForeignKey(Session,null=True,on_delete=models.SET_NULL)
#     server_creation_time = models.DateTimeField(default=timezone.now)
#     local_creation_time = models.CharField(max_length=50, null=True) #models.DateTimeField(null=True)
#     user = models.ForeignKey(User,
#                              null=True,
#                              blank=True,
#                              on_delete=models.CASCADE)
#
#     user_agent = models.CharField(max_length=200, null=True) # not sure what a good length is yet
#     screen_size = models.CharField(max_length=12, null=True)
#     browser_url = models.CharField(max_length=200, null=True) # not sure about this
#     languages = models.CharField(max_length=50, null=True) # or this one, for that matter
#     client_ip = models.CharField(max_length=15, null=True)
#     client_ip_other = models.CharField(max_length=15, null=True)

# graphics capability

# force login ? context of non-web gameplay - guest mode


class Event(models.Model):
    time = models.DateTimeField(default=timezone.now)
    # user = models.ForeignKey(User, on_delete=models.CASCADE) # index on user
    session = models.ForeignKey(Session,null=True,on_delete=models.SET_NULL)
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
    name = models.CharField(primary_key=True,max_length=50)
    # owner = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    levelsets = models.ManyToManyField(LevelSet,blank=True)


class Player(models.Model):
    name = models.CharField(max_length=50)
    # sessions = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL, many=True)
    url = models.ForeignKey(URL, null=True, on_delete=models.SET_NULL)

class PlayerSession(models.Model):
    player = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)
    session = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL)
