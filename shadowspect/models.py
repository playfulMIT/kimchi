from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.utils import timezone


class Level(models.Model):
    filename = models.CharField(max_length=50, unique=True)
    data = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.filename


class Replay(models.Model):
    replay = models.TextField(null=True, blank=True)
    created = models.DateTimeField(default=timezone.now)
    last_updated = models.DateTimeField(auto_now=True)
    player = models.ForeignKey("datacollection.Player", null=True, on_delete=models.SET_NULL)
    url = models.ForeignKey("datacollection.URL", null=True, on_delete=models.SET_NULL)
    level = models.ForeignKey(Level, null=True, on_delete=models.SET_NULL)
    event_range = ArrayField(models.IntegerField(), null=True)
