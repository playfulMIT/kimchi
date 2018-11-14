from django.db import models
# from datacollection.models import Player
from datacollection.models import URL
# Create your models here.

class Level(models.Model):
    puzzleName = models.CharField(max_length=50)
    description = models.TextField()
    gridDim = models.IntegerField(null=True,blank=True)
    shapeData = models.TextField()
    # owner = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)
    solutionCameraAngles = models.CharField(max_length=50)

class LevelSet(models.Model):
    levels = models.ManyToManyField(Level)
    urls = models.ManyToManyField(URL)
    canPlay = models.BooleanField(default=True)