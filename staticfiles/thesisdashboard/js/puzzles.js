import * as dashboard from './thesis_dashboard.js'
import * as studentsTab from './students.js'
import * as util from './helpers.js'
import { formatTime } from '../../dashboard/js/util/helpers.js';

const SINGLE_PUZZLE_TABLE_COLUMNS = ["Student", "Attempted?", "Completed?"]

const ALL_PUZZLES_COLUMN_RENDER_FUNCTION = {
    "Puzzle": (puzzle) => puzzle,
    "Category": (puzzle) => puzzleStatistics[puzzle].category,
    "# Students Completed": (puzzle) => puzzleStatistics[puzzle].completed.size,
    "# Students Attempted": (puzzle) => puzzleStatistics[puzzle].attempted.size,
    "% Completed/Attempted": (puzzle) => (puzzleStatistics[puzzle].completed.size * 100 / puzzleStatistics[puzzle].attempted.size).toFixed(2),
    "% Students Completed": (puzzle) => (puzzleStatistics[puzzle].completed.size * 100 / Object.keys(playerMap).length).toFixed(2),
    "% Students Attempted": (puzzle) => (puzzleStatistics[puzzle].attempted.size * 100 / Object.keys(playerMap).length).toFixed(2),
    "Median Total Time": (puzzle) => puzzle in levelsOfActivityData ? formatTime(levelsOfActivityData[puzzle]["no_normalization"]["all_stats"].timeTotal.median) : formatTime(0),
    "Median Active Time": (puzzle) => puzzle in levelsOfActivityData ? formatTime(levelsOfActivityData[puzzle]["no_normalization"]["all_stats"].active_time.median) : formatTime(0),
    "Difficulty (out of 100)": (puzzle) => (puzzleStatistics[puzzle].difficulty * 100).toFixed(1),
    "Median % Active Time": (puzzle) => puzzle in levelsOfActivityData ? (levelsOfActivityData[puzzle]["no_normalization"]["all_stats"].active_time.median * 100 / levelsOfActivityData[puzzle]["no_normalization"]["all_stats"].timeTotal.median).toFixed(2) : "N/A"
}

var playerMap = null
var allPuzzlesList = null
var puzzleStatistics = null
var completedPuzzleData = null
var attemptedPuzzleData = null
var levelsOfActivityData = null

var selectedPuzzle = null
var puzzleTableColumns = ["Puzzle", "Category", "Difficulty (out of 100)", "% Completed/Attempted", "Median % Active Time"]

function generateBreadcrumb() {
    const breadcrumb = document.getElementById("puzzle-view-breadcrumb")
    breadcrumb.className = "ui breadcrumb"
    breadcrumb.innerHTML = ""

    if (!selectedPuzzle) {
        breadcrumb.appendChild(util.createActiveBreadcrumb("All Puzzles"))
    } else {
        breadcrumb.appendChild(util.createInactiveBreadcrumb("All Puzzles", () => showAllPuzzlesView()))
        breadcrumb.appendChild(util.createBreadcrumbDivider())
        breadcrumb.appendChild(util.createActiveBreadcrumb(selectedPuzzle))
    }
}

function showAllPuzzlesView() {
    selectedPuzzle = null
    generateBreadcrumb()

    $(".puzzle-view").hide()
    $("#all-puzzles-view").show()
    renderAllPuzzlesView()
}

export function showSinglePuzzleView(puzzle) {
    selectedPuzzle = puzzle
    generateBreadcrumb()

    $(".puzzle-view").hide()
    $("#single-puzzle-view").show()
    renderSinglePuzzleView(puzzle)
}

export function computePuzzleStatistics(puzzle, divId = null) {
    const numStudents = Object.keys(playerMap).length
    const difficulty = puzzleStatistics[puzzle].difficulty * 100
    const studentsCompleted = puzzleStatistics[puzzle].completed.size * 100 / numStudents
    const studentsAttempted = puzzleStatistics[puzzle].attempted.size * 100 / numStudents
    const completedVAttempted = studentsCompleted * 100 / studentsAttempted
    const medianActiveTime = levelsOfActivityData[puzzle]["no_normalization"]["all_stats"].active_time.median
    
    const statsMap = {
        'Concepts Tested': "TBD",
        'Difficulty (out of 100)': difficulty.toFixed(2),
        '% Students Completed': studentsCompleted.toFixed(2)+"%",
        '% Students Attempted': studentsAttempted.toFixed(2)+"%",
        '% Completed/Attempted': completedVAttempted.toFixed(2)+"%",
        'Median Active Time': formatTime(medianActiveTime)
    }
    util.renderStatistics(divId || "single-puzzle-statistics-container", statsMap)
}

function renderSinglePuzzleTable(puzzle) {
    const SINGLE_PUZZLE_COLUMN_RENDER_FUNCTION = {
        "Student": (student) => playerMap[student],
        "Completed?": (student) => completedPuzzleData[student].has(puzzle) ? "Yes" : "No",
        "Attempted?": (student) => attemptedPuzzleData[student].has(puzzle) ? "Yes" : "No"
    }

    util.renderTable("single-puzzle-table-container", SINGLE_PUZZLE_TABLE_COLUMNS, Object.keys(playerMap), SINGLE_PUZZLE_COLUMN_RENDER_FUNCTION, (student) => {
        $("#students-tab").click()
        studentsTab.showSingleStudentPuzzleView(student, puzzle)
    }, "striped compact selectable sortable")
}

function renderSinglePuzzleView(puzzle) {
    computePuzzleStatistics(puzzle)
    renderSinglePuzzleTable(puzzle)
}

function renderPuzzleTable() {
    $("#puzzle-view-configure-table-group").show()
    $("#puzzle-view-configure-graph-group").hide()

    util.renderTable("all-puzzles-view-container", puzzleTableColumns, allPuzzlesList, ALL_PUZZLES_COLUMN_RENDER_FUNCTION, (puzzle) => showSinglePuzzleView(puzzle), "striped compact selectable sortable")
}

function renderPuzzleChart() {
    $("#puzzle-view-configure-table-group").hide()
    $("#puzzle-view-configure-graph-group").show()
}

function renderPuzzleProgressChart(student = null) {
    const renderFunction = (divId) => util.renderPuzzleHeatmap(divId, allPuzzlesList, puzzleStatistics, () => { alert("heyyyy") }, Object.keys(playerMap).length, student)
    util.renderGraphPopout("puzzle-view-puzzle-heatmap-container", "Puzzle Progress", renderFunction)
}

function handleTableColumnChange(column, checked) {
    if (checked) {
        puzzleTableColumns.push(column)
        renderPuzzleTable()
        return
    }

    puzzleTableColumns = puzzleTableColumns.filter((v) => v !== column)
    renderPuzzleTable()
    dashboard.reinitializeTableSort()
}

function renderAllPuzzlesView() {
    const value = $('input[name=puzzle-view-view-type]:checked', '#puzzle-view-view-type-form').val()
    switch (value) {
        case "table":
            renderPuzzleTable()
            return
        case "graph":
            renderPuzzleChart()
            return
    }
}

function handleCustomizeDisplayPanel() {
    $('#puzzle-view-student-form input').on('change', function () {
        const value = $('input[name=puzzle-view-student-list]:checked', '#puzzle-view-student-form').val()
        switch (value) {
            case "all-students":

            case "filter-group":
        }
    })

    $('#puzzle-view-view-type-form input').on('change', renderAllPuzzlesView)

    util.renderCheckboxes("puzzle-view-table-settings", util.ALL_PUZZLE_TABLE_COLUMNS, puzzleTableColumns, handleTableColumnChange)
}

export function initializeTab(players, puzzleList, puzzleStats, levelsOfActivity, completed, attempted) {
    playerMap = players
    allPuzzlesList = puzzleList
    puzzleStatistics = puzzleStats
    levelsOfActivityData = levelsOfActivity
    completedPuzzleData = completed
    attemptedPuzzleData = attempted

    showAllPuzzlesView()
    handleCustomizeDisplayPanel()
    renderPuzzleProgressChart()
}