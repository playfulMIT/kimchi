# Generated by Django 2.0.4 on 2018-11-14 09:25

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datacollection', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='url',
            name='owner',
        ),
    ]
