from django.db import models
from datacollection.models import Player
# Create your models here.

class Level(models.Model):
    data = models.TextField()
    owner = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)