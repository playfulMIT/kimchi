# Generated by Django 2.0.4 on 2018-11-14 12:12

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ('shadowspect', '0001_initial'),
        ('sessions', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.DateTimeField(default=django.utils.timezone.now)),
                ('type', models.CharField(max_length=32)),
                ('data', models.TextField()),
                ('session',
                 models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.Session')),
            ],
        ),
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
            ],
        ),
        migrations.CreateModel(
            name='PlayerSession',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('player', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL,
                                             to='datacollection.Player')),
                ('session',
                 models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='sessions.Session')),
            ],
        ),
        migrations.CreateModel(
            name='URL',
            fields=[
                ('name', models.CharField(max_length=50, primary_key=True, serialize=False)),
                ('levelsets', models.ManyToManyField(blank=True, to='shadowspect.LevelSet')),
            ],
        ),
        migrations.AddField(
            model_name='player',
            name='url',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='datacollection.URL'),
        ),
    ]
