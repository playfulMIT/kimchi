# Generated by Django 2.2.13 on 2020-08-10 22:38

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('shadowspect', '0003_auto_20200810_2235'),
    ]

    operations = [
        migrations.RenameField(
            model_name='replay',
            old_name='level_name',
            new_name='level',
        ),
    ]