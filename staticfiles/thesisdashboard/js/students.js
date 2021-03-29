import * as dashboard from './thesis_dashboard.js'
import * as puzzlesTab from './puzzles.js'
import * as util from './helpers.js'
import * as filter from './filter.js'
import { formatTime } from '../../dashboard/js/util/helpers.js';

const ALL_STUDENT_COLUMN_RENDER_FUNCTION = {
    "Student": (student) => playerMap[student],
    "# Completed": (student) => student in completedPuzzleData ? completedPuzzleData[student].size : 0,
    "# Attempted": (student) => student in attemptedPuzzleData ? attemptedPuzzleData[student].size : 0,
    "% Completed": (student) => student in completedPuzzleData ? (completedPuzzleData[student].size * 100/ 30).toFixed(2) : 0,
    "% Attempted": (student) => student in attemptedPuzzleData ? (attemptedPuzzleData[student].size * 100/ 30).toFixed(2) : 0,
    "% Completed/Attempted": (student) => student in attemptedPuzzleData ? (completedPuzzleData[student].size * 100 / attemptedPuzzleData[student].size).toFixed(2) : (0).toFixed(2),
    "Total Time": (student) => student in levelsOfActivityData["all"]["no_normalization"] ? formatTime(levelsOfActivityData["all"]["no_normalization"][student].timeTotal) : formatTime(0),
    "Total Active Time": (student) => student in levelsOfActivityData["all"]["no_normalization"] ? formatTime(levelsOfActivityData["all"]["no_normalization"][student].active_time) : formatTime(0),
    "Persistence Score": (student) => student in persistenceData ? persistenceData[student][persistenceData[student].length - 1].percentileCompositeAcrossAttempts : "N/A",
    "% Active Time": (student) => student in levelsOfActivityData["all"]["no_normalization"] ? (levelsOfActivityData["all"]["no_normalization"][student].active_time * 100 / levelsOfActivityData["all"]["no_normalization"][student].timeTotal).toFixed(2) : "N/A"
}

var playerMap = null
var allPuzzlesList = null
var puzzleKeys = null
var puzzleStatistics = null
var persistenceData = null
var completedPuzzleData = null
var attemptedPuzzleData = null
var levelsOfActivityData = null

var selectedStudent = null
var selectedPuzzle = null

var activeStudentList = []
var activeFilterList = []
var studentTableColumns = ["Student", "% Active Time", "Total Time", "% Completed/Attempted", "Persistence Score"]
var studentPuzzleTableColumns = ["#", "Attempt Date", "Active Time", "# Submissions", "Completed?", "View Replay"]

var showFilterGroups = false
var firstLoad = true

function generateBreadcrumb() {
    const breadcrumb = document.getElementById("student-view-breadcrumb")
    breadcrumb.className = "ui breadcrumb"
    breadcrumb.innerHTML = ""

    if (!selectedStudent && !selectedPuzzle) {
        breadcrumb.appendChild(util.createActiveBreadcrumb("All Students"))
    } else {
        breadcrumb.appendChild(util.createInactiveBreadcrumb("All Students", () => showAllStudentsView()))
        breadcrumb.appendChild(util.createBreadcrumbDivider())
        
        const student = playerMap[selectedStudent]
        if (!selectedPuzzle) {
            breadcrumb.appendChild(util.createActiveBreadcrumb(student))
        } else {
            breadcrumb.appendChild(util.createInactiveBreadcrumb(student, () => showSingleStudentView(selectedStudent)))
            breadcrumb.appendChild(util.createBreadcrumbDivider())
            breadcrumb.appendChild(util.createActiveBreadcrumb(selectedPuzzle))
        }
    }
}

function showAllStudentsView() {
    selectedStudent = null
    selectedPuzzle = null
    generateBreadcrumb()

    $(".student-view").hide()
    $("#all-students-view").show()
    renderAllStudentsView()
}

export function showSingleStudentView(student) {
    selectedStudent = student
    selectedPuzzle = null
    generateBreadcrumb()

    $(".student-view").hide()
    $("#single-student-view-container").show()
    renderSingleStudentView(student)
}

function computeStudentStatistics(student) {
    const totalTime = student in levelsOfActivityData["all"]["no_normalization"] ? levelsOfActivityData["all"]["no_normalization"][student].timeTotal : 0
    
    const activeTime = student in levelsOfActivityData["all"]["no_normalization"] ? levelsOfActivityData["all"]["no_normalization"][student].active_time : 0
    
    const activeTotalRatio = activeTime * 100 / totalTime
   
    const persistence = student in persistenceData ? persistenceData[student][persistenceData[student].length - 1].percentileCompositeAcrossAttempts : "N/A"
    
    const lastActiveTime = student in persistenceData ? persistenceData[student][persistenceData[student].length - 1].timestamp : "N/A"
    
    const statsMap = {
        'Last Active': lastActiveTime ? d3.timeFormat("%-m/%-d/%y")(d3.timeParse("%Q")(lastActiveTime)) : "N/A",
        'Persistence': persistence,
        'Total Time in Shadowspect': formatTime(totalTime),
        '% Active/Total Time': (activeTotalRatio).toFixed(2)+"%",
    }
    util.renderStatistics("single-student-statistics-container", statsMap)
}

function showStudentAlerts(student) {
    const alertsByStudent = dashboard.getAlertsByStudent()
    const alerts = student in alertsByStudent ? alertsByStudent[student] : []
    if (alerts.length) {
        $("#single-student-alert-card").show()
        util.renderAlertsPanel("single-student-alerts", alerts)
        return
    }
    $("#single-student-alert-card").show()
    $("#single-student-alerts").text("No alerts")
}

export function handleTabVisible() {
    if (!selectedStudent && !selectedPuzzle) {
        renderPuzzleProgressChart("student-view-puzzle-heatmap-container")
        renderStudentTable()
        renderCompetencyGraph()
    }
    firstLoad = false
}

function renderSingleStudentView(student) {
    computeStudentStatistics(student)
    renderPuzzleProgressChart("single-student-view-puzzle-heatmap-container", student)
    showStudentAlerts(student)
    renderCompetencyGraph()
}

export function showSingleStudentPuzzleView(student, puzzle) {
    selectedStudent = student
    selectedPuzzle = puzzle
    generateBreadcrumb()

    $(".student-view").hide()
    $("#single-student-puzzle-view-container").show()
    renderSingleStudentPuzzleView()
}

function getStudentPuzzleAttempts(student, puzzle) {
    if (!(student in persistenceData)) return []
    
    return persistenceData[student].filter(v => v.task_id === puzzle)
}

function renderCompetencyGraph() {
    const divId = selectedStudent ? "single-student-view-competency-container" : "student-view-competency-container"
    const renderFunction = (divId) => util.renderMockCompetencyGraph(divId)
    util.renderGraphPopout(divId, "Concept Mastery", renderFunction)
}


function renderPuzzleSilhouettes(puzzle) {
    util.renderPuzzleSilhouette("student-view-silhouette-container", puzzle)
}

function renderSingleStudentPuzzleView() {
    $("#single-student-puzzle-goto-link").click(() => {
        $("#puzzles-tab").click()
        puzzlesTab.showSinglePuzzleView(selectedPuzzle)
    })
    puzzlesTab.computePuzzleStatistics(selectedPuzzle, "single-student-puzzle-statistics-container")
    renderStudentPuzzleTable()
    util.renderCheckboxes("student-puzzle-view-table-settings", util.SINGLE_STUDENT_PUZZLE_TABLE_COLUMNS, studentPuzzleTableColumns, handleStudentPuzzleTableColumnChange)
    renderPuzzleSilhouettes(selectedPuzzle)
    puzzlesTab.showPuzzleMisconceptions("student-view-misconceptions-container", selectedPuzzle, selectedStudent)
}

function getReplayURL(student, puzzle, attemptIndex) {
    return `/${GROUP}/players/${student}/${util.PUZZLE_TO_KEY[puzzle]}/${attemptIndex}`
}

function renderStudentPuzzleTable() {
    const attempts = getStudentPuzzleAttempts(selectedStudent, selectedPuzzle)
    const numAttempts = attempts.length

    const SINGLE_STUDENT_PUZZLE_COLUMN_RENDER_FUNCTION = {
        "#": (attemptIndex) => attemptIndex + 1,
        "Attempt Date": (attemptIndex) => d3.timeFormat("%c")(d3.timeParse("%Q")(attempts[attemptIndex].timestamp)),
        "Active Time": (attemptIndex) => formatTime(attempts[attemptIndex].active_time),
        "Percentile Active Time": (attemptIndex) => attempts[attemptIndex].percentileActiveTime,
        "Events": (attemptIndex) => attempts[attemptIndex].n_events,
        "Percentile Events": (attemptIndex) => attempts[attemptIndex].percentileEvents,
        "# Submissions": (attemptIndex) => attempts[attemptIndex].n_check_solution,
        "Completed?": (attemptIndex) => attempts[attemptIndex].completed ? "Yes" : "No",
        "# Breaks": (attemptIndex) => attempts[attemptIndex].n_breaks,
        "Avg. Time Btwn Submissions": (attemptIndex) => formatTime(parseFloat(attempts[attemptIndex].avg_time_between_submissions)),
        "Time from Fail to Exit": (attemptIndex) => formatTime(parseFloat(attempts[attemptIndex].time_fail_submission_exit)),
        "View Replay": (attemptIndex) => `<a target="_blank" href=${getReplayURL(selectedStudent, selectedPuzzle, attemptIndex)}>View</a>`
    }

    util.renderTable("single-student-puzzle-table", studentPuzzleTableColumns, d3.range(numAttempts), SINGLE_STUDENT_PUZZLE_COLUMN_RENDER_FUNCTION, null, "stiped compact sortable")
}

function renderStudentTable() {
    $("#student-view-configure-table-group").show()
    $("#student-view-configure-graph-group").hide()

    util.renderTable("all-students-view-container", studentTableColumns, activeStudentList, ALL_STUDENT_COLUMN_RENDER_FUNCTION, (student) => showSingleStudentView(student), "striped compact selectable sortable")
}

function renderStudentChart() {
    $("#student-view-configure-table-group").hide()
    $("#student-view-configure-graph-group").show()
}

function renderPuzzleProgressChart(divId, student = null) {
    var onClickFunction = (puzzle) => { 
        $("#puzzles-tab").click()
        puzzlesTab.showSinglePuzzleView(puzzle)
    }

    if (student) {
        onClickFunction = (puzzle) => showSingleStudentPuzzleView(student, puzzle)
    }

    const stats = showFilterGroups ? dashboard.computeStatsForGroup(activeStudentList) : puzzleStatistics
    const renderFunction = (divId) => util.renderPuzzleHeatmap(divId, allPuzzlesList, stats, onClickFunction, student ? 1 : activeStudentList.length, student)

    const tooltipText = student ? "Blue corresponds to completed puzzles. Yellow corresponds to attempted, uncompleted puzzles." : "Darker shades correspond to higher values." 
    const subtitleText = student ? "Click on a puzzle to see the student's data for the specific puzzle." : null
    util.renderGraphPopout(divId, "Puzzle Progress", renderFunction, tooltipText, subtitleText)
}

function handleAllStudentTableColumnChange(column, checked) {
    if (checked) {
        studentTableColumns.push(column)
        renderStudentTable()
        util.reinitializeTableSort()
        return
    }

    studentTableColumns = studentTableColumns.filter((v) => v !== column)
    renderStudentTable()
    util.reinitializeTableSort()
}

function handleStudentPuzzleTableColumnChange(column, checked) {
    if (checked) {
        studentPuzzleTableColumns.push(column)
        renderStudentPuzzleTable()
        util.reinitializeTableSort()
        return
    }

    studentPuzzleTableColumns = studentPuzzleTableColumns.filter((v) => v !== column)
    renderStudentPuzzleTable()
    util.reinitializeTableSort()
}

function renderAllStudentsView() {
    const value = $('input[name=student-view-view-type]:checked', '#student-view-view-type-form').val()
    renderCompetencyGraph()
    switch (value) {
        case "table":
            renderStudentTable()
            return
        case "graph":
            renderStudentChart()
            return
    }
}

function getStudentsFromFilters() {
    const filterObject = {}
    for (let filter of activeFilterList) {
        filterObject[filter] = dashboard.getFilter(filter)
    }
    return Object.keys(filter.retrieveSelectedStudents(Object.keys(playerMap), filterObject))
}

function handleCustomizeDisplayPanel() {
    $('#student-view-student-form input').on('change', function () {
        const value = $('input[name=student-view-student-list]:checked', '#student-view-student-form').val()
        switch (value) {
            case "all-students": 
                showFilterGroups = false
                activeStudentList = Object.keys(playerMap)
                break
            case "filter-group":
                showFilterGroups = true
                activeStudentList = getStudentsFromFilters()
                break
        }
        handleFilterGroupChange()
    })

    $('#student-view-view-type-form input').on('change', renderAllStudentsView)

    populateFilterGroupDropdown()
    util.renderCheckboxes("student-view-table-settings", util.ALL_STUDENT_TABLE_COLUMNS, studentTableColumns, handleAllStudentTableColumnChange)
}

function handleFilterGroupChange() {
    renderAllStudentsView()
    renderPuzzleProgressChart("student-view-puzzle-heatmap-container")
    renderCompetencyGraph()
}

export function handleFilterChange() {
    if (selectedStudent) showStudentAlerts(selectedStudent)
    handleFilterGroupChange()
    populateFilterGroupDropdown()
}

function populateFilterGroupDropdown() {
    const filters = dashboard.getFilterKeys()
    const dropdown = document.getElementById("student-view-filter-group")

    for (let filter of filters) {
        const option = document.createElement("option")
        option.value = filter
        option.textContent = filter
        dropdown.appendChild(option)
    }
    
    dropdown.onchange = function (event) {
        activeFilterList = $(event.target).val()
        if (showFilterGroups) {
            activeStudentList = getStudentsFromFilters()
            handleFilterGroupChange()
            return
        }

        $("#filter-group-radio").click()
    }
    $("#student-view-filter-group").dropdown()
}

// function initializeView() {
//     const graphDiv = document.getElementById("portal-view-area")
//     width = graphDiv.clientWidth - margin.left - margin.right
//     height = graphDiv.clientHeight - margin.top - margin.bottom

//     svg = d3.select("#portal-view-area").append("svg")
//         .attr("width", width + margin.left + margin.right)
//         .attr("height", height + margin.top + margin.bottom)
//         .append("g")
//         .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

//     tooltip = d3.select("body").append("div")
//         .attr("id", "portal-tooltip")
//         .attr("class", "tooltip")
//         .style("opacity", 0)

//     xScale = d3.scaleLinear().range([0, width])
//     yScale = d3.scaleLinear().range([height, 0])
//     alertColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(Object.keys(alerts))
//     // TODO: initial rendering
// }

// function updateAxisScales(xDomain, yDomain) {
//     xScale.domain(xDomain)
//     yScale.domain(yDomain)
// }

// // redraw the scatter plot
// function renderStudentAttemptedVsCompletedView() {
//     svg.selectAll("*").remove()

//     updateAxisScales([0,30], [0,30])

//     const polygonPoints = [[0,0], [0,30], [30,30]]

//     svg.append("polygon")
//         .attr("points", polygonPoints.map(x => `${xScale(x[0])},${yScale(x[1])}`).join(" "))
//         .style("fill", "#C6C6C6")

//     svg.append("line")
//         .attr("class", "guideline")
//         .attr("x1", xScale(0))
//         .attr("y1", yScale(0))
//         .attr("x2", xScale(30))
//         .attr("y2", yScale(30))

//     for (let number of [5,10,15,20,25,30]) {
//         svg.append("line")
//             .attr("class", "guideline")
//             .attr("x1", xScale(number))
//             .attr("y1", yScale(0))
//             .attr("x2", xScale(number))
//             .attr("y2", yScale(number))

//         svg.append("line")
//             .attr("class", "guideline")
//             .attr("x1", xScale(0))
//             .attr("y1", yScale(number))
//             .attr("x2", xScale(number))
//             .attr("y2", yScale(number))
//     }

//     // draw x-axis
//     svg.append("g")
//         .attr("class", "x axis")
//         .attr("transform", "translate(0," + height + ")")
//         .call(d3.axisBottom(xScale).ticks(6))
//         .append("text")
//         .attr("class", "label")
//         .attr("x", width)
//         .attr("y", -6)
//         .style("text-anchor", "end")
//         .style("fill", "#000")
//         .text("# of Puzzles Attempted")

//     // draw y-axis
//     svg.append("g")
//         .attr("class", "y axis")
//         .call(d3.axisLeft(yScale).ticks(6))
//         .append("text")
//         .attr("class", "label")
//         .attr("transform", "rotate(-90)")
//         .attr("y", 6)
//         .attr("dy", ".71em")
//         .style("text-anchor", "end")
//         .style("fill", "#000")
//         .text("# of Puzzles Completed")

//     renderStudentPoints()
// }

// function renderStudentPoints() {
//     svg.selectAll(".point").remove()
    
//     if (displayStudentsAsMonsters) {
//         const monsterSize = 40
//         svg.selectAll(".point")
//             .data(Object.keys(playerMap))
//             .enter()
//             .append("image")
//             .attr("xlink:href", d => playerMonsterMap[d])
//             .attr("width", monsterSize)
//             .attr("height", monsterSize)
//             .attr("class", d => `point ${d in selectedStudents ? "alert-point" : ""}`)
//             .attr("id", d => "portal-student-point" + d)
//             .attr("x", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0) - (monsterSize / 2))
//             .attr("y", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0) - (monsterSize / 2))
//             .style("outline-color", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
//             .on("mouseover", function (d) {
//                 tooltip.transition()
//                     .duration(200)
//                     .style("opacity", .9)

//                 tooltip.html(`${anonymizeNames ? d : playerMap[d]}`)
//                     .style("left", (d3.event.pageX + 10) + "px")
//                     .style("top", (d3.event.pageY - 10) + "px")
//             })
//             .on("mouseout", function (d) {
//                 tooltip.transition()
//                     .duration(500)
//                     .style("opacity", 0)
//             })
//     } else {
//         svg.selectAll(".point")
//             .data(Object.keys(playerMap))
//             .enter()
//             .append("circle")
//             .attr("class", d => `point ${d in selectedStudents ? "alert-point" : ""}`)
//             .attr("id", d => "portal-student-point" + d)
//             .attr("r", 3.5)
//             .attr("cx", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0))
//             .attr("cy", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0))
//             .attr("stroke", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
//             .on("mouseover", function (d) {
//                 tooltip.transition()
//                     .duration(200)
//                     .style("opacity", .9)

//                 tooltip.html(`${anonymizeNames ? d : playerMap[d]}`)
//                     .style("left", (d3.event.pageX + 10) + "px")
//                     .style("top", (d3.event.pageY - 10) + "px")
//             })
//             .on("mouseout", function (d) {
//                 tooltip.transition()
//                     .duration(500)
//                     .style("opacity", 0)
//             })
//             .on("click", handleExperimentClick)
//     }
// }

export function initializeTab(players, puzzleList, puzzleKs, puzzleStats, persistence, levelsOfActivity, completed, attempted) {
    playerMap = players
    allPuzzlesList = puzzleList
    puzzleKeys = puzzleKs
    puzzleStatistics = puzzleStats
    persistenceData = persistence
    levelsOfActivityData = levelsOfActivity
    completedPuzzleData = completed
    attemptedPuzzleData = attempted

    activeStudentList = Object.keys(playerMap)
    showFilterGroups = false

    showAllStudentsView()
    handleCustomizeDisplayPanel()
    renderPuzzleProgressChart("student-view-puzzle-heatmap-container")
}