from kimchi.celery import app
from datacollection.models import Event, URL, CustomSession
from django_pandas.io import read_frame
import pandas as pd
import numpy as np
import json
import sys, traceback
from dataprocessing.models import Task


@app.task
def process_task(task, *args):
    if len(args) == 1:
        args = args[0]
    task_sig = task.s(args)
    taskname = str(task_sig)
    print("processing task", taskname)
    task_db, created = Task.objects.get_or_create(signature=taskname)
    task_db.state = "starting"
    task_db.save(update_fields=['state'])
    try:
        result = task_sig.apply_async()
        task_db.state = "processing"
        task_db.save(update_fields=['state'])
        task_db.result = result.get()
        print('result')
        print(result.get())
        task_db.state = "done"
        task_db.save()
    except Exception as exc:
        tb = traceback.format_exception(etype=type(exc), value=exc, tb=exc.__traceback__)
        task_db.errors = tb
        task_db.state = "error"
        task_db.save(update_fields=['state'])

    task_db.save()
    return task_db


# of particular interest
all_data_collection_urls = ['ginnymason', 'chadsalyer', 'kristinknowlton', 'lori day', 'leja', 'leja2', 'debbiepoull',
                            'juliamorgan']


@app.task
def computeFunnelByPuzzle(group='all'):
    if group == 'all':
        toFilter = all_data_collection_urls
    else:
        toFilter = group

    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)

    dataEvents['time'] = pd.to_datetime(dataEvents['time'])
    dataEvents = dataEvents.sort_values('time')
    dataEvents['group'] = [json.loads(x)['group'] if 'group' in json.loads(x).keys() else '' for x in
                           dataEvents['data']]
    dataEvents['user'] = [json.loads(x)['user'] if 'user' in json.loads(x).keys() else '' for x in dataEvents['data']]

    # removing those rows where we dont have a group and a user that is not guest
    dataEvents = dataEvents[
        ((dataEvents['group'] != '') & (dataEvents['user'] != '') & (dataEvents['user'] != 'guest'))]
    dataEvents['group_user_id'] = dataEvents['group'] + '~' + dataEvents['user']

    # userFunnelDict key: (group~user~puzzle), json values: started, create_shape, submitted, completed
    userFunnelDict = dict()

    for user in dataEvents['group_user_id'].unique():

        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_puzzle_key = None

        for enum, event in user_events.iterrows():

            if (event['type'] in ['ws-start_level', 'ws-puzzle_started']):
                user_puzzle_key = event['group'] + '~' + event['user'] + '~' + json.loads(event['data'])['task_id']
                if (user_puzzle_key not in userFunnelDict.keys()):
                    userFunnelDict[user_puzzle_key] = json.loads(
                        '{"started": 0, "create_shape": 0, "submitted": 0, "completed": 0}')

            if (event['type'] == 'ws-puzzle_started'):
                userFunnelDict[user_puzzle_key]['started'] += 1
            elif (event['type'] == 'ws-create_shape'):
                userFunnelDict[user_puzzle_key]['create_shape'] += 1
            elif (event['type'] == 'ws-check_solution'):
                userFunnelDict[user_puzzle_key]['submitted'] += 1
            elif (event['type'] == 'ws-puzzle_complete'):
                userFunnelDict[user_puzzle_key]['completed'] += 1

    userFunnelList = []
    for key in userFunnelDict.keys():
        key_split = key.split('~')
        userFunnelList.append([key_split[0], key_split[1], key_split[2], userFunnelDict[key]])

    userFunnelByPuzzle = pd.DataFrame(userFunnelList, columns=['group', 'user', 'task_id', 'funnel'])

    return userFunnelByPuzzle.to_json()


@app.task
def run_computeFunnelByPuzzle():
    urls = URL.objects.all()
    all_data_collection_urls = []
    interesting_urls = ['ginnymason', 'chadsalyer', 'kristinknowlton', 'lori day', 'leja', 'leja2', 'debbiepoull',
                        'juliamorgan']
    for url in urls:
        all_data_collection_urls.append(str(url.name))
        task = process_task(computeFunnelByPuzzle, url.name)
        task.input_urls.add(url)
        task.save()

# @app.on_after_configure.connect
# def setup_periodic_tasks(sender, **kwargs):
#     # Calls test('hello') every 10 seconds.
#     sender.add_periodic_task(10.0, test.s('hello'), name='add every 10')
#
#     # Calls test('world') every 30 seconds
#     sender.add_periodic_task(30.0, test.s('world'), expires=10)
