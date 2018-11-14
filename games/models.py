from django.db import models

class Level(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    levelname = models.CharField(max_length=50)
    description = models.TextField()
    gridDim = models.IntegerField(null=True,blank=True)
    shapeData = models.TextField()
    # owner = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)
    solutionCameraAngles = models.CharField(max_length=50)

class LevelSet(models.Model):
    name = models.CharField(max_length=50)
    levels = models.ManyToManyField(Level)
    canPlay = models.BooleanField(default=True)