import json
import traceback
from collections import OrderedDict, defaultdict

import numpy as np
import pandas as pd
from scipy import stats

import rrcf
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django_pandas.io import read_frame

from datacollection.models import Event, URL, CustomSession, Player
from dataprocessing.models import Task
from kimchi.celery import app
from shadowspect.models import Level, Replay
from dashboard.views import create_player_map, get_completed_puzzles_map, get_puzzles_dict
from dataprocessing.elo import adaptedData, run
from dataprocessing.misconceptions import sequenceWithinPuzzlesForMisconceptions, tagMisconceptions

difficultyMapping = ['Sandbox~0.000001','1. One Box~0.000002', '2. Separated Boxes~0.111127', '3. Rotate a Pyramid~0.083447', '4. Match Silhouettes~0.061887', '5. Removing Objects~0.106021', '6. Stretch a Ramp~0.107035', '7. Max 2 Boxes~0.078039', '8. Combine 2 Ramps~0.068608', '9. Scaling Round Objects~0.128647', 
               'Square Cross-Sections~0.199714', 'Bird Fez~0.156674', 'Pi Henge~0.067346', '45-Degree Rotations~0.096715',  'Pyramids are Strange~0.179600', 'Boxes Obscure Spheres~0.266198', 'Object Limits~0.257177', 'Not Bird~0.260197', 'Angled Silhouette~0.147673',
               'Warm Up~0.183971','Tetromino~0.226869', 'Stranger Shapes~0.283971', 'Sugar Cones~0.085909', 'Tall and Small~0.266869', 'Ramp Up and Can It~0.206271', 'More Than Meets Your Eye~0.192319', 'Unnecessary~0.76', 'Zzz~0.234035', 'Bull Market~0.358579', 'Few Clues~0.324041', 'Orange Dance~0.647731', 'Bear Market~1.000000']


typeMapping = ['Sandbox~SAND', '1. One Box~Tutorial', '2. Separated Boxes~Tutorial', '3. Rotate a Pyramid~Tutorial', '4. Match Silhouettes~Tutorial', '5. Removing Objects~Tutorial', '6. Stretch a Ramp~Tutorial', '7. Max 2 Boxes~Tutorial', '8. Combine 2 Ramps~Tutorial', '9. Scaling Round Objects~Tutorial', 
               'Square Cross-Sections~Easy Puzzles', 'Bird Fez~Easy Puzzles', 'Pi Henge~Easy Puzzles', '45-Degree Rotations~Easy Puzzles',  'Pyramids are Strange~Easy Puzzles', 'Boxes Obscure Spheres~Easy Puzzles', 'Object Limits~Easy Puzzles', 'Not Bird~Easy Puzzles', 'Angled Silhouette~Easy Puzzles',
               'Warm Up~Hard Puzzles','Tetromino~Hard Puzzles', 'Stranger Shapes~Hard Puzzles', 'Sugar Cones~Hard Puzzles', 'Tall and Small~Hard Puzzles', 'Ramp Up and Can It~Hard Puzzles', 'More Than Meets Your Eye~Hard Puzzles', 'Unnecessary~Hard Puzzles', 'Zzz~Hard Puzzles', 'Bull Market~Hard Puzzles', 'Few Clues~Hard Puzzles', 'Orange Dance~Hard Puzzles', 'Bear Market~Hard Puzzles']

difficultyPuzzles = dict()

for puzzle in difficultyMapping:
    desc = puzzle.split("~")
    difficultyPuzzles[desc[0]] = float(desc[1])


tutorialPuzzles = []

for puzzle in typeMapping:
    desc = puzzle.split("~")
    if(desc[1] == 'Tutorial'):
        tutorialPuzzles.append(desc[0])
        
advancedPuzzles = []

for puzzle in typeMapping:
    desc = puzzle.split("~")
    if(desc[1] == 'Hard Puzzles'):
        advancedPuzzles.append(desc[0])
        
        
intermediatePuzzles = []

for puzzle in typeMapping:
    desc = puzzle.split("~")
    if(desc[1] == 'Easy Puzzles'):
        intermediatePuzzles.append(desc[0])        
        
allPuzzles = []
for puzzle in typeMapping:
    desc = puzzle.split("~")
    allPuzzles.append(desc[0])

@app.task
def process_task(task, *args):
    # this fixes an extraneous comma in tuples
    if len(args) == 1:
        args = args[0]
    # and this fixes when there are no args
    if len(args) == 0:
        task_sig = task.s()
    else:
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
    if group == 'all' : 
        toFilter = all_data_collection_urls
    else:
        toFilter = group
        
    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)
    
    dataEvents['group'] = [json.loads(x)['group'] if 'group' in json.loads(x).keys() else '' for x in dataEvents['data']]
    dataEvents['user'] = [json.loads(x)['user'] if 'user' in json.loads(x).keys() else '' for x in dataEvents['data']]
    # removing those rows where we dont have a group and a user that is not guest
    dataEvents = dataEvents[((dataEvents['group'] != '') & (dataEvents['user'] != '') & (dataEvents['user'] != 'guest'))]
    dataEvents['group_user_id'] = dataEvents['group'] + '~' + dataEvents['user']

    # filtering to only take the group passed as argument
    if(group != 'all'):
        dataEvents = dataEvents[dataEvents['group'].isin(group)]
    
       # Data Cleaning
    dataEvents['time'] = pd.to_datetime(dataEvents['time'])
    dataEvents = dataEvents.sort_values('time')

    userPuzzleDict = {}

    for user in dataEvents['group_user_id'].unique():
            #Select rows
            user_events = dataEvents[dataEvents['group_user_id'] == user]
            user_events_na_dropped = user_events.dropna()
            for enum, event in user_events_na_dropped.iterrows():
                user_key = event['user']
                if(user_key not in userPuzzleDict.keys()):
                    userPuzzleDict[user_key] = {}
                    numPuzzles = 1
                if(event['type'] == 'ws-start_level'):
                    activePuzzle = json.loads(event['data'])['task_id']
                    if (activePuzzle == 'Sandbox'):
                        continue
                    secondKey = str(numPuzzles) + '~' + event['session']
                    if (userPuzzleDict[user_key].get(secondKey) == None):
                        userPuzzleDict[user_key][secondKey] = dict()
                    if (userPuzzleDict[user_key][secondKey].get(activePuzzle) == None):
                        userPuzzleDict[user_key][secondKey] = {activePuzzle : 'started'}
                elif(event['type'] == 'ws-puzzle_started'):
                    if (activePuzzle == 'Sandbox' or userPuzzleDict[user_key][secondKey][activePuzzle] in ['started','shape_created', 'submitted', 'completed']):
                        continue
                    userPuzzleDict[user_key][secondKey] = {activePuzzle : 'started'}
                elif(event['type'] == 'ws-create_shape'):
                    if (activePuzzle == 'Sandbox' or userPuzzleDict[user_key][secondKey][activePuzzle] in ['shape_created', 'submitted', 'completed']):
                        continue
                    userPuzzleDict[user_key][secondKey] = {activePuzzle : 'shape_created'}
                elif(event['type'] == 'ws-check_solution'):
                    if (activePuzzle == 'Sandbox' or userPuzzleDict[user_key][secondKey][activePuzzle] in ['submitted', 'completed']):
                        continue
                    userPuzzleDict[user_key][secondKey] = {activePuzzle :'submitted'}
                elif(event['type'] == 'ws-puzzle_complete'):
                    if (activePuzzle == 'Sandbox'):
                        continue
                    userPuzzleDict[user_key][secondKey] = {activePuzzle :'completed'}
                elif(event['type'] in ['ws-exit_to_menu', 'ws-disconnect', 'ws-login_user']):
                    if (activePuzzle == 'Sandbox'):
                        continue
                    numPuzzles +=1
                    
    userSessionList = []
    for key in userPuzzleDict.keys():
        for sequence in userPuzzleDict[key].keys():
                key_split = sequence.split('~')
                userSessionList.append([key, key_split[1], int(key_split[0]), userPuzzleDict[key][sequence]])

    userSequence = pd.DataFrame(userSessionList, columns=['user', 'session', 'sequence', 'task_id'])
    #Recalculate sequence
    mod = []
    for user in userSequence['user'].unique():
            previousAttempt = 1
            n_attempt = 1
            individualDf = userSequence[userSequence['user'] == user]
            for enum, event in individualDf.iterrows():
                if (event['sequence'] != previousAttempt):
                    n_attempt += 1
                previousAttempt = event['sequence']
                event['sequence'] = n_attempt
                mod.append(event)
    modDf = pd.DataFrame(mod, columns=['user', 'session', 'sequence', 'task_id'])
    return modDf.to_json()

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
    merged_activity = {"all": {"no_normalization": {}}}
    player_map = {}

    for url in urls:
        player_map[url.name] = {v: k for k, v in create_player_map(url.name).items()}

    for i in range(max_index):
        user = player_map.get(activity_dict['group'][i]).get(activity_dict['user'][i])
        if user == None:
            continue

        metric = activity_dict['metric'][i]
        if activity_dict['task_id'][i] not in merged_activity:
            merged_activity[activity_dict['task_id'][i]] = {"no_normalization": {}}

        if user not in merged_activity[activity_dict['task_id'][i]]["no_normalization"]:
            merged_activity[activity_dict['task_id'][i]]["no_normalization"][user] = {}
            merged_activity["all"]["no_normalization"][user] = defaultdict(float)

        merged_activity[activity_dict['task_id'][i]]["no_normalization"][user][metric] = float(activity_dict['value'][i])
        
        if metric != "different_events":
            # if metric == "timeTotal":
            #     print("here " + str(activity_dict['value'][i]) + "\n")
            merged_activity["all"]["no_normalization"][user][metric] += float(activity_dict['value'][i])
        else:
            # if metric == "timeTotal": 
            #     print("here bad\n")
            merged_activity["all"]["no_normalization"][user][metric] = max(merged_activity["all"]["no_normalization"][user][metric], float(activity_dict['value'][i]))

    ### GENERATING STATISTICS
    completed_puzzles_map = {}
    for url in urls:
        completed_puzzles_map.update(get_completed_puzzles_map(url.name))
    metric_keys = list(list(merged_activity.values())[0]["no_normalization"].values())[0].keys()

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
        
        users = merged_activity[task]["no_normalization"]
        items = users.items()
        
        for student, value in items:
            if value['ws-create_shape'] == 0:
                continue
            # TODO: why is timeTotal sum incorrect?
            if task == "all":
                value["timeTotal"] = value["inactive_time"] + value["active_time"]
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
        
        merged_activity[task]['no_normalization']['all_stats'] = statistics
        no_completed_stats = completed_statistics["event"]["min"] == float("inf")
        merged_activity[task]['no_normalization']['completed_stats'] = None if no_completed_stats else completed_statistics

        ### CALCULATING NORMALIZED VALUES
        merged_activity[task]["minmax_normalization"] = {"all_stats": {}, "completed_stats": None if no_completed_stats else {}}
        merged_activity[task]["standard_normalization"] = {"all_stats": {}, "completed_stats": None if no_completed_stats else {}}

        for student, value in items:
            if (student == "all_stats" or student == "completed_stats"):
                continue

            merged_activity[task]["minmax_normalization"]['all_stats'][student] = {}
            merged_activity[task]["standard_normalization"]['all_stats'][student] = {}

            if not no_completed_stats:
                merged_activity[task]["minmax_normalization"]['completed_stats'][student] = {}
                merged_activity[task]["standard_normalization"]['completed_stats'][student] = {}

            for key, key_val in value.items():
                min_val = merged_activity[task]['no_normalization']['all_stats'][key]['min']
                max_val = merged_activity[task]['no_normalization']['all_stats'][key]['max']
                stdev_val = merged_activity[task]['no_normalization']['all_stats'][key]['stdev']
                mean_val = merged_activity[task]['no_normalization']['all_stats'][key]['mean']

                merged_activity[task]["minmax_normalization"]['all_stats'][student][key] = (key_val - min_val) / (max_val - min_val) if max_val - min_val != 0 else 0
                merged_activity[task]["standard_normalization"]['all_stats'][student][key] = ((key_val - mean_val) / stdev_val) if stdev_val != 0 else 0

                if no_completed_stats:
                    continue

                min_val = merged_activity[task]['no_normalization']['completed_stats'][key]['min']
                max_val = merged_activity[task]['no_normalization']['completed_stats'][key]['max']
                stdev_val = merged_activity[task]['no_normalization']['completed_stats'][key]['stdev']
                mean_val = merged_activity[task]['no_normalization']['completed_stats'][key]['mean']

                merged_activity[task]["minmax_normalization"]['completed_stats'][student][key] = (key_val - min_val) / (max_val - min_val) if max_val - min_val != 0 else 0
                merged_activity[task]["standard_normalization"]['completed_stats'][student][key] = ((key_val - mean_val) / stdev_val) if stdev_val != 0 else 0

    return json.dumps(merged_activity)

@app.task
def computeLevelsOfActivityOutliers(group='all'):
    url = URL.objects.get(name='leja') #TODO: fix name 
    puzzles = get_puzzles_dict(url.name)["puzzles"]
    task = list(Task.objects.filter(signature__contains="computeLevelsOfActivityInProgress(['"+url.name+"']").values_list("result", flat=True))[0]
    np.random.seed(0)

    outlier_vals = {}
    outlier_vals_puzzles = {}
    outlier_metrics = []
    outlier_metrics_students = []
    outlier_metrics_puzzles = []

    for puzzle_list in puzzles.values():
        for puzzle in puzzle_list:
            data = json.loads(task)[puzzle]["minmax_normalization"]["all_stats"]
            outlier_metrics.extend(data.values())
            outlier_metrics_students.extend(data.keys())
            outlier_metrics_puzzles.extend([puzzle] * len(data.keys()))

    n = len(outlier_metrics)
    d = len(list(outlier_metrics[0].keys()))

    # Generate data
    X = np.zeros((n, d))
    for i in range(n):
        X[i,...] = np.array(list(outlier_metrics[i].values()))

    num_trees = 100
    tree_size = 256  
    sample_size_range = (n // tree_size, tree_size)

    # Construct forest
    forest = []
    while len(forest) < num_trees:
        # Select random subsets of points uniformly
        ixs = np.random.choice(n, size=sample_size_range,
                            replace=False)
        # Add sampled trees to forest
        trees = [rrcf.RCTree(X[ix], index_labels=ix)
                for ix in ixs]
        forest.extend(trees)

    # Compute average CoDisp
    avg_codisp = pd.Series(0.0, index=np.arange(n))
    index = np.zeros(n)
    for tree in forest:
        codisp = pd.Series({leaf : tree.codisp(leaf)
                        for leaf in tree.leaves})
        avg_codisp[codisp.index] += codisp
        np.add.at(index, codisp.index.values, 1)
    avg_codisp /= index

    threshold = avg_codisp.quantile(0.99)
    print(threshold)

    for i in range(len(outlier_metrics)):
        student = outlier_metrics_students[i]
        puzzle = outlier_metrics_puzzles[i]
        if student not in outlier_vals:
            outlier_vals[student] = []
            outlier_vals_puzzles[student] = []
        outlier_vals[student].append(avg_codisp[i])
        outlier_vals_puzzles[student].append(puzzle)

    outlier_result = {}
    for student in outlier_vals:
        indices = np.where(outlier_vals[student] > threshold)
        if len(indices[0]) > 0:
            outlier_result[student] = list(np.array(outlier_vals_puzzles[student])[indices])

    return json.dumps(outlier_result)

@app.task
def computePersistence(group = 'all'):
    if group == 'all' : 
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
    #if(group != 'all'):
    #    dataEvents = dataEvents[dataEvents['group'].isin(group)]

        # the data is grouped by the necessary variables      
    activity_by_user = dataEvents.groupby(['group_user_id']).agg({'id':'count',
                                                 'type':'nunique'}).reset_index().rename(columns={'id':'events',
                                                                                                  'type':'different_events'}) 


           # Data Cleaning
        #dataEvents['time'] = pd.to_datetime(dataEvents['time'])
    dataEvents = dataEvents.sort_values('time')

    typeEvents = ['ws-snapshot','ws-paint', 'ws-rotate_view','ws-move_shape','ws-rotate_shape' ,'ws-scale_shape','ws-create_shape','ws-delete_shape','ws-undo_action','ws-redo_action', 'ws-check_solution']
    manipulationTypeEvents = ['ws-move_shape','ws-rotate_shape' ,'ws-scale_shape','ws-create_shape','ws-delete_shape']



        #initialize the metrics  
    activity_by_user['completed'] = np.nan
    activity_by_user['active_time'] = np.nan
    activity_by_user['n_events'] = np.nan
    activity_by_user['timestamp'] = np.nan


    for event in typeEvents:
        activity_by_user[event] = 0

    #initialize the data structures 
    puzzleEvents = dict()
    timePuzzle = dict()
    globalTypesEvents = dict()
    n_attempts = dict()
    completados = dict()
    timestamp = dict()

    percentilAtt = dict()
    percentilTime = dict()

    percentilAttValue = 90
    percentilTimeValue = 90

    breaksPuzzle = dict()
    cumAttempts = OrderedDict()
    puzzleAttempts = dict()
    userCumAttempts = OrderedDict()
    puzzleCumAttempts = dict()
    prevReg = dict()
    actualAtt = 0
    prevAtt = 0
    idComplete = dict()
    contParc = dict()
    orden = []
    ids = []
    attemptsAux = dict()

    contCheckSol = dict()

    manipulationEvents = dict()
    userManipulationEvents = dict()
    contManipulation = 0
    timeFirstCheck = dict()
    timeSubExit = dict()
    timeCheckActual = dict()
    timeBetweenSub = dict()


    for user in dataEvents['group_user_id'].unique():

            # Computing active time
        previousEvent = None
        theresHoldActivity = 60 # np.percentile(allDifferences, 98) is 10 seconds
        activeTime = []

        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_puzzle_key = None
        userParc = None
        task_id = None
        initialTime = None
        prev_id = 1

        for enum, event in user_events.iterrows():

                # If it is the first event
                if(previousEvent is None):
                    previousEvent = event
                    continue

                if( event['type'] in ['ws-start_level'] ):

                    #create id: group+user+task_id          
                    task_id = json.loads(event['data'])['task_id']
                    if (task_id =="Sandbox"):
                        continue

                    if(user_puzzle_key not in timeSubExit.keys()):
                        timeSubExit[user_puzzle_key] = str(0)
                        timeBetweenSub[user_puzzle_key] = str(0)


                    if(event['user'] not in userCumAttempts.keys()):
                        userCumAttempts[event['user']] = 0
                        actualAtt = 0
                        attemptsAux[event['user']] = dict()
                        timeCheckActual[event['user']] = 0

                    if(event['user'] not in userManipulationEvents.keys()):
                        #print("Se inicializa con ", event['user'])
                        userManipulationEvents[event['user']] = 0


                    #if(user_puzzle_key not in manipulationEvents.keys()):    
                    #    manipulationEvents[user_puzzle_key] = 0 
                    #    contManipulation = 0

                    if(task_id not in attemptsAux[event['user']].keys()): attemptsAux[event['user']][task_id]=0

                    user_puzzle_key = event['group'] + '~' + event['user'] + '~' + task_id# + '~' + str(n_attempts[prev_id])
                    if(user_puzzle_key not in prevReg.keys()): 

                        prevReg[user_puzzle_key] = 1
                        user_puzzle_key = event['group'] + '~' + event['user'] + '~' + task_id + '~' + '1'
                        n_attempts[user_puzzle_key] = 1
                        attemptsAux[event['user']][task_id] = n_attempts[user_puzzle_key]

                    else: 

                        user_puzzle_key = event['group'] + '~' + event['user'] + '~' + task_id + '~' + str(attemptsAux[event['user']][task_id])
                        n_attempts[user_puzzle_key] = attemptsAux[event['user']][task_id]


                    key_split = user_puzzle_key.split('~')
                    userParc = key_split[1]

                    if(user_puzzle_key not in idComplete.keys()): idComplete[user_puzzle_key] = 0


                    if(task_id not in attemptsAux[userParc].keys()): attemptsAux[userParc][task_id]=0
                    if(user_puzzle_key not in cumAttempts.keys()):
                        cumAttempts[user_puzzle_key] = 1


                    # initialize if the id is new                                                                              
                    if(user_puzzle_key not in puzzleEvents.keys()):

                        breaksPuzzle[user_puzzle_key] = 0
                        timestamp[user_puzzle_key] = 0
                        percentilAtt[user_puzzle_key] = percentilAttValue
                        percentilTime[user_puzzle_key] = percentilTimeValue
                        completados[user_puzzle_key] = 0                    
                        puzzleEvents[user_puzzle_key]= 1
                        timePuzzle[user_puzzle_key] = 0
                        contCheckSol[user_puzzle_key] = 0
                        manipulationEvents[user_puzzle_key] = 0
                        timeFirstCheck[user_puzzle_key] = 0

                        globalTypesEvents[user_puzzle_key] = dict()
                        for ev in typeEvents:
                            globalTypesEvents[user_puzzle_key][ev]= 0




                    #timestamp
                    if(event['type'] in 'ws-start_level'):

                        timestamp[user_puzzle_key] = event['time']
                        initialTime = timestamp[user_puzzle_key]

                # the event is not final event
                if(event['type'] not in ['ws-exit_to_menu' , 'ws-disconnect', 'ws-create_user', 'ws-login_user']): 
                        if (task_id == "Sandbox"):
                            continue


                        if(event['type'] in ['ws-puzzle_complete']): completados[user_puzzle_key] = 1

                        puzzleEvents[user_puzzle_key] += 1                                                                         

                        #calculate the duration of the event                                                                          
                        delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                        if((delta_seconds < theresHoldActivity)):
                            timePuzzle[user_puzzle_key] += delta_seconds

                        #breaks
                        if((delta_seconds > 15)):
                            breaksPuzzle[user_puzzle_key] += 1

                        previousEvent = event 

                        #update event counters by type
                        if(event['type'] in typeEvents):
                            globalTypesEvents[user_puzzle_key][event['type']] +=1

                        if(globalTypesEvents[user_puzzle_key]['ws-check_solution'] == 1): timeFirstCheck[user_puzzle_key] = event['time']


                        if(event['type'] in manipulationTypeEvents):
                            manipulationEvents[user_puzzle_key] +=1

                        if(event['type'] == 'ws-check_solution'):
                            timeCheckActual[event['user']] = event['time']
                            contCheckSol[user_puzzle_key] +=1


                # the puzzle ends        
                if(event['type'] in ['ws-exit_to_menu', 'ws-disconnect']):
                        if (task_id == "Sandbox"):
                            continue

                        idComplete[user_puzzle_key] = 1
                        puzzleEvents[user_puzzle_key] += 1


                        if(completados[user_puzzle_key] == 0 and globalTypesEvents[user_puzzle_key]['ws-check_solution'] > 0):
                            timeSubExit[user_puzzle_key] = str(round((event['time'] - timeFirstCheck[user_puzzle_key]).total_seconds(), 2))
                        else: timeSubExit[user_puzzle_key] = 'NA'  

                        if(globalTypesEvents[user_puzzle_key]['ws-check_solution'] == 0): timeBetweenSub[user_puzzle_key] = 'NA'      
                        else: timeBetweenSub[user_puzzle_key] = str(round(((timeCheckActual[event['user']] - timestamp[user_puzzle_key]) /globalTypesEvents[user_puzzle_key]['ws-check_solution']).total_seconds(), 2))


                        #calculate the duration of the event                                                                          
                        delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                        if((delta_seconds < theresHoldActivity)):
                            timePuzzle[user_puzzle_key] += delta_seconds

                        #breaks
                        if((delta_seconds > 15)):
                            breaksPuzzle[user_puzzle_key] += 1


                        previousEvent = event

                        userCumAttempts[userParc] +=1
                        n_attempts[user_puzzle_key] +=1
                        actualAtt+=1
                        cumAttempts[user_puzzle_key] = actualAtt
                        attemptsAux[userParc][task_id] = n_attempts[user_puzzle_key]

                        #manipulationEvents[user_puzzle_key] = userManipulationEvents[event['user']]


                        ###########


    userTime = dict()
    userAtt = dict()
    userEvent = dict()


    for i in puzzleEvents.keys():
        if(idComplete[i]==0): 
            continue
        key_split = i.split('~')
        if(key_split[1] not in userTime.keys()):
            userTime[i] = 0
            userAtt[i] = 0
            userEvent[i] = 0

        if(key_split[2] != ''):

            if(key_split[2] in allPuzzles): userAtt[i] = contCheckSol[i]

            if(key_split[2] in allPuzzles): userTime[i] = timePuzzle[i]

            if(key_split[2] in allPuzzles): userEvent[i] = puzzleEvents[i]    


    puzzleTime = dict()
    puzzleAtt = dict()  
    puzzleEvent = dict()

    for i in userTime.keys():
        #for puzzle in userTime[user]:
        key_split = i.split('~')
        if(key_split[2] not in puzzleTime.keys()):
            puzzleTime[key_split[2]] = []
            puzzleAtt[key_split[2]] = []
            puzzleEvent[key_split[2]] = []

        puzzleTime[key_split[2]].append(userTime[i])
        puzzleAtt[key_split[2]].append(userAtt[i])
        puzzleEvent[key_split[2]].append(userEvent[i])


    persistent = dict()
    percentileActiveTime = dict()
    percentileAtt = dict()
    percentileEvent = dict()
    percentileComposite = dict()
    averagePercentileComposite = dict()
    averagePercentilePartial = dict()

    difficultyNumber = dict()

    contNonPer = dict()
    totalNonPer = dict()
    contRapid = dict()
    totalRapid = dict()
    contUnpro = dict()
    totalUnpro = dict()
    contProduct = dict()
    totalProduct=dict()
    contNoBehavior = dict()
    totalNoBehavior = dict()
    persistantCumPerc = dict()

    cumDifficulty = dict()
    cumUserPercentage = dict()

    diffPercentage = dict()

    compositeUser = dict()


    for i in puzzleEvents.keys():
        if(idComplete[i]==0): 
            continue
        key_split = i.split('~')
        if(key_split[2] != ''):

            #difficulty
            difficultyNumber[i] = difficultyPuzzles[key_split[2]]
            if(i not in diffPercentage.keys()): diffPercentage[i] = 0

            if(key_split[1] not in contNonPer.keys()):
                contNonPer[key_split[1]] = 0
                totalNonPer[key_split[1]] =0
                contRapid[key_split[1]]=0
                totalRapid[key_split[1]]=0
                contUnpro[key_split[1]]=0
                totalUnpro[key_split[1]]=0
                contProduct[key_split[1]]=0
                totalProduct[key_split[1]]=0
                contNoBehavior[key_split[1]]=0
                totalNoBehavior[key_split[1]]=0
                cumDifficulty[key_split[1]]=0
                compositeUser[key_split[1]]= []
                cumUserPercentage[key_split[1]]=0

            percentileActiveTime[i] = stats.percentileofscore(puzzleTime[key_split[2]], userTime[i])
            percentileAtt[i] = stats.percentileofscore(puzzleAtt[key_split[2]], userAtt[i], kind='weak')
            percentileEvent[i] = stats.percentileofscore(puzzleEvent[key_split[2]], userEvent[i], kind='weak')
            percentileComposite[i] = (stats.percentileofscore(puzzleTime[key_split[2]], userTime[i], kind='weak') + stats.percentileofscore(puzzleAtt[key_split[2]], userAtt[i], kind='weak') + stats.percentileofscore(puzzleEvent[key_split[2]], userEvent[i], kind='weak')) / 3
            compositeUser[key_split[1]].append(percentileComposite[i])

            cumDifficulty[key_split[1]] = cumDifficulty[key_split[1]] + difficultyPuzzles[key_split[2]]
            cumUserPercentage[key_split[1]] = cumUserPercentage[key_split[1]] + (difficultyPuzzles[key_split[2]] * percentileComposite[i])
            diffPercentage[i] = cumUserPercentage[key_split[1]] / cumDifficulty[key_split[1]]

            if(key_split[1] not in averagePercentilePartial.keys()): averagePercentilePartial[key_split[1]]=0
            if(i not in averagePercentileComposite.keys()): averagePercentileComposite[i]=0

            if(cumAttempts[i] == 0): averagePercentileComposite[i] = averagePercentileComposite[i]     
            else: 

                averagePercentilePartial[key_split[1]] = averagePercentilePartial[key_split[1]] + percentileComposite[i]
                averagePercentileComposite[i] = averagePercentilePartial[key_split[1]] / cumAttempts[i]

            if(i not in persistent.keys()):
                persistent[i] = ''


            if(percentileComposite[i] < 25 and completados[i] == 0):
                persistent[i] = 'NON_PERSISTANT'
                contNonPer[key_split[1]] +=1

            if(percentileComposite[i] < 25 and completados[i] == 1):
                persistent[i] = 'RAPID_SOLVER'
                contRapid[key_split[1]]+=1

            if(percentileComposite[i] > 75 and completados[i] == 1):
                persistent[i] = 'PRODUCTIVE_PERSISTANCE'
                contProduct[key_split[1]]+=1

            if(percentileComposite[i] > 75 and completados[i] == 0):
                persistent[i] = 'UNPRODUCTIVE_PERSISTANCE'   
                contUnpro[key_split[1]]+=1

            if(percentileComposite[i] >= 25 and percentileComposite[i] <= 75):
                persistent[i] = 'NO_BEHAVIOR'  
                contNoBehavior[key_split[1]]+=1

            if(contNonPer[key_split[1]] == 0 or cumAttempts[i]==0): 
                totalNonPer[key_split[1]] =0
            else: 
                totalNonPer[key_split[1]] = 100 * (contNonPer[key_split[1]] / cumAttempts[i])

            if(contRapid[key_split[1]] == 0 or cumAttempts[i]==0): totalRapid[key_split[1]] =0
            else: totalRapid[key_split[1]] = 100 * (contRapid[key_split[1]] / cumAttempts[i])

            if(contProduct[key_split[1]] == 0 or cumAttempts[i]==0): contProduct[key_split[1]] =0
            else: totalProduct[key_split[1]] = 100 * (contProduct[key_split[1]] / cumAttempts[i])

            if(contUnpro[key_split[1]] == 0 or cumAttempts[i]==0): contUnpro[key_split[1]] =0
            else: totalUnpro[key_split[1]] = 100 * (contUnpro[key_split[1]] / cumAttempts[i])

            if(contNoBehavior[key_split[1]] == 0 or cumAttempts[i]==0): contNoBehavior[key_split[1]] =0
            else: totalNoBehavior[key_split[1]] = 100 * (contNoBehavior[key_split[1]] / cumAttempts[i])

            persistantCumPerc[i] = json.dumps({"NON_PERSISTANT ": round(totalNonPer[key_split[1]],2), "RAPID_SOLVER": round(totalRapid[key_split[1]],2), "PRODUCTIVE_PERSISTANCE": round(totalProduct[key_split[1]],2), "UNPRODUCTIVE_PERSISTANCE": round(totalUnpro[key_split[1]],2), "NO_BEHAVIOR": round(totalNoBehavior[key_split[1]],2) })




    resultPart = 0
    for i in puzzleEvents.keys():
        if(idComplete[i]==0): 
            continue
        key_split = i.split('~')
        if(key_split[2] != '' and key_split[1] != '' and i != ''):
            activity_by_user.at[i, 'user'] = key_split[1]
            activity_by_user.at[i, 'group'] = key_split[0]
            activity_by_user.at[i, 'task_id'] = key_split[2]            
            activity_by_user.at[i, 'n_events'] = puzzleEvents[i]
            activity_by_user.at[i, 'active_time'] = round(timePuzzle[i],2)
            activity_by_user.at[i, 'percentileAtt'] = round(percentileAtt[i],2)
            activity_by_user.at[i, 'percentileActiveTime'] = round(percentileActiveTime[i],2)
            activity_by_user.at[i, 'percentileEvents'] = round(percentileEvent[i],2)
            activity_by_user.at[i, 'percentileComposite'] = round(percentileComposite[i],2)
            activity_by_user.at[i, 'completed'] = completados[i]
            activity_by_user.at[i, 'puzzle_difficulty'] = difficultyNumber[i]
            activity_by_user.at[i, 'cum_global_puzzle_attempts'] = cumAttempts[i]
            activity_by_user.at[i, 'cum_this_puzzle_attempt'] = key_split[3]
            activity_by_user.at[i, 'cum_avg_perc_composite'] = round(averagePercentileComposite[i],2)
            activity_by_user.at[i, 'cum_avg_persistence'] = persistantCumPerc[i]
            activity_by_user.at[i, 'timestamp'] = timestamp[i]
            activity_by_user.at[i, 'persistence'] = persistent[i]
            activity_by_user.at[i, 'n_breaks'] = breaksPuzzle[i]
            activity_by_user.at[i, 'n_manipulation_events'] = manipulationEvents[i]
            activity_by_user.at[i, 'cum_weighted_difficulty_perc_composite'] = round(diffPercentage[i],2)
            resultPart = stats.percentileofscore(compositeUser[key_split[1]], percentileComposite[i])
            activity_by_user.at[i, 'percentileCompositeAcrossAttempts'] = round(resultPart,2)
            if(resultPart >= 75): activity_by_user.at[i, 'persistenceAcrossAttempts'] = 'MORE_PERSISTANCE_THAN_NORMAL'
            if(resultPart < 75 and resultPart>25): activity_by_user.at[i, 'persistenceAcrossAttempts'] = 'NORMAL_PERSISTANCE'   
            if(resultPart <= 25): activity_by_user.at[i, 'persistenceAcrossAttempts'] = 'LESS_PERSISTANCE_THAN_NORMAL'            
            activity_by_user.at[i, 'time_failed_submission_exit'] = timeSubExit[i]
            activity_by_user.at[i, 'avg_time_between_submissions'] = timeBetweenSub[i]
            activity_by_user.at[i, 'n_check_solution'] = globalTypesEvents[i]['ws-check_solution']
            activity_by_user.at[i, 'n_snapshot'] = globalTypesEvents[i]['ws-snapshot']
            activity_by_user.at[i, 'n_rotate_view'] = globalTypesEvents[i]['ws-rotate_view']

    #delete row with NaN
    activity_by_user.dropna(subset = ['user'], inplace=True)


    #data output preparation                                                                                          
    activity_by_user = pd.DataFrame(activity_by_user, columns=['group', 'user','task_id','puzzle_difficulty' ,'completed','timestamp', 'active_time','percentileActiveTime','n_events','percentileEvents', 'n_check_solution','percentileAtt','percentileComposite' ,'persistence','n_breaks','n_snapshot','n_rotate_view','n_manipulation_events','time_failed_submission_exit','avg_time_between_submissions','cum_weighted_difficulty_perc_composite','percentileCompositeAcrossAttempts','persistenceAcrossAttempts','cum_global_puzzle_attempts','cum_this_puzzle_attempt','cum_avg_perc_composite', 'cum_avg_persistence'])

    return activity_by_user.to_json()

# TODO: where is the best place to put this?
@app.task
def getPuzzleDifficulty(group = 'all'):
    return json.dumps(difficultyPuzzles)

@app.task
def computePersistenceByPuzzle(group = 'all'):
    if group == 'all' : 
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


    # the data is grouped by the necessary variables      
    activity_by_user = dataEvents.groupby(['group_user_id']).agg({'id':'count',
                                                 'type':'nunique'}).reset_index().rename(columns={'id':'events',
                                                                                                  'type':'different_events'}) 

    dataEvents = dataEvents.sort_values('time')

    # Events type structures
    typeEvents = ['ws-snapshot','ws-paint', 'ws-rotate_view','ws-move_shape','ws-rotate_shape' ,'ws-scale_shape','ws-create_shape','ws-delete_shape','ws-undo_action','ws-redo_action', 'ws-check_solution']
    manipulationTypeEvents = ['ws-move_shape','ws-rotate_shape' ,'ws-scale_shape','ws-create_shape','ws-delete_shape']

    # Initialize type events structure
    for event in typeEvents:
        activity_by_user[event] = 0
        
        
    # Initialize the data structures 
    puzzleEvents = dict()
    timePuzzle = dict()
    globalTypesEvents = dict()
    n_attempts = dict()
    completed = dict()
    timestamp = dict() 

    breaksPuzzle = dict()
    contCheckSol = dict()

    manipulationEvents = dict()
    timeFirstCheck = dict()
    timeSubExit = dict()
    timeCheckActual = dict()
    timeBetweenSub = dict()
    
    avgTime_start_check = dict()
    differentDays = dict()
    lastDay = dict()
    
    checkSolProd = dict()
    timePuzzleProd = dict()
    puzzleEventsProd = dict()
    
    categoryPuzz = dict()
    userDissconect = dict()
    
    for user in dataEvents['group_user_id'].unique():

        # Computing active time
        previousEvent = None
        theresHoldActivity = 60 # np.percentile(allDifferences, 98) is 10 seconds
        activeTime = []

        user_events = dataEvents[dataEvents['group_user_id'] == user]
        user_puzzle_key = None
        #userParc = None
        task_id = None
        initialTime = None
        #prev_id = 1  
        
        for enum, event in user_events.iterrows():

            # If it is the first event
            if(previousEvent is None):
                previousEvent = event
                continue
                    
            if( event['type'] in ['ws-start_level', 'ws-puzzle_started'] ):

                task_id = json.loads(event['data'])['task_id']
                if(task_id == "Sandbox"): continue

                # ID
                user_puzzle_key = event['group'] + '~' + event['user'] + '~' + task_id                
                key_split = user_puzzle_key.split('~')  

                # Continue if the user has completed the puzzle
                if(user_puzzle_key not in completed.keys()): completed[user_puzzle_key] = 0
                if(completed[user_puzzle_key] == 1): continue

                # Initialize data structures
                if(event['type'] == 'ws-puzzle_started'):
                    if(user_puzzle_key not in n_attempts.keys()): 
                        n_attempts[user_puzzle_key] = 0
                    #else: n_attempts[user_puzzle_key] +=1    
                if(user_puzzle_key not in timeSubExit.keys()):
                    timeSubExit[user_puzzle_key] = str(0)
                    timeBetweenSub[user_puzzle_key] = str(0)  


                # initialize if the id is new                                                                              
                if(user_puzzle_key not in puzzleEvents.keys()):

                    breaksPuzzle[user_puzzle_key] = 0
                    categoryPuzz[user_puzzle_key] = ''
                    puzzleEvents[user_puzzle_key]= 1
                    timePuzzle[user_puzzle_key] = 0
                    contCheckSol[user_puzzle_key] = 0
                    manipulationEvents[user_puzzle_key] = 0
                    timeFirstCheck[user_puzzle_key] = 0
                    userDissconect[user_puzzle_key] = 0

                    globalTypesEvents[user_puzzle_key] = dict()
                    for ev in typeEvents:
                        globalTypesEvents[user_puzzle_key][ev]= 0

                # Category puzzle
                if(task_id in tutorialPuzzles):
                    categoryPuzz[user_puzzle_key] = 'Tutorial'
                elif(task_id in advancedPuzzles): 
                    categoryPuzz[user_puzzle_key] = 'Advanced'
                else: categoryPuzz[user_puzzle_key] = 'Intermediate'   

                #timestamp
                if(event['type'] in 'ws-puzzle_started'): 
                    timestamp[user_puzzle_key] = event['time']
                    initialTime = timestamp[user_puzzle_key]    


            # the event is not final event
            if(event['type'] not in ['ws-exit_to_menu' , 'ws-puzzle_complete', 'ws-disconnect', 'ws-create_user', 'ws-login_user']): 
                if(user_puzzle_key in completed.keys() and completed[user_puzzle_key] != 1):

                    
                    #Different days
                    date = str(event['time']).split('-')
                    day = date[2].split(" ")
                    if(event['type'] in ['ws-check_solution', 'w-snapshot']):
                        if(user not in lastDay.keys()): lastDay[user] = str(0)
                        if(lastDay[user] != date[1]+'~'+day[0]):
                            lastDay[user] = date[1]+'~'+day[0]
                            if(user not in differentDays.keys()): differentDays[user] = 1
                            else: differentDays[user] += 1

                    # Cont the event
                    puzzleEvents[user_puzzle_key] += 1                                                                         

                    #Calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds

                    #Breaks
                    if((delta_seconds > 15)):
                        breaksPuzzle[user_puzzle_key] += 1

                    previousEvent = event 

                    #Update event counters by type
                    if(event['type'] in typeEvents):
                        globalTypesEvents[user_puzzle_key][event['type']] +=1

                    # Time the first check
                    if(globalTypesEvents[user_puzzle_key]['ws-check_solution'] == 1): timeFirstCheck[user_puzzle_key] = event['time']

                    # Update the manipulation events counter
                    if(event['type'] in manipulationTypeEvents):
                        manipulationEvents[user_puzzle_key] +=1

                    # Time check solution
                    if(event['type'] == 'ws-check_solution'):
                        timeCheckActual[user_puzzle_key] = event['time']
                        contCheckSol[user_puzzle_key] +=1
                        if(user_puzzle_key not in avgTime_start_check.keys()): avgTime_start_check[user_puzzle_key] = 0
                        else: avgTime_start_check[user_puzzle_key] += (timeCheckActual[user_puzzle_key] - timestamp[user_puzzle_key]).total_seconds()


            # the puzzle ends        
            if(event['type'] in ['ws-exit_to_menu', 'ws-puzzle_complete', 'ws-disconnect'] ):
                if(user_puzzle_key in completed.keys() and completed[user_puzzle_key] != 1):
                    n_attempts[user_puzzle_key] +=1
                    puzzleEvents[user_puzzle_key] += 1
                    userDissconect[user_puzzle_key] = 1

                    # To complete events, time and attempts    
                    if(event['type'] in ['ws-puzzle_complete']):     
                        sep = user_puzzle_key.split('~')
                        if(sep[2] not in 'Sandbox'):
                            checkSolProd[user_puzzle_key] = contCheckSol[user_puzzle_key]
                            timePuzzleProd[user_puzzle_key] = timePuzzle[user_puzzle_key]  
                            puzzleEventsProd[user_puzzle_key] = puzzleEvents[user_puzzle_key] 

                        completed[user_puzzle_key] = 1        

                    # Calculate average time between submits and time between submit and exit
                    if(completed[user_puzzle_key] == 0 and globalTypesEvents[user_puzzle_key]['ws-check_solution'] > 0):
                        timeSubExit[user_puzzle_key] = str(round((event['time'] - timeFirstCheck[user_puzzle_key]).total_seconds(), 2))
                    else: timeSubExit[user_puzzle_key] = 'NA'  

                    if((globalTypesEvents[user_puzzle_key]['ws-check_solution'] == 0) or (avgTime_start_check[user_puzzle_key]==0)): timeBetweenSub[user_puzzle_key] = 'NA'      
                    else: timeBetweenSub[user_puzzle_key] = str(round(avgTime_start_check[user_puzzle_key] /globalTypesEvents[user_puzzle_key]['ws-check_solution'], 2))


                    #Calculate the duration of the event                                                                          
                    delta_seconds = (event['time'] - previousEvent['time']).total_seconds()
                    if((delta_seconds < theresHoldActivity)):
                        timePuzzle[user_puzzle_key] += delta_seconds

                    #Breaks
                    if((delta_seconds > 15)):
                        breaksPuzzle[user_puzzle_key] += 1

                    previousEvent = event


    userTime = dict()
    userAtt = dict()
    userEvent = dict()
    
    userTimeProd = dict()
    userAttProd = dict()
    userEventProd = dict()
    
    # Save attempts, time and events productive and inproductive
    for i in puzzleEvents.keys():

        if(userDissconect[i] != 1): 
            n_attempts[i] += 1
        
        key_split = i.split('~')
        if(key_split[1] not in userTime.keys()):
            userTime[i] = 0
            userAtt[i] = 0
            userEvent[i] = 0
                
        if(key_split[2] != ''):

            if(key_split[2] in allPuzzles): 
                userAtt[i] = contCheckSol[i]
                
                if(i in checkSolProd.keys()):
                    userAttProd[i] = checkSolProd[i]

            if(key_split[2] in allPuzzles): 
                
                userTime[i] = timePuzzle[i]
                if(i in timePuzzleProd.keys()):
                    userTimeProd[i] = timePuzzleProd[i]

            if(key_split[2] in allPuzzles): 
                
                userEvent[i] = puzzleEvents[i] 
                if(i in puzzleEventsProd.keys()):
                    userEventProd[i] = puzzleEventsProd[i]


    puzzleTime = dict()
    puzzleAtt = dict()  
    puzzleEvent = dict()
    
    puzzleTimeProd = dict()
    puzzleAttProd = dict()  
    puzzleEventProd = dict()
    
    # Save the attempts, events and time per puzzle for the distribution (productive and unproductive)
    for i in userTime.keys():
        
        key_split = i.split('~')
        if(key_split[2] not in allPuzzles): continue
        if(key_split[2] not in puzzleTime.keys()):
            puzzleTime[key_split[2]] = []
            puzzleAtt[key_split[2]] = []
            puzzleEvent[key_split[2]] = []
            
        if(key_split[2] not in puzzleTimeProd.keys()):
            puzzleTimeProd[key_split[2]] = []
            puzzleAttProd[key_split[2]] = []
            puzzleEventProd[key_split[2]] = []    

        puzzleTime[key_split[2]].append(userTime[i])
        puzzleAtt[key_split[2]].append(userAtt[i])
        puzzleEvent[key_split[2]].append(userEvent[i])
        
        if(i in userTimeProd.keys()):
            puzzleTimeProd[key_split[2]].append(userTimeProd[i])
            puzzleAttProd[key_split[2]].append(userAttProd[i])
            puzzleEventProd[key_split[2]].append(userEventProd[i])


    difficultyNumber = dict()
    persistent = dict()
    
    percentileActiveTime = dict()
    percentileAtt = dict()
    percentileEvent = dict()
    
    percentileActiveTimeProd = dict()
    percentileAttProd = dict()
    percentileEventProd = dict()
    
    percentileCompositeProd = dict()
    averagePercentileComposite = dict()
    averagePercentilePartial = dict()

    compositeUserProd = dict()


    for i in puzzleEvents.keys():
        
        key_split = i.split('~')
        if(key_split[2] not in ['', 'Sandbox']):

            # Difficulty puzzle
            difficultyNumber[i] = difficultyPuzzles[key_split[2]]

            if(key_split[1] not in compositeUserProd.keys()):
                compositeUserProd[key_split[1]]= []
            
            # General percentile
            percentileActiveTime[i] = stats.percentileofscore(puzzleTime[key_split[2]], userTime[i])
            percentileAtt[i] = stats.percentileofscore(puzzleAtt[key_split[2]], userAtt[i], kind='weak')
            percentileEvent[i] = stats.percentileofscore(puzzleEvent[key_split[2]], userEvent[i], kind='weak')
            
            # Productive percentile
            percentileActiveTimeProd[i] = stats.percentileofscore(puzzleTimeProd[key_split[2]], userTime[i])
            percentileAttProd[i] = stats.percentileofscore(puzzleAttProd[key_split[2]], userAtt[i], kind='weak')
            percentileEventProd[i] = stats.percentileofscore(puzzleEventProd[key_split[2]], userEvent[i], kind='weak')
            #percentileCompositeProd[i] = (stats.percentileofscore(puzzleTimeProd[key_split[2]], userTime[i], kind='weak') + stats.percentileofscore(puzzleEventProd[key_split[2]], userEvent[i], kind='weak')) / 2
            percentileCompositeProd[i] = (percentileActiveTimeProd[i] + percentileEventProd[i]) / 2
            #percentileCompositeProd[i] = (stats.percentileofscore(puzzleTimeProd[key_split[2]], userTime[i], kind='weak') + stats.percentileofscore(puzzleAttProd[key_split[2]], userAtt[i], kind='weak') + stats.percentileofscore(puzzleEventProd[key_split[2]], userEvent[i], kind='weak')) / 3
            compositeUserProd[key_split[1]].append(percentileCompositeProd[i])

            # Initialize persistent structure
            if(i not in persistent.keys()):
                persistent[i] = ''

            # Persistent labels
            if(percentileCompositeProd[i] < 5 and completed[i] == 0):
                persistent[i] = 'NON_PERSISTANT'
                
            
            if(percentileCompositeProd[i] < 25 and completed[i] == 1):
                persistent[i] = 'RAPID_SOLVER'
                

            if(percentileCompositeProd[i] > 75 and completed[i] == 1):
                persistent[i] = 'PRODUCTIVE_PERSISTANCE'
                

            if(percentileCompositeProd[i] > 90 and completed[i] == 0):
                persistent[i] = 'UNPRODUCTIVE_PERSISTANCE'   
                

            if(persistent[i] == ''):
                persistent[i] = 'NO_BEHAVIOR'  
 
    resultPart = 0
    for i in puzzleEvents.keys():

        key_split = i.split('~')
        if(key_split[2] not in ['', 'Sandbox'] and key_split[1] != '' and i != ''):
            activity_by_user.at[i, 'user'] = key_split[1]
            activity_by_user.at[i, 'group'] = key_split[0]
            activity_by_user.at[i, 'task_id'] = key_split[2]            
            activity_by_user.at[i, 'n_events'] = puzzleEvents[i]
            activity_by_user.at[i, 'active_time'] = round(timePuzzle[i],2)
            activity_by_user.at[i, 'percentileAtt'] = round(percentileAttProd[i],2)
            activity_by_user.at[i, 'percentileActiveTime'] = round(percentileActiveTimeProd[i],2)
            activity_by_user.at[i, 'percentileEvents'] = round(percentileEventProd[i],2)
            activity_by_user.at[i, 'percentileComposite'] = round(percentileCompositeProd[i],2)
            activity_by_user.at[i, 'completed'] = completed[i]
            activity_by_user.at[i, 'puzzle_difficulty'] = difficultyNumber[i]
            activity_by_user.at[i, 'puzzle_category'] = categoryPuzz[i]
            activity_by_user.at[i, 'n_attempts'] = n_attempts[i]
            activity_by_user.at[i, 'timestamp'] = timestamp[i]
            activity_by_user.at[i, 'persistence'] = persistent[i]
            activity_by_user.at[i, 'n_breaks'] = breaksPuzzle[i]
            activity_by_user.at[i, 'n_manipulation_events'] = manipulationEvents[i]           
            activity_by_user.at[i, 'time_failed_submission_exit'] = timeSubExit[i]
            activity_by_user.at[i, 'avg_time_between_submissions'] = timeBetweenSub[i]
            activity_by_user.at[i, 'n_check_solution'] = globalTypesEvents[i]['ws-check_solution']
            activity_by_user.at[i, 'n_snapshot'] = globalTypesEvents[i]['ws-snapshot']
            activity_by_user.at[i, 'n_rotate_view'] = globalTypesEvents[i]['ws-rotate_view']

    #delete row with NaN
    activity_by_user.dropna(subset = ['user'], inplace=True)


    #data output preparation                                                                                          
    activity_by_user = pd.DataFrame(activity_by_user, columns=['group', 'user','task_id','puzzle_difficulty' ,'puzzle_category','n_attempts','completed','timestamp', 'active_time','percentileActiveTime','n_events','percentileEvents', 'n_check_solution','percentileAtt','percentileComposite' ,'persistence','n_breaks','n_snapshot','n_rotate_view','n_manipulation_events','time_failed_submission_exit','avg_time_between_submissions',])

    return activity_by_user.to_json()

@app.task
def computeELO(group = 'all'):
    if group == 'all' : 
        toFilter = all_data_collection_urls
    else:
        toFilter = group
        
    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)

    totalData, train_set, test_set = adaptedData(dataEvents, group=group)
    competency_ELO, difficulty_ELO = run(1.8, 0.05, 'standard', totalData, train_set, test_set)
    return "{\"difficulty_ELO\": " + difficulty_ELO.to_json() + ", \"competency_ELO\": " + competency_ELO.to_json() + "}"

@app.task
def computeMisconceptions(group='all'):
    if group == 'all' : 
        toFilter = all_data_collection_urls
    else:
        toFilter = group
        
    urls = URL.objects.filter(name__in=toFilter)
    sessions = CustomSession.objects.filter(url__in=urls)
    qs = Event.objects.filter(session__in=sessions)
    dataEvents = read_frame(qs)
    
    df1 = sequenceWithinPuzzlesForMisconceptions(dataEvents)
    df2 = tagMisconceptions(df1)
    return df2.to_json()

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

@app.task
def msg(arg):
    print(arg)

@app.task
def process_tasks_for_flagged_urls():
    tasks = [computeFunnelByPuzzle, sequenceBetweenPuzzles, computeLevelsOfActivity]
    print('Checking for URLs to process')
    urls = URL.objects.filter(process=True)
    for url in urls:
        url.process = False
        url.save()
        print("URL " + url.name + " flagged for processing")
        for task in tasks:
            try:
                result = process_task(task, [url.name])
                print("task finished with state: " + result.state)
            except:
                print("FAILED TASK")
            


@app.on_after_finalize.connect
def process_task_beat(sender, **kwargs):
    # Tries to auto_process_tasks every 10 seconds.
    sender.add_periodic_task(10.0, process_tasks_for_flagged_urls.s(), name="processed_flagged_urls")

@app.task
def event_waterfall():
    last_event = Event.objects.using('default').last()
    new_events_production = Event.objects.using('production').filter(pk__gt=last_event.pk)
    for event in new_events_production:
        event.save(using='default')

@app.on_after_finalize.connect
def event_waterfall_beat(sender, **kwargs):
    sender.add_periodic_task(10.0, event_waterfall.s(), name="event_waterfall")

@app.task
def generate_all_replays():
    urls = URL.objects.all()
    for url in urls:
        players = Player.objects.filter(url=url)
        for player in players:
            text = ""
            player_events = Event.objects.none()
            for session in player.customsession_set.all():
                session_events = Event.objects.filter(session=session)
                # Here | is the set union operator, not bitwise OR. Thanks, Django.
                player_events = player_events | session_events
            start_events = []
            end_events = []
            for event in player_events.values():
                text += (str(event) + '\n')
                if 'ws-start_level' in event['type']:
                    start_events.append(event['id'])
                if 'ws-exit_to_menu' in event['type'] or 'ws-disconnect' in event['type']:
                    end_events.append(event['id'])
            # print(start_events)
            events = start_events + end_events
            events.sort()
            if events is not None:
                for index, event in enumerate(events):
                    if index < len(events) - 1:
                        if events[index] in start_events and events[index + 1] in end_events:
                            print(events[index])
                            replay_start_time = Event.objects.get(pk=events[index]).time
                            generic_replay = {"events": [], }
                            level_name = 'no level name found'
                            for event in player_events.values():
                                if events[index] <= event['id'] <= events[index + 1]:
                                    generic_replay["events"].append(event)
                                    # Check to see if there's a level name in the event
                                    data_json = json.loads(event['data'])
                                    if 'task_id' in data_json:
                                        level_name = data_json['task_id']
                            event_range = [events[index], events[index + 1]]
                            print(event_range)
                            replay_obj, created = Replay.objects.get_or_create(
                                event_range=event_range,
                                player=player,
                                url=url,
                                level=Level.objects.get(filename=level_name)
                            )
                            replay_obj.replay_start_time = replay_start_time
                            replay_obj.replay = json.dumps(generic_replay, cls=DjangoJSONEncoder)
                            if not created:
                                replay_obj.last_updated = timezone.now()
                            replay_obj.save()
