import * as util from './helpers.js'
import * as dashboard from './thesis_dashboard.js'
import * as puzzleTab from './puzzles.js'
import * as studentTab from './students.js'
import { formatPlurals, formatTime } from '../../dashboard/js/util/helpers.js';

const INSIGHT_ID_PREFIX = "overview-insight-"

var playerMap = null
var puzzleDifficultyData = null
var levelsOfActivityData = null
var completedPuzzleData = null
var attemptedPuzzleData = null
var insightsData = null
var insightsDataNoDifficultPuzzles = null
var includeDifficultPuzzlesInInsights = true

// TODO: insights: students who made no progress, students who briefly looked at a puzzle and left, students who low time between submissions, quick to exit
// TODO: connect insights to other pages
// TODO: alert to text 

const INSIGHT_TO_HEADER = {
    "warning_puzzles": "Warning Puzzles<br>info text",
    "stuck_students": "Stuck Students<br>info text",
}

const INSIGHT_TO_ITEMS = {
    "warning_puzzles": () => includeDifficultPuzzlesInInsights ? insightsData.warning_puzzles : insightsDataNoDifficultPuzzles.warning_puzzles,
    "stuck_students": () => Object.entries(includeDifficultPuzzlesInInsights ? insightsData.stuck_students : insightsDataNoDifficultPuzzles.stuck_students)
}

function hideModal(callback = null) {
    if (callback) {
        $("#insights-modal").modal({ onHidden: callback }).modal("hide")
        return
    } 

    $("#insights-modal").modal("hide")
}

const INSIGHTS_RENDER_FUNCTION = {
    "warning_puzzles": (puzzle) => {
        const container = document.createElement("div")
        const link = document.createElement("a")
        link.textContent = puzzle
        link.onclick = () => {
            hideModal(() => {
                $("#puzzles-tab").click()
                puzzleTab.showSinglePuzzleView(puzzle)
            })
        }
        container.appendChild(link)
        return container
    },
    "stuck_students": (item) => {
        const student = item[0]
        const puzzles = item[1]
        const container = document.createElement("div")

        const row = document.createElement("div")
        row.textContent = playerMap[student] + ": "
        container.appendChild(row)

        for (let i = 0; i < puzzles.length; i++) {
            const puzzle = puzzles[i]
            const link = document.createElement("a")
            link.textContent = `${i == 0 ? "" : ", "}${puzzle}`
            link.onclick = () => {
                hideModal(() => {
                    $("#students-tab").click()
                    studentTab.showSingleStudentPuzzleView(student, puzzle)
                })
            }
            row.appendChild(link)
        }
        
        return container
    }
}

function renderInsightsModalContent() {
    const container = document.getElementById("insights-modal-content")
    container.innerHTML = ''
    
    for (let insight of Object.keys(insightsData)) {
        const insightContainer = document.createElement("div")
        insightContainer.innerHTML = INSIGHT_TO_HEADER[insight]
        container.appendChild(insightContainer)

        const listContainer = document.createElement("div")
        listContainer.id = insight + "list"
        insightContainer.appendChild(listContainer)
        util.renderList(listContainer.id, INSIGHT_TO_ITEMS[insight](), INSIGHTS_RENDER_FUNCTION[insight], "bulleted")
    }
}

function showAlerts() {
    const alerts = dashboard.getAlertsByAlert()
    util.renderList("overview-alerts-list", Object.keys(alerts), (alertName) => {
        const content = document.createElement("div")
        content.className = "content"
        content.textContent = `${alerts[alertName].length + " " + formatPlurals("student", alerts[alertName].length)} flagged for ${alertName}`
        return content
    })
}

function generateClassStatistics() {
    const studentCount = Object.keys(playerMap).length
    const medianTimeSpent = levelsOfActivityData.all.no_normalization.all_stats.timeTotal.median

    var totalPuzzlesCompleted = 0
    for (let student in completedPuzzleData) {
        totalPuzzlesCompleted += completedPuzzleData[student].size
    }

    var totalPuzzlesAttempted = 0
    for (let student in attemptedPuzzleData) {
        totalPuzzlesAttempted += attemptedPuzzleData[student].size
    }

    const statsMap = {
        'Students': studentCount,
        'Median time on Shadowspect': formatTime(medianTimeSpent),
        'Avg. # of puzzles completed': (totalPuzzlesCompleted / studentCount).toFixed(1),
        'Avg. # of puzzles attempted': (totalPuzzlesAttempted / studentCount).toFixed(1)
    }

    util.renderStatistics("overview-statistics-container", statsMap)
}

function handleWarningPuzzleText(warningPuzzleList) {
    const numPuzzles = warningPuzzleList.length
    return `There are ${numPuzzles + " " + formatPlurals("puzzle", numPuzzles)} on which most students seem to be struggling with.`
}

function handleStuckStudentText(stuckStudentMap) {
    const numStudents = Object.keys(stuckStudentMap).length
    return `There are ${numStudents + " " + formatPlurals("student", numStudents)} who seem to be stuck.`
}

const INSIGHT_TEXT_FUNCTIONS = {
    "warning_puzzles": handleWarningPuzzleText,
    "stuck_students": handleStuckStudentText
}

function handleDifficultPuzzlesCheckbox() {
    includeDifficultPuzzlesInInsights = $("#overview-insights-difficulty-toggle").is(":checked")
    generateInsights(includeDifficultPuzzlesInInsights ? insightsData : insightsDataNoDifficultPuzzles)
    renderInsightsModalContent()
}

function generateInsights(insights) {
    util.renderList("overview-insights-list", Object.keys(insights), (insightName) => {
        if (!insights[insightName] || insights[insightName] == false) return null

        const content = document.createElement("div")
        content.id = INSIGHT_ID_PREFIX + insightName
        content.className = "content"

        const insightText = document.createElement("div")
        insightText.textContent = INSIGHT_TEXT_FUNCTIONS[insightName](insights[insightName])
        content.appendChild(insightText)
        return content
    })

    $("#overview-insights-difficulty-toggle").change(handleDifficultPuzzlesCheckbox)
}

export function initializeTab(players, puzzleDifficulty, levelsOfActivity, completed, attempted, insights) {
    playerMap = players
    puzzleDifficultyData = puzzleDifficulty
    levelsOfActivityData = levelsOfActivity
    completedPuzzleData = completed
    attemptedPuzzleData = attempted
    insightsData = insights

    insightsDataNoDifficultPuzzles = {}
    for (let insightName of Object.keys(insightsData)) {
        switch (insightName) {
            case "warning_puzzles":
                insightsDataNoDifficultPuzzles[insightName] = insightsData[insightName].filter((p) => puzzleDifficultyData[p] < 0.5)
                break
            case "stuck_students":
                insightsDataNoDifficultPuzzles[insightName] = {}
                for (let student of Object.keys(insightsData[insightName])) {
                    const puzzleList = insightsData[insightName][student].filter((p) => puzzleDifficultyData[p] < 0.5)
                    if (puzzleList.length > 0) {
                        insightsDataNoDifficultPuzzles[insightName][student] = puzzleList
                    }
                }
                break
        }
    }

    $("#overview-alerts-link").click(() => $("#alerts-tab").click())
    $("#overview-insights-link").click(() => $("#insights-modal").modal({}).modal('show'))
    generateClassStatistics()
    handleDifficultPuzzlesCheckbox()
    showAlerts()
    renderInsightsModalContent()
}