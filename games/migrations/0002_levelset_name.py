# Generated by Django 2.0.4 on 2018-11-14 12:43

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='levelset',
            name='name',
            field=models.CharField(default='Tutorial', max_length=50),
            preserve_default=False,
        ),
    ]
