from kimchi.celery import app
from datacollection.models import Event, URL, CustomSession
from django_pandas.io import read_frame
import pandas as pd
import numpy as np
import json
import sys, traceback
from dataprocessing.models import Task
from django.utils import timezone


@app.task
def process_task(task, *args):
    # this fixes an extraneous comma in tuples
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
        task_db.state = "done"
        task_db.time_ended = timezone.now()
        task_db.errors = ""
    except Exception as exc:
        tb = traceback.format_exception(etype=type(exc), value=exc, tb=exc.__traceback__)
        task_db.errors = tb
        task_db.state = "error"
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
def sequenceBetweenPuzzles(group='all'):
    if group == 'all':
        toFilter = all_data_collection_urls
    else:
        toFilter = group

    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)

    dataEvents['group'] = [json.loads(x)['group'] if 'group' in json.loads(x).keys() else '' for x in
                           dataEvents['data']]
    dataEvents['user'] = [json.loads(x)['user'] if 'user' in json.loads(x).keys() else '' for x in dataEvents['data']]
    # removing those rows where we dont have a group and a user that is not guest
    dataEvents = dataEvents[
        ((dataEvents['group'] != '') & (dataEvents['user'] != '') & (dataEvents['user'] != 'guest'))]
    dataEvents['group_user_id'] = dataEvents['group'] + '~' + dataEvents['user']

    # Data Cleaning
    dataEvents['time'] = pd.to_datetime(dataEvents['time'])
    dataEvents = dataEvents.sort_values('time')

    userPuzzleDict = {}

    for user in dataEvents['group_user_id'].unique():
        # Select rows
        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_events_na_dropped = user_events.dropna()
        for enum, event in user_events_na_dropped.iterrows():
            user_key = event['user']
            if (user_key not in userPuzzleDict.keys()):
                userPuzzleDict[user_key] = {}
                numPuzzles = 1
            if (event['type'] == 'ws-start_level'):
                # print('\\start level\\')
                # print(json.loads(event['data']))
                activePuzzle = json.loads(event['data'])['task_id']
                secondKey = str(numPuzzles) + '~' + event['session']
                userPuzzleDict[user_key][secondKey] = {activePuzzle: ''}
            elif (event['type'] == 'ws-puzzle_started'):
                userPuzzleDict[user_key][secondKey] = {activePuzzle: 'started'}
            elif (event['type'] == 'ws-create_shape'):
                userPuzzleDict[user_key][secondKey] = {activePuzzle: 'shape_created'}
            elif (event['type'] == 'ws-check_solution'):
                userPuzzleDict[user_key][secondKey] = {activePuzzle: 'submitted'}
            elif (event['type'] == 'ws-puzzle_complete'):
                userPuzzleDict[user_key][secondKey] = {activePuzzle: 'completed'}
            elif (event['type'] in ['ws-puzzle_complete', 'ws-exit_to_menu', 'ws-disconnect']):
                numPuzzles += 1

    userSessionList = []
    for key in userPuzzleDict.keys():
        for sequence in userPuzzleDict[key].keys():
            key_split = sequence.split('~')
            userSessionList.append([key, key_split[1], key_split[0], userPuzzleDict[key][sequence]])

    userSequence = pd.DataFrame(userSessionList, columns=['user', 'session', 'sequence', 'task_id'])

    return userSequence.to_json()


@app.task
def computeLevelsOfActivity(group = 'all'):
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
    
    #iterates in the groups and users of the data
    dataEvents['group'] = [json.loads(x)['group'] if 'group' in json.loads(x).keys() else '' for x in dataEvents['data']]
    dataEvents['user'] = [json.loads(x)['user'] if 'user' in json.loads(x).keys() else '' for x in dataEvents['data']]
    dataEvents['task_id'] = [json.loads(x)['task_id'] if 'task_id' in json.loads(x).keys() else '' for x in dataEvents['data']]
    
    # removing those rows where we dont have a group and a user that is not guest
    dataEvents = dataEvents[((dataEvents['group'] != '') & (dataEvents['user'] != '') & (dataEvents['user'] != 'guest'))]
    dataEvents['group_user_id'] = dataEvents['group'] + '~' + dataEvents['user']
    dataEvents['group_user_task_id'] = dataEvents['group'] + '~' + dataEvents['user']+'~'+dataEvents['task_id']

    # filtering to only take the group passed as argument
    if(group != 'all'):
        dataEvents = dataEvents[dataEvents['group'].isin(group)]
          
    # the data is grouped by the necessary variables      
    activity_by_user = dataEvents.groupby(['group_user_id','group', 'user','group_user_task_id','task_id']).agg({'id':'count',
                                             'type':'nunique'}).reset_index().rename(columns={'id':'events',
                                                                                              'type':'different_events'}) 
    
    #indicate the index variable                                                                                                                                                               
    activity_by_user.index = activity_by_user['group_user_task_id'].values
                                                                                              
    #initialize the metrics                                                                                          
    activity_by_user['event'] = np.nan
    activity_by_user['different_events'] = np.nan
    activity_by_user['active_time'] = np.nan
    activity_by_user['snapshot'] = 0
    activity_by_user['paint'] = 0
    activity_by_user['rotate_view'] = 0
    activity_by_user['move_shape'] = 0
    activity_by_user['scale_shape'] = 0
    activity_by_user['create_shape'] = 0
    activity_by_user['delete_shape'] = 0
    activity_by_user['undo_action'] = 0
    activity_by_user['redo_action'] = 0
    
    #initialize the data structures
    userFunnelDict = dict()  
    puzzleEvents = dict()
    eventsDiff = []
    eventsDiff_puzzle = dict()
    timePuzzle = dict()
    globalTypesEvents = dict()
    typesEvents = dict()

    for user in dataEvents['group_user_id'].unique():
        # Computing active time
        previousEvent = None
        theresHoldActivity = 60 # np.percentile(allDifferences, 98) is 10 seconds
        activeTime = []
        
        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_puzzle_key = None

        for enum, event in user_events.iterrows():
            # If it is the first event
            if(previousEvent is None):
                previousEvent = event
                continue
            
            if(event['type'] in ['ws-start_level', 'ws-puzzle_started']):
                #create id: group+user+task_id                                                                              
                user_puzzle_key = event['group'] + '~' + event['user'] + '~' + json.loads(event['data'])['task_id']
                
                # initialize if the id is new                                                                              
                if(user_puzzle_key not in puzzleEvents.keys()):
                    puzzleEvents[user_puzzle_key]= 1
                    eventsDiff_puzzle[user_puzzle_key] = []
                    timePuzzle[user_puzzle_key] = 0
                    
                    globalTypesEvents[user_puzzle_key] = dict()
                    globalTypesEvents[user_puzzle_key]['ws-snapshot'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-paint'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-rotate_view'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-move_shape'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-scale_shape'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-create_shape'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-delete_shape'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-undo_action'] = 0
                    globalTypesEvents[user_puzzle_key]['ws-redo_action'] = 0
                    
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    
            # the event is not final event
            if(event['type'] not in ['ws-exit_to_menu', 'ws-puzzle_complete', 'ws-create_user', 'ws-login_user']):                            
                    puzzleEvents[user_puzzle_key] += 1
                                                                                              
                    #add the event type                                                                          
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    
                    #calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds

                    previousEvent = event 
                    
                    #update event counters by type                                                                          
                    if(event['type'] == 'ws-snapshot'):
                        globalTypesEvents[user_puzzle_key]['ws-snapshot'] +=1
                    elif(event['type'] == 'ws-rotate_view'):
                        globalTypesEvents[user_puzzle_key]['ws-rotate_view'] +=1 
                    elif(event['type'] == 'ws-paint'):
                        globalTypesEvents[user_puzzle_key]['ws-paint'] +=1 
                    elif(event['type'] == 'ws-move_shape'):
                        globalTypesEvents[user_puzzle_key]['ws-move_shape'] +=1 
                    elif(event['type'] == 'ws-scale_shape'):
                        globalTypesEvents[user_puzzle_key]['ws-scale_shape'] +=1 
                    elif(event['type'] == 'ws-create_shape'):
                        globalTypesEvents[user_puzzle_key]['ws-create_shape'] +=1
                    elif(event['type'] == 'ws-delete_shape'):
                        globalTypesEvents[user_puzzle_key]['ws-delete_shape'] +=1
                    elif(event['type'] == 'ws-undo_action'):
                        globalTypesEvents[user_puzzle_key]['ws-undo_action'] +=1
                    elif(event['type'] == 'ws-redo_action'):
                        globalTypesEvents[user_puzzle_key]['ws-redo_action'] +=1    
                        
            # the puzzle ends        
            if(event['type'] in ['ws-exit_to_menu', 'ws-puzzle_complete']):                   
                    #add the event type                                                                         
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    
                    #calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds

                    previousEvent = event
                    
    # add the data by group_user_task_id            
    for i in dataEvents['group_user_task_id'].unique():
        key_split = i.split('~')
        if(key_split[2] != ''):
            activity_by_user.at[i, 'event'] = puzzleEvents[i]
            activity_by_user.at[i, 'different_events'] = len(set(eventsDiff_puzzle[i]))
            activity_by_user.at[i, 'active_time'] = timePuzzle[i]
            activity_by_user.at[i, 'snapshot'] = globalTypesEvents[i]['ws-snapshot']
            activity_by_user.at[i, 'paint'] = globalTypesEvents[i]['ws-paint']
            activity_by_user.at[i, 'rotate_view'] = globalTypesEvents[i]['ws-rotate_view']
            activity_by_user.at[i, 'move_shape'] = globalTypesEvents[i]['ws-move_shape']
            activity_by_user.at[i, 'scale_shape'] = globalTypesEvents[i]['ws-scale_shape']
            activity_by_user.at[i, 'create_shape'] = globalTypesEvents[i]['ws-create_shape']
            activity_by_user.at[i, 'delete_shape'] = globalTypesEvents[i]['ws-delete_shape']
            activity_by_user.at[i, 'undo_action'] = globalTypesEvents[i]['ws-undo_action']
            activity_by_user.at[i, 'redo_action'] = globalTypesEvents[i]['ws-redo_action']

    #delete row with NaN
    activity_by_user.dropna(inplace=True)
    #delete group_user_task_id column
    activity_by_user.drop(columns=['group_user_task_id'], inplace=True)
    
    #data output preparation                                                                                          
    activity_by_user = pd.melt(activity_by_user, id_vars=['group', 'user','task_id'], 
        value_vars=['event','different_events', 'active_time','snapshot','paint','rotate_view','move_shape','scale_shape','create_shape','delete_shape','undo_action','redo_action'], 
        var_name='metric', value_name='value')
        
    return activity_by_user.to_json()


@app.task
def generate_metadata_and_run_tasks():
    urls = URL.objects.all()
    all_data_collection_urls = []
    interesting_urls = ['ginnymason', 'chadsalyer', 'kristinknowlton', 'lori day', 'leja', 'leja2', 'debbiepoull',
                        'juliamorgan']
    for url in urls:
        all_data_collection_urls.append(str(url.name))
        task = process_task(computeFunnelByPuzzle, [url.name])
        task.input_urls.add(url)
        task.save()
        task = process_task(sequenceBetweenPuzzles, [url.name])
        task.input_urls.add(url)
        task.save()
        task = process_task(computeLevelsOfActivity, [url.name])
        task.input_urls.add(url)
        task.save()

    interesting_task = process_task(computeFunnelByPuzzle, interesting_urls)
    for url in interesting_urls:
        interesting_task.input_urls.add(URL.objects.get(name=url))
    interesting_task.save()
    interesting_task = process_task(sequenceBetweenPuzzles, interesting_urls)
    for url in interesting_urls:
        interesting_task.input_urls.add(URL.objects.get(name=url))
    interesting_task.save()
    interesting_task = process_task(computeLevelsOfActivity, interesting_urls)
    for url in interesting_urls:
        interesting_task.input_urls.add(URL.objects.get(name=url))
    interesting_task.save()

    all_task = process_task(computeFunnelByPuzzle, [all_data_collection_urls])
    for url in urls:
        all_task.input_urls.add(url)
    all_task.save()
    all_task = process_task(sequenceBetweenPuzzles, [all_data_collection_urls])
    for url in urls:
        all_task.input_urls.add(url)
    all_task.save()
    all_task = process_task(computeLevelsOfActivity, [all_data_collection_urls])
    for url in urls:
        all_task.input_urls.add(url)
    all_task.save()

# @app.on_after_configure.connect
# def setup_periodic_tasks(sender, **kwargs):
#     # Calls test('hello') every 10 seconds.
#     sender.add_periodic_task(10.0, test.s('hello'), name='add every 10')
#
#     # Calls test('world') every 30 seconds
#     sender.add_periodic_task(30.0, test.s('world'), expires=10)
