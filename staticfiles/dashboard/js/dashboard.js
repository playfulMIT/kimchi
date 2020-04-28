import { TABS, API } from './constants.js'
import { callAPI } from './helpers.js'
import { showMetricsOverview } from './metrics-overview.js'
import { showRadarCharts } from './radar-charts.js'

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
    } else if (activeTab === TABS.RADAR_CHART) {
        showRadarCharts(playerMap, puzzleData, levelsOfActivity)
    }
}

async function startDashboard() {
    // TODO: move the rest of the API calls here
    playerMap = await callAPI(`${API}/players`)
    numPlayers = Object.keys(playerMap).length
    puzzleData = await callAPI(`${API}/puzzles`)
    levelsOfActivity = await callAPI(`${API}/levelsofactivity`)
    handleTabSwitch(TABS.RADAR_CHART)
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-radar").click(() => handleTabSwitch(TABS.RADAR_CHART))

    startDashboard()
})