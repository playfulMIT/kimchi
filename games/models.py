from django.db import models


class Level(models.Model):
    filename = models.CharField(max_length=50, unique=True)
    ingamename = models.CharField(max_length=50)
    description = models.TextField()
    gridDim = models.IntegerField(null=True, blank=True)
    shapeData = models.TextField()
    # owner = models.ForeignKey(Player, null=True, on_delete=models.SET_NULL)
    solutionCameraAngles = models.CharField(max_length=50)

    def __str__(self):
        return self.filename


class LevelSet(models.Model):
    name = models.CharField(max_length=50)
    levels = models.ManyToManyField(Level)
    canPlay = models.BooleanField(default=True)

    def __str__(self):
        return self.name
