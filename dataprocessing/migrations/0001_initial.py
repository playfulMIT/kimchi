# Generated by Django 2.2.11 on 2020-04-16 23:47

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('datacollection', '0004_auto_20190327_1957'),
    ]

    operations = [
        migrations.CreateModel(
            name='Task',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('signature', models.TextField(blank=True)),
                ('state', models.TextField(blank=True)),
                ('time_started', models.DateTimeField(default=django.utils.timezone.now)),
                ('errors', models.TextField(blank=True)),
                ('result', models.TextField(blank=True)),
                ('time_ended', models.DateTimeField(blank=True)),
                ('input_events', models.ManyToManyField(to='datacollection.Event')),
                ('input_players', models.ManyToManyField(to='datacollection.Player')),
                ('input_sessions', models.ManyToManyField(to='datacollection.CustomSession')),
                ('input_urls', models.ManyToManyField(to='datacollection.URL')),
            ],
        ),
    ]