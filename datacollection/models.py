from django.db import models
from django.contrib.auth.models import User
from django.contrib.sessions.models import Session
from django.utils import timezone


class GameSession(Session):
    # session_id = models.ForeignKey(Session,null=True)
    server_creation_time = models.DateTimeField(default=timezone.now)
    local_creation_time = models.DateTimeField(null=True)
    user = models.ForeignKey(User,
                             null=True,
                             blank=True,
                             on_delete=models.CASCADE)

    user_agent = models.CharField(max_length=200, null=True) # not sure what a good length is yet
    screen_size = models.CharField(max_length=12, null=True)
    browser_url = models.CharField(max_length=200, null=True) # not sure about this
    languages = models.CharField(max_length=50, null=True) # or this one, for that matter
    client_ip = models.CharField(max_length=15, null=True)
    client_ip_other = models.CharField(max_length=15, null=True)

# graphics capability

# force login ? context of non-web gameplay - guest mode


class Event(models.Model):
    time = models.DateTimeField(default=timezone.now)
    # user = models.ForeignKey(User, on_delete=models.CASCADE) # index on user
    session = models.ForeignKey(GameSession, default="", null=True, on_delete=models.CASCADE)
    type = models.CharField(max_length=32)
    context = models.CharField(max_length=32)
    params = models.TextField()

