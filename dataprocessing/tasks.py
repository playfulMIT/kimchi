from kimchi.celery import app
from datacollection.models import Event, URL, CustomSession
from django_pandas.io import read_frame
import pandas as pd
import numpy as np
import json
import sys, traceback
from dataprocessing.models import Task
from django.utils import timezone

from dashboard.views import get_completed_puzzles_map


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
def sequenceWithinPuzzles(group='all'):
    if group == 'all':
        toFilter = all_data_collection_urls
    else:
        toFilter = group

    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)

    tutorialList = ['1. One Box', '2. Separated Boxes', '3. Rotate a Pyramid', '4. Match Silhouettes',
                    '5. Removing Objects', '6. Stretch a Ramp', '7. Max 2 Boxes', '8. Combine 2 Ramps',
                    '9. Scaling Round Objects', 'Sandbox']
    # Remove SandBox and tutorial levels.
    dataEvents['group'] = [json.loads(x)['group'] if 'group' in json.loads(x).keys() else '' for x in
                           dataEvents['data']]
    dataEvents['user'] = [json.loads(x)['user'] if 'user' in json.loads(x).keys() else '' for x in dataEvents['data']]
    # removing those rows where we dont have a group and a user that is not guest
    dataEvents = dataEvents[
        ((dataEvents['group'] != '') & (dataEvents['user'] != '') & (dataEvents['user'] != 'guest'))]
    dataEvents['group_user_id'] = dataEvents['group'] + '~' + dataEvents['user']
    # filtering to only take the group passed as argument
    if (group != 'all'):
        dataEvents = dataEvents[dataEvents['group'].isin(group)]
    # Data Cleaning
    dataEvents['time'] = pd.to_datetime(dataEvents['time'])
    dataEvents = dataEvents.sort_values('time')

    newDataEvents = []
    # Select puzzle and actions
    notSelectedEvents = ['ws-mode_change', 'ws-click_nothing', 'ws-click_disabled', 'ws-select_shape',
                         'ws-deselect_shape', 'ws-paint', 'ws-palette_change', 'ws-toggle_paint_display',
                         'ws-toggle_snapshot_display', 'ws-create_user', 'ws-redo_action', 'ws-undo_action',
                         'ws-restart_puzzle', 'ws-puzzle_started']
    # Selected puzzles
    selectedPuzzles = ['Square Cross-Sections', 'Bird Fez', 'Pi Henge', '45-Degree Rotations', 'Pyramids are Strange',
                       'Boxes Obscure Spheres', 'Object Limits', 'Warm Up', 'Angled Silhouette',
                       'Sugar Cones', 'Stranger Shapes', 'Tall and Small', 'Ramp Up and Can It',
                       'More Than Meets Your Eye', 'Not Bird', 'Unnecesary', 'Zzz', 'Bull Market', 'Few Clues',
                       'Orange Dance', 'Bear Market']

    eventsWithMetaData = ['ws-create_shape', 'ws-delete_shape', 'ws-rotate_shape', 'ws-scale_shape', 'ws-move_shape']

    for user in dataEvents['group_user_id'].unique():
        # Select rows
        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_events_na_dropped = user_events.dropna()
        activePuzzle = None
        nAttempt = 1
        prevCheck = False
        prevEvent = None
        figureDict = dict()
        for enum, event in user_events_na_dropped.iterrows():
            # Ignore event
            if (prevCheck == True):
                if (event['type'] == 'ws-puzzle_complete'):
                    prevEvent['metadata']['correct'] = True
                    newDataEvents.append(prevEvent)
                    prevCheck = False
                    prevEvent = None
                    continue
                else:
                    prevEvent['metadata']['correct'] = False
                newDataEvents.append(prevEvent)
                prevCheck = False
                prevEvent = None

            if (event['type'] in notSelectedEvents):
                continue

            elif (event['type'] == 'ws-start_level'):
                activePuzzle = json.loads(event['data'])['task_id']
                event['task_id'] = activePuzzle

            elif (event['type'] == 'ws-create_shape'):
                event['task_id'] = activePuzzle
                if (event['task_id'] in selectedPuzzles):
                    event['n_attempt'] = nAttempt
                    shape_id = json.loads(event['data'])['objSerialization']
                    shape_type = json.loads(event['data'])['shapeType']
                    figureDict[shape_id] = shape_type
                    event['metadata'] = dict()
                    event['metadata']['shape_id'] = shape_id
                    event['metadata']['shape_type'] = shape_type
                    newDataEvents.append(event)

            elif (event['type'] == 'ws-delete_shape' or event['type'] == 'ws-move_shape'):
                event['task_id'] = activePuzzle
                if (event['task_id'] in selectedPuzzles):
                    event['n_attempt'] = nAttempt
                    if (event['type'] == 'ws-delete_shape'):
                        idList = json.loads(event['data'])['deletedShapes']
                    elif (event['type'] == 'ws-move_shape'):
                        idList = json.loads(event['data'])['selectedObjects']
                    for shapeId in idList:
                        shape_id = shapeId
                        shape_type = figureDict[shape_id]
                        event['metadata'] = dict()
                        event['metadata']['shape_id'] = shape_id
                        event['metadata']['shape_type'] = shape_type
                        newDataEvents.append(event)

            elif (event['type'] == 'ws-rotate_shape' or event['type'] == 'ws-scale_shape'):
                event['task_id'] = activePuzzle
                if (event['task_id'] in selectedPuzzles):
                    event['n_attempt'] = nAttempt
                    shape_id = json.loads(event['data'])['selectedObject']
                    shape_type = figureDict[shape_id]
                    event['metadata'] = dict()
                    event['metadata']['shape_id'] = shape_id
                    event['metadata']['shape_type'] = shape_type
                    newDataEvents.append(event)

            elif ((event['type'] in ['ws-exit_to_menu', 'ws-login_user']) and (activePuzzle in selectedPuzzles)):
                figureDict.clear()
                nAttempt += 1

            else:
                event['task_id'] = activePuzzle
                if (event['task_id'] in selectedPuzzles):
                    event['n_attempt'] = nAttempt
                    event['metadata'] = dict()
                    if (event['type'] == 'ws-check_solution'):
                        prevCheck = True
                        prevEvent = event
                    else:
                        newDataEvents.append(event)

    taskDf = pd.DataFrame(newDataEvents,
                          columns=['id', 'time', 'group_user_id', 'task_id', 'n_attempt', 'type', 'metadata'])

    data = taskDf

    listEvent = ['ws-rotate_view', 'ws-rotate_shape', 'ws-undo_action', 'ws-move_shape', 'ws-snapshot',
                 'ws-scale_shape']

    dataConvert2 = []
    for user in data['group_user_id'].unique():
        individualDf = data[data['group_user_id'] == user]
        # Current action set
        currentAction = []
        # String with action types
        actionString = ""
        actualEvent = 'None'
        for enum, event in individualDf.iterrows():
            key = event['group_user_id']
            key_split = key.split('~')
            event['group_id'] = key_split[0]
            event['user'] = key_split[1]
            actualEvent = event['type']
            eq = True
            for a in currentAction:
                if (a['type'] != actualEvent):
                    # Ver si podemos compactar
                    eq = False

            if (eq == False):
                igual = True
                prev = ""
                for a2 in currentAction:
                    if (a2['type'] != prev):
                        if (prev == ""):
                            igual = True
                        else:
                            igual = False
                    prev = a2['type']
                if ((igual == True) and (prev in listEvent)):
                    add = currentAction[0]
                    # add['type'] = add['type'] + 'x' + str(len(currentAction))
                    add['n_times'] = len(currentAction)
                    dataConvert2.append(add)
                    currentAction.clear()
                    currentAction.append(event)
                else:  # igual != True
                    for a in currentAction:
                        a['n_times'] = 1
                        dataConvert2.append(a)
                    currentAction.clear()
                    currentAction.append(event)
            else:  # eq = True
                if (event['type'] not in listEvent):
                    currentAction.append(event)
                    for a in currentAction:
                        a['n_times'] = 1
                        dataConvert2.append(a)
                    currentAction.clear()

                else:
                    if (len(currentAction) > 0):
                        if (currentAction[0]['type'] in eventsWithMetaData):
                            # Event with metadata, check if it is the same shape_id
                            if (currentAction[0]['metadata']['shape_id'] == event['metadata']['shape_id']):
                                currentAction.append(event)
                            else:
                                add = currentAction[0]
                                # add['type'] = add['type'] + 'x' + str(len(currentAction))
                                add['n_times'] = len(currentAction)
                                dataConvert2.append(add)
                                currentAction.clear()
                                currentAction.append(event)
                        # Event without metaData, just concatenate.
                        else:
                            currentAction.append(event)

                    elif (len(currentAction) == 0):
                        currentAction.append(event)

        # Add last elems
        # We must check if last elems can be also replaced.
        final = ""
        if (len(currentAction) > 0):
            igual2 = True
            prev = ""
            for a2 in currentAction:
                if (a2['type'] != prev):
                    if (prev == ""):
                        igual2 = True
                    else:
                        igual2 = False
                prev = a2['type']
            if ((igual == True) and (prev in listEvent)):
                add = currentAction[0]
                # add['type'] = add['type'] + 'x' + str(len(currentAction))
                add['n_times'] = len(currentAction)
                dataConvert2.append(add)
                currentAction.clear()
                currentAction.append(event)
            else:  # igual != True
                for a in currentAction:
                    a['n_times'] = 1
                    dataConvert2.append(a)
                currentAction.clear()
                currentAction.append(event)

    # Create dataframe from list
    # consecutiveDf = pd.DataFrame(dataConvert2, columns=['id', 'time', 'group_user_id', 'task_id', 'n_attempt', 'type', 'metadata'])
    data = pd.DataFrame(dataConvert2,
                        columns=['group_id', 'user', 'task_id', 'n_attempt', 'type', 'n_times', 'metadata'])

    # Recalculate n_attempt
    mod = []
    for user in data['user'].unique():
        previousAttempt = 1
        n_attempt = 1
        individualDf = data[data['user'] == user]
        for enum, event in individualDf.iterrows():
            if (event['n_attempt'] != previousAttempt):
                n_attempt += 1
            previousAttempt = event['n_attempt']
            event['n_attempt'] = n_attempt
            mod.append(event)
    modDf = pd.DataFrame(mod, columns=['group_id', 'user', 'task_id', 'n_attempt', 'type', 'n_times', 'metadata'])
    return modDf.to_json()

@app.task
def computeLevelsOfActivity(group='all'):
    ### DATA COLLECTION AND INITIAL PROCESSING
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
    
    typeEvents = ['ws-snapshot','ws-paint', 'ws-rotate_view','ws-move_shape','ws-rotate_shape' ,'ws-scale_shape','ws-create_shape','ws-delete_shape','ws-undo_action','ws-redo_action', 'ws-check_solution']
    
   
    #initialize the metrics  
    activity_by_user['timeTotal'] = np.nan
    activity_by_user['inactive_time'] = np.nan
    activity_by_user['event'] = np.nan
    activity_by_user['different_events'] = np.nan
    activity_by_user['active_time'] = np.nan
    for event in typeEvents:
        activity_by_user[event] = 0
    
    #initialize the data structures
    userFunnelDict = dict()  
    puzzleEvents = dict()
    eventsDiff = []
    eventsDiff_puzzle = dict()
    timePuzzle = dict()
    globalTypesEvents = dict()
    eventInitial = dict()
    totalTime = dict()
    
      
    for user in dataEvents['group_user_id'].unique():
        
        # Computing active time
        previousEvent = None
        theresHoldActivity = 60 # np.percentile(allDifferences, 98) is 10 seconds
        limit = 3600
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
                
                if(user_puzzle_key not in totalTime.keys()):
                    totalTime[user_puzzle_key] = 0
                    
                delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                if((delta_seconds < limit)):
                    totalTime[user_puzzle_key] += delta_seconds
                previousEvent = event
                
                       
                # initialize if the id is new                                                                              
                if(user_puzzle_key not in puzzleEvents.keys()):
                    #totalTime[user_puzzle_key] = 0
                    puzzleEvents[user_puzzle_key]= 1
                    eventsDiff_puzzle[user_puzzle_key] = []
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    timePuzzle[user_puzzle_key] = 0
                    globalTypesEvents[user_puzzle_key] = dict()
                    for ev in typeEvents:
                        globalTypesEvents[user_puzzle_key][ev]= 0
                        
                       
            
            # the event is not final event
            if(event['type'] not in ['ws-exit_to_menu', 'ws-puzzle_complete', 'ws-create_user', 'ws-login_user']): 
                    puzzleEvents[user_puzzle_key] += 1
                                                                                              
                    #add the event type                                                                          
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    
                    #calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < limit)):
                        totalTime[user_puzzle_key] += delta_seconds
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds

                    previousEvent = event 
                    
                    #update event counters by type
                    if(event['type'] in typeEvents):
                        globalTypesEvents[user_puzzle_key][event['type']] +=1
                    
                        
            # the puzzle ends        
            if(event['type'] in ['ws-exit_to_menu', 'ws-puzzle_complete']):
                
                    puzzleEvents[user_puzzle_key] += 1
                    
                    #add the event type                                                                         
                    eventsDiff_puzzle[user_puzzle_key].append(event['type'])
                    
                    #calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < limit)):
                        totalTime[user_puzzle_key] += delta_seconds
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds
                        

                    previousEvent = event
    
    # add the data by group_user_task_id            
    for i in dataEvents['group_user_task_id'].unique():
        key_split = i.split('~')
        if(key_split[2] != ''):
            activity_by_user.at[i, 'timeTotal'] = totalTime[i]
            activity_by_user.at[i, 'inactive_time'] = totalTime[i]-timePuzzle[i]
            activity_by_user.at[i, 'event'] = puzzleEvents[i]
            activity_by_user.at[i, 'different_events'] = len(set(eventsDiff_puzzle[i]))
            activity_by_user.at[i, 'active_time'] = timePuzzle[i]
            for event in typeEvents:
                activity_by_user.at[i, event] = globalTypesEvents[i][event]

    #delete row with NaN
    activity_by_user.dropna(inplace=True)
    #delete group_user_task_id column
    activity_by_user.drop(columns=['group_user_task_id'], inplace=True)
    
    #data output preparation                                                                                          
    activity_by_user = pd.melt(activity_by_user, id_vars=['group', 'user','task_id'], 
        value_vars=['timeTotal','inactive_time','event','different_events', 'active_time','ws-snapshot','ws-paint','ws-rotate_view','ws-rotate_shape','ws-move_shape','ws-scale_shape','ws-create_shape','ws-delete_shape','ws-undo_action','ws-redo_action','ws-check_solution'], 
        var_name='metric', value_name='value')

    ### MERGING ROWS CORRESPONDING TO THE SAME USER
    activity_dict = activity_by_user.to_dict()
    max_index = len(activity_dict['group'])
    merged_activity = {}

    for i in range(max_index):
        if activity_dict['task_id'][i] not in merged_activity:
            merged_activity[activity_dict['task_id'][i]] = {}

        if user not in merged_activity[activity_dict['task_id'][i]]:
            merged_activity[activity_dict['task_id'][i]][user] = {"no_normalization": {}}

        merged_activity[activity_dict['task_id'][i]][user][activity_dict['metric'][i]] = float(activity_dict['value'][i])

    ### GENERATING STATISTICS
    completed_puzzles_map = {}
    for url in urls:
        completed_puzzles_map.update(get_completed_puzzles_map(url.name))
    metric_keys = list(list(merged_activity.values())[0].values())[0].no_normalization.keys()

    for task in merged_activity:
        statistics = {}
        completed_statistics = {}

        values = {}
        completed_values = {}

        for key in metric_keys:
            statistics[key] = {
                'min': float("inf"),
                'max': float("-inf"),
                'median': 0,
                'mean': 0,
                'stdev': 0
            }
            completed_statistics[key] = {
                'min': float("inf"),
                'max': float("-inf"),
                'median': 0,
                'mean': 0,
                'stdev': 0
            }
            values[key] = []
            completed_values[key] = []
        
        users = merged_activity[task]
        items = users.items()
        
        for student, norm in items:
            value = norm.no_normalization
            if value['ws-create_shape'] == 0:
                continue
            if task in completed_puzzles_map[student]:
                for key in value.keys():
                    values[key].append(value[key])
                    completed_values[key].append(value[key])

                    if statistics[key]['min'] > value[key]:
                        statistics[key]['min'] = value[key]
                    if statistics[key]['max'] < value[key]:
                        statistics[key]['max'] = value[key]

                    if completed_statistics[key]['min'] > value[key]:
                        completed_statistics[key]['min'] = value[key]
                    if completed_statistics[key]['max'] < value[key]:
                        completed_statistics[key]['max'] = value[key]
            else:
                for key in value.keys():
                    values[key].append(value[key])

                    if statistics[key]['min'] > value[key]:
                        statistics[key]['min'] = value[key]
                    if statistics[key]['max'] < value[key]:
                        statistics[key]['max'] = value[key]
        
        for key in metric_keys:
            statistics[key]['median'] = np.median(values[key])
            statistics[key]['mean'] = np.mean(values[key])
            statistics[key]['stdev'] = np.std(values[key])

            completed_statistics[key]['median'] = np.median(completed_values[key])
            completed_statistics[key]['mean'] = np.mean(completed_values[key])
            completed_statistics[key]['stdev'] = np.std(completed_values[key])
        
        merged_activity[task]['all_stats'] = statistics
        merged_activity[task]['completed_stats'] = None if completed_statistics["event"]["min"] == float("inf") else completed_statistics

        ### CALCULATING NORMALIZED VALUES
        merged_activity[task]["minmax_normalization"] = {"all_stats": {}, "completed_stats": {}}
        merged_activity[task]["standard_normalization"] = {"all_stats": {}, "completed_stats": {}}

        for student, norm in items:
            value = norm.no_normalization
            
            for key, key_val in value.entries():
                min_val = merged_activity[task]['all_stats'][key]['min']
                max_val = merged_activity[task]['all_stats'][key]['max']
                stdev_val = merged_activity[task]['all_stats'][key]['stdev']
                mean_val = merged_activity[task]['all_stats'][key]['mean']

                merged_activity[task]["minmax_normalization"]['all_stats'][student] = {}
                merged_activity[task]["minmax_normalization"]['all_stats'][student][key] = (key_val - min_val) / (max_val - min_val) if max_val - min_val != 0 else 0
                
                min_val = merged_activity[task]['completed_stats'][key]['min']
                max_val = merged_activity[task]['completed_stats'][key]['max']
                stdev_val = merged_activity[task]['completed_stats'][key]['stdev']
                mean_val = merged_activity[task]['completed_stats'][key]['mean']

                merged_activity[task]["standard_normalization"]['completed_stats'][student] = {}
                merged_activity[task]["standard_normalization"]['completed_stats'][student][key] = ((key_val - mean_val) / stdev_val) if stdev_val != 0 else 0

    return json.dumps(merged_activity)

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
