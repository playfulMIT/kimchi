# Generated by Django 2.0.4 on 2018-11-14 09:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0001_initial'),
        ('datacollection', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='url',
            name='levelsets',
            field=models.ManyToManyField(to='games.LevelSet'),
        ),
    ]
