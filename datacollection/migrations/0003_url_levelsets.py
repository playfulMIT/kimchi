# Generated by Django 2.0.4 on 2018-11-14 09:59

from django.db import migrations, models


class Migration(migrations.Migration):

    operations = [
        migrations.AddField(
            model_name='url',
            name='levelsets',
            field=models.ManyToManyField(to='games.LevelSet'),
        ),
    ]
