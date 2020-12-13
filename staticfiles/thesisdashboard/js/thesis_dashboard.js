import { callAPI } from '../../dashboard/js/util/helpers.js'
import { API, SANDBOX_PUZZLE_NAME } from '../../dashboard/js/util/constants.js'

import { blockDefinitions, setBlockCodeGeneration } from '../blockly/block-def.js'
import * as filter from './filter.js'

import * as util from './helpers.js'
import * as overviewTab from './overview.js'
import * as studentTab from './students.js'
import * as puzzleTab from './puzzles.js'
import * as alertsTab from './alerts.js'
import * as filterSettingsTab from './filter-settings.js'

var playerMap = null
var puzzleData = null
var puzzleKeys = null
var puzzleDifficultyData = null
var levelsOfActivityData = null
var persistenceData = null
var completedPuzzleDataNoSandbox = null
var attemptedPuzzleDataNoSandbox = null
var insightsData = null

var alertsByAlert = {}
var alertsByStudent = {}

const filters = {}
const puzzleStats = {}
const puzzleList = []

// TODO: preset filter blocks? 
// TODO: add symbols and new block for filter types
// TODO: compare students with whole class? compare with distributions?
// TODO: use Grace's misconceptions doc as prototype for recommendations to users
// TODO: add in new persistence task and data
// TODO: fix graphs only loading when tab/page is active

export function getFilter(filterName) {
    return filters[filterName]
}

export function setFilter(filterName, filter) {
    filters[filterName] = filter
}

export function removeFilter(filterName) {
    delete filters[filterName]
}

export function getFilterKeys() {
    return Object.keys(filters)
}

function initializeBlocklyCode() {
    Blockly.defineBlocksWithJsonArray(blockDefinitions)
    setBlockCodeGeneration()
}

export function reinitializeTableSort() {
    $('table').tablesort()
    // Sort by dates in YYYY-MM-DD format
    for (let column of Object.keys(util.COLUMN_SORTBY)) {
        $('thead th.' + column).data('sortBy', util.COLUMN_SORTBY[column])
    }
}

function initializeSemanticComponents() {
    $('.menu .item').tab()
    $('.ui.checkbox').checkbox()
    reinitializeTableSort()
}


// TODO: eventually replace with actual account storage
function fetchSavedFiltersOnLoad() {
    try {
        const tempWorkspace = Blockly.inject('blockly-temp-container', { toolbox: document.getElementById('toolbox') })
        for (var i = 0; i < window.localStorage.length; i++) {
            const filterName = window.localStorage.key(i)
            const xmlString = window.localStorage.getItem(filterName)
            const xml = Blockly.Xml.textToDom(xmlString)
            Blockly.Xml.domToWorkspace(xml, tempWorkspace)
            const filter = Blockly.JavaScript.workspaceToCode(tempWorkspace)
            filters[filterName] = JSON.parse(filter)
            tempWorkspace.clear()
        }
        tempWorkspace.dispose()
    } catch (e) {
        alert("Unable to retrieve all of the previously saved filters.")
        console.error(e)
    }
}

function findStudentsWithAlerts() {
    const alerts = {}
    for (let filterName of getFilterKeys()) {
        const filter = getFilter(filterName)
        if (filter.type === "alert") {
            alerts[filterName] = filter
        }
    }
    const flaggedStudents = filter.retrieveSelectedStudents(Object.keys(playerMap), alerts)
    
    alertsByStudent = flaggedStudents
    alertsByAlert = {}
    for (let student of Object.keys(flaggedStudents)) {
        for (let alert of flaggedStudents[student]) {
            if (!(alert in alertsByAlert)) {
                alertsByAlert[alert] = [student]
            } else {
                alertsByAlert[alert].push(student)
            }
        }
    }
}

export function getAlertsByAlert() {
    return alertsByAlert
}

export function getAlertsByStudent() {
    return alertsByStudent
}

// function addToPuzzleStats(statKey, student, puzzleData) {
//     for (let puzzle of puzzleData) {
//         if (!(statKey in puzzleStats[puzzle])) {
//             puzzleStats[puzzle][statKey] = 1
//             continue
//         }
//         puzzleStats[puzzle][statKey] += 1
//     }
// }

function addToPuzzleStats(statKey, student, puzzleData) {
    for (let puzzle of puzzleData) {
        if (!(statKey in puzzleStats[puzzle])) {
            puzzleStats[puzzle][statKey] = new Set([student])
            continue
        }
        puzzleStats[puzzle][statKey].add(student)
    }
}

function addCalculationToPuzzleStats(statKey, calculationFunction) {
    for (let puzzle of Object.keys(puzzleStats)) {
        puzzleStats[puzzle][statKey] = calculationFunction(puzzleStats[puzzle])
    }
}

async function startDashboard() {
    playerMap = await callAPI(`${API}/players`)
    puzzleData = await callAPI(`${API}/puzzles`)

    for (let category of Object.keys(puzzleData.puzzles)) {
        for (let puzzle of puzzleData.puzzles[category]) {
            puzzleList.push(puzzle)
            puzzleStats[puzzle] = {'category': category}
        }
    }

    levelsOfActivityData = await callAPI(`${API}/levelsofactivity`)
    persistenceData = await callAPI(`${API}/persistence`)
    insightsData = await callAPI(`${API}/insights`)
    puzzleDifficultyData = await callAPI(`${API}/difficulty`)

    for (let puzzle of Object.keys(puzzleStats)) {
        puzzleStats[puzzle]["difficulty"] = puzzleDifficultyData[puzzle]
    }
    
    const rawCompletedData = await callAPI(`${API}/completed`)
    // completedPuzzleData = {}
    completedPuzzleDataNoSandbox = {}
    for (let student of Object.keys(rawCompletedData)) {
        // completedPuzzleData[student] = new Set(rawCompletedData[student])
        completedPuzzleDataNoSandbox[student] = new Set(rawCompletedData[student])
        completedPuzzleDataNoSandbox[student].delete(SANDBOX_PUZZLE_NAME)
        addToPuzzleStats("completed", student, completedPuzzleDataNoSandbox[student])
    }

    const rawAttemptedData = await callAPI(`${API}/attempted`)
    // attemptedPuzzleData = {}
    attemptedPuzzleDataNoSandbox = {}
    for (let student of Object.keys(rawCompletedData)) {
        // attemptedPuzzleData[student] = new Set(rawAttemptedData[student])
        attemptedPuzzleDataNoSandbox[student] = new Set(rawAttemptedData[student])
        attemptedPuzzleDataNoSandbox[student].delete(SANDBOX_PUZZLE_NAME)
        addToPuzzleStats("attempted", student, attemptedPuzzleDataNoSandbox[student])
    }

    addCalculationToPuzzleStats("completed_v_attempted", (stats) => stats["completed"].size / stats["attempted"].size)

    puzzleKeys = await callAPI(`${API}/puzzlekeys`)
    // TODO: add loader and display stuff
}

$(document).ready(function() {
    startDashboard().then(success => {
        initializeBlocklyCode()
        fetchSavedFiltersOnLoad()
        filter.setFilterModuleData(levelsOfActivityData, persistenceData)
        findStudentsWithAlerts()

        overviewTab.initializeTab(playerMap, puzzleDifficultyData, levelsOfActivityData, completedPuzzleDataNoSandbox, attemptedPuzzleDataNoSandbox, insightsData)
        studentTab.initializeTab(playerMap, puzzleList, puzzleKeys, puzzleStats, persistenceData, levelsOfActivityData, completedPuzzleDataNoSandbox, attemptedPuzzleDataNoSandbox)
        puzzleTab.initializeTab(playerMap, puzzleList, puzzleStats, levelsOfActivityData, completedPuzzleDataNoSandbox, attemptedPuzzleDataNoSandbox)
        alertsTab.initializeTab(playerMap)
        filterSettingsTab.initializeTab()

        initializeSemanticComponents()
    })
})