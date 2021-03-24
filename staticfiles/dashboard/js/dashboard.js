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
var versionTime = null
var puzzleData = null
var funnelData = null
var levelsOfActivity = null
var completedPuzzleData = null
var completedPuzzleDataNoSandbox  = null
var attemptedPuzzleData = null
var attemptedPuzzleDataNoSandbox = null
var sequenceBetweenPuzzles = null
var outlierData = null
var persistenceData = null
var persistenceByPuzzleData = null
var insightsData = null
var misconceptionsData = null
var competencyData = null

function handleTabSwitch(tab, ignoreDuplicate = true) {
    if (ignoreDuplicate && activeTab === tab) return 
    
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
            showPortal(playerMap, puzzleData, persistenceData, persistenceByPuzzleData, completedPuzzleDataNoSandbox, attemptedPuzzleDataNoSandbox, funnelData, levelsOfActivity, insightsData, misconceptionsData, competencyData)
            break
    }
}

function showAPIError(errorMessage) {
    $("#main-page-spinner").html(`Unable to retrieve data for <span class="font-weight-bold">${GROUP}</span>. Please use the admin console to trigger data processing for <span class="font-weight-bold">${GROUP}</span> or speak to a member of the Shadowspect team.`)
    console.error(errorMessage)
    
}

async function handleShowNames() {
    const val = $("#show-names-pwd").val()

    if (val == "test") {
        $("#show-names-modal").modal('hide')
        $("#show-names-incorrect-pwd").hide()
        $("#show-names-pwd").removeClass("is-invalid")
        $("#show-names-btn").addClass("text-primary")
        // TODO: add loader
        callAPI(`${API}/players`, "POST").then(result => {
            playerMap = result
            handleTabSwitch(activeTab, false)
        })
        return
    }
    
    $("#show-names-incorrect-pwd").show()
    $("#show-names-pwd").addClass("is-invalid")
    $("#show-names-pwd").val("")
}

async function startDashboard() {
    // TODO: move the rest of the API calls here
    versionTime = await callAPI(`${API}/versiontime`)
    if (!Object.keys(versionTime).length) {
        showAPIError("No data has been processed yet for this group.")
        return
    }
    $("#last-processed-time").text(d3.timeFormat("%c")(new Date(versionTime.date)))

    try {
        playerMap = await callAPI(`${API}/players`)
        numPlayers = Object.keys(playerMap).length
        puzzleData = await callAPI(`${API}/puzzles`)
        funnelData = await callAPI(`${API}/funnelperpuzzle`)
        levelsOfActivity = await callAPI(`${API}/levelsofactivity`)
        sequenceBetweenPuzzles = await callAPI(`${API}/sequencebetweenpuzzles`)
        outlierData = await callAPI(`${API}/mloutliers`)
        insightsData = await callAPI(`${API}/insights`)
        misconceptionsData = await callAPI(`${API}/misconceptions`)

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
        persistenceByPuzzleData = await callAPI(`${API}/puzzlepersistence`)
        competencyData = await callAPI(`${API}/competency`)

        handleTabSwitch(TABS.PORTAL)
    } catch (error) {
        showAPIError(error)
    }
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-puzzle-radar").click(() => handleTabSwitch(TABS.PUZZLE_RADAR_CHART))
    $("#nav-student-radar").click(() => handleTabSwitch(TABS.STUDENT_RADAR_CHART))
    $("#nav-outlier-radar").click(() => handleTabSwitch(TABS.OUTLIER_RADAR_CHART))
    $("#nav-puzzle-network").click(() => handleTabSwitch(TABS.PUZZLE_SEQ_NETWORK))
    $("#nav-ml-outliers").click(() => handleTabSwitch(TABS.ML_OUTLIERS))
    $("#nav-portal").click(() => handleTabSwitch(TABS.PORTAL))

    $("#show-names-form").submit((event) => {
        event.preventDefault()
        handleShowNames()
    })
    startDashboard()
})