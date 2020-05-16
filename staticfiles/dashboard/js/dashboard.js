import { TABS, API } from './constants.js'
import { callAPI } from './helpers.js'
import { showMetricsOverview } from './metrics-overview.js'
import { showPuzzleRadarCharts } from './puzzle-radar-charts.js'
import { showStudentRadarCharts } from './student-radar-charts.js'

var activeTab = null
var playerMap = null 
var numPlayers = 0
var puzzleData = null
var levelsOfActivity = null

function handleTabSwitch(tab) {
    if (activeTab === tab) return 
    
    activeTab = tab
    if (activeTab === TABS.METRICS) {
        showMetricsOverview(playerMap, numPlayers, puzzleData)
    } else if (activeTab === TABS.PUZZLE_RADAR_CHART) {
        showPuzzleRadarCharts(playerMap, puzzleData, levelsOfActivity)
    } else if (activeTab === TABS.STUDENT_RADAR_CHART) {
        showStudentRadarCharts(playerMap, puzzleData, levelsOfActivity)
    }
}

async function startDashboard() {
    // TODO: move the rest of the API calls here
    playerMap = await callAPI(`${API}/players`)
    numPlayers = Object.keys(playerMap).length
    puzzleData = await callAPI(`${API}/puzzles`)
    levelsOfActivity = await callAPI(`${API}/levelsofactivity`)
    handleTabSwitch(TABS.STUDENT_RADAR_CHART)
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-puzzle-radar").click(() => handleTabSwitch(TABS.PUZZLE_RADAR_CHART))
    $("#nav-student-radar").click(() => handleTabSwitch(TABS.STUDENT_RADAR_CHART))

    startDashboard()
})