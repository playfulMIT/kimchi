import { TABS, API, SANDBOX_PUZZLE_NAME } from './util/constants.js'
import { callAPI } from './util/helpers.js'
import { showMetricsOverview } from './pages/metrics-overview.js'
import { showPuzzleRadarCharts } from './pages/puzzle-radar-charts.js'
import { showStudentRadarCharts } from './pages/student-radar-charts.js'
import { showOutlierRadarCharts } from './pages/outlier-radar-charts.js'
import { showSequenceBetweenPuzzlesNetwork } from './pages/sequence-between-puzzles-network.js'
import { showMachineLearningOutliers } from './pages/machine-learning-outliers.js'
import { showPortal } from './pages/portal.js'

var activeTab = null
var playerMap = null 
var numPlayers = 0
var puzzleData = null
var levelsOfActivity = null
var completedPuzzleData = null
var completedPuzzleDataNoSandbox  = null
var attemptedPuzzleData = null
var attemptedPuzzleDataNoSandbox = null
var sequenceBetweenPuzzles = null
var outlierData = null
var persistenceData = null

function handleTabSwitch(tab) {
    if (activeTab === tab) return 
    
    activeTab = tab
    switch (activeTab) {
        case TABS.METRICS:
            showMetricsOverview(playerMap, numPlayers, puzzleData)
            break
        case TABS.PUZZLE_RADAR_CHART:
            showPuzzleRadarCharts(playerMap, puzzleData, levelsOfActivity)
            break
        case TABS.STUDENT_RADAR_CHART:
            showStudentRadarCharts(playerMap, puzzleData, levelsOfActivity)
            break
        case TABS.OUTLIER_RADAR_CHART:
            showOutlierRadarCharts(playerMap, puzzleData, levelsOfActivity, completedPuzzleData)
            break
        case TABS.PUZZLE_SEQ_NETWORK:
            showSequenceBetweenPuzzlesNetwork(playerMap, puzzleData, sequenceBetweenPuzzles, levelsOfActivity)
            break
        case TABS.ML_OUTLIERS:
            showMachineLearningOutliers(playerMap, puzzleData, outlierData, levelsOfActivity, completedPuzzleData)
            break
        case TABS.PORTAL:
            showPortal(playerMap, puzzleData, persistenceData, completedPuzzleDataNoSandbox, attemptedPuzzleDataNoSandbox, levelsOfActivity)
            break
    }
}

async function startDashboard() {
    // TODO: move the rest of the API calls here
    playerMap = await callAPI(`${API}/players`)
    numPlayers = Object.keys(playerMap).length
    puzzleData = await callAPI(`${API}/puzzles`)
    levelsOfActivity = await callAPI(`${API}/levelsofactivity`)
    sequenceBetweenPuzzles = await callAPI(`${API}/sequencebetweenpuzzles`)
    outlierData = await callAPI(`${API}/mloutliers`)

    const rawCompletedData = await callAPI(`${API}/completed`)
    completedPuzzleData = {}
    completedPuzzleDataNoSandbox = {}
    for (let student of Object.keys(rawCompletedData)) {
        completedPuzzleData[student] = new Set(rawCompletedData[student])
        completedPuzzleDataNoSandbox[student] = completedPuzzleData[student] 
        completedPuzzleDataNoSandbox[student].delete(SANDBOX_PUZZLE_NAME)
    }

    const rawAttemptedData = await callAPI(`${API}/attempted`)
    attemptedPuzzleData = {}
    attemptedPuzzleDataNoSandbox = {}
    for (let student of Object.keys(rawCompletedData)) {
        attemptedPuzzleData[student] = new Set(rawAttemptedData[student])
        attemptedPuzzleDataNoSandbox[student] = attemptedPuzzleData[student]
        attemptedPuzzleDataNoSandbox[student].delete(SANDBOX_PUZZLE_NAME)
    }

    persistenceData = await callAPI(`${API}/persistence`)
    handleTabSwitch(TABS.PORTAL)
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-puzzle-radar").click(() => handleTabSwitch(TABS.PUZZLE_RADAR_CHART))
    $("#nav-student-radar").click(() => handleTabSwitch(TABS.STUDENT_RADAR_CHART))
    $("#nav-outlier-radar").click(() => handleTabSwitch(TABS.OUTLIER_RADAR_CHART))
    $("#nav-puzzle-network").click(() => handleTabSwitch(TABS.PUZZLE_SEQ_NETWORK))
    $("#nav-ml-outliers").click(() => handleTabSwitch(TABS.ML_OUTLIERS))
    $("#nav-portal").click(() => handleTabSwitch(TABS.PORTAL))

    startDashboard()
})