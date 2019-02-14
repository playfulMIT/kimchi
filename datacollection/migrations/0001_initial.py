# Generated by Django 2.1.5 on 2019-02-14 23:36

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('shadowspect', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomSession',
            fields=[
                ('session_key', models.CharField(max_length=40, primary_key=True, serialize=False, verbose_name='session key')),
                ('session_data', models.TextField(verbose_name='session data')),
                ('expire_date', models.DateTimeField(db_index=True, verbose_name='expire date')),
            ],
            options={
                'verbose_name': 'session',
                'verbose_name_plural': 'sessions',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('time', models.DateTimeField(default=django.utils.timezone.now)),
                ('type', models.CharField(max_length=32)),
                ('data', models.TextField()),
                ('session', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='datacollection.CustomSession')),
            ],
        ),
        migrations.CreateModel(
            name='Player',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('attempted', models.ManyToManyField(blank=True, related_name='levels_attempted', to='shadowspect.Level')),
                ('completed', models.ManyToManyField(blank=True, related_name='levels_completed', to='shadowspect.Level')),
            ],
        ),
        migrations.CreateModel(
            name='URL',
            fields=[
                ('name', models.CharField(max_length=50, primary_key=True, serialize=False)),
                ('useGuests', models.BooleanField(default=False)),
                ('canEdit', models.BooleanField(default=False)),
                ('levelsets', models.ManyToManyField(blank=True, to='shadowspect.LevelSet')),
            ],
        ),
        migrations.AddField(
            model_name='player',
            name='url',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='datacollection.URL'),
        ),
        migrations.AddField(
            model_name='customsession',
            name='player',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to='datacollection.Player'),
        ),
    ]
