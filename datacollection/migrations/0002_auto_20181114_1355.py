# Generated by Django 2.0.4 on 2018-11-14 13:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('datacollection', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='url',
            name='canEdit',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='url',
            name='useGuests',
            field=models.BooleanField(default=False),
        ),
    ]
