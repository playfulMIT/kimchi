import { TABS, API } from './constants.js'
import { callAPI } from './helpers.js'
import { showMetricsOverview } from './metrics-overview.js'
import { showPuzzleRadarCharts } from './puzzle-radar-charts.js'
import { showStudentRadarCharts } from './student-radar-charts.js'
import { showOutlierRadarCharts } from './outlier-radar-charts.js'
import { showSequenceBetweenPuzzlesNetwork } from './sequence-between-puzzles-network.js'
import { showMachineLearningOutliers } from './machine-learning-outliers.js';
// import { output } from './output.js'
// import { output2 } from './output2.js'

var activeTab = null
var playerMap = null 
var numPlayers = 0
var puzzleData = null
var levelsOfActivity = null
var completedPuzzleData = null
var sequenceBetweenPuzzles = null
var outlierData = null

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
            showMachineLearningOutliers(playerMap, puzzleData, outlierData, completedPuzzleData)
            break
    }
}

async function startDashboard() {
    // TODO: move the rest of the API calls here
    playerMap = await callAPI(`${API}/players`)
    numPlayers = Object.keys(playerMap).length
    puzzleData = await callAPI(`${API}/puzzles`)
    levelsOfActivity = await callAPI(`${API}/levelsofactivity`)
    // levelsOfActivity = output
    sequenceBetweenPuzzles = await callAPI(`${API}/sequencebetweenpuzzles`)
    // sequenceBetweenPuzzles = output2
    outlierData = await callAPI(`${API}/mloutliers`)
    completedPuzzleData = await callAPI(`${API}/completed`)
    handleTabSwitch(TABS.PUZZLE_SEQ_NETWORK)
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-puzzle-radar").click(() => handleTabSwitch(TABS.PUZZLE_RADAR_CHART))
    $("#nav-student-radar").click(() => handleTabSwitch(TABS.STUDENT_RADAR_CHART))
    $("#nav-outlier-radar").click(() => handleTabSwitch(TABS.OUTLIER_RADAR_CHART))
    $("#nav-puzzle-network").click(() => handleTabSwitch(TABS.PUZZLE_SEQ_NETWORK))
    $("#nav-ml-outliers").click(() => handleTabSwitch(TABS.ML_OUTLIERS))

    startDashboard()
})