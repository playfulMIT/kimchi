from django.contrib.auth.models import AbstractUser, UserManager
from django.db.models import CharField
from django.urls import reverse
from django.utils.translation import ugettext_lazy as _
from django.db import models
from django.contrib.sessions.models import Session



class CustomUserManager(UserManager):
    def get_by_natural_key(self, username):
        case_insensitive_username_field = '{}__iexact'.format(self.model.USERNAME_FIELD)
        return self.get(**{case_insensitive_username_field: username})



class CustomUser(AbstractUser):
    objects = CustomUserManager()
    name = CharField(_("Name of User"), blank=True, max_length=255)

    def get_absolute_url(self):
        return reverse("users:detail", kwargs={"username": self.username})


class URL(models.Model):
    name = models.CharField(primary_key=True,max_length=50)
    owner = models.ForeignKey(CustomUser, null=True, on_delete=models.SET_NULL)


class Player(models.Model):
    name = models.CharField(max_length=50)
    # sessions = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL, many=True)
    url = models.ForeignKey(URL, null=True, on_delete=models.SET_NULL)

class PlayerSession(models.Model):
    player = models.ForeignKey(URL, null=True, on_delete=models.SET_NULL)
