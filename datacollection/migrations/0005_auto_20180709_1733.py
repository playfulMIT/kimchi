# Generated by Django 2.0.4 on 2018-07-09 17:33

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('datacollection', '0004_auto_20180516_2112'),
    ]

    operations = [
        migrations.RenameField(
            model_name='event',
            old_name='params',
            new_name='data',
        ),
    ]