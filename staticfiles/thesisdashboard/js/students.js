import * as dashboard from './thesis_dashboard.js'
import * as puzzlesTab from './puzzles.js'
import * as util from './helpers.js'
import { formatTime } from '../../dashboard/js/util/helpers.js';

const ALL_STUDENT_COLUMN_RENDER_FUNCTION = {
    "Student": (student) => playerMap[student],
    "# Completed": (student) => completedPuzzleData[student].size,
    "# Attempted": (student) => attemptedPuzzleData[student].size,
    "% Completed": (student) => (completedPuzzleData[student].size / 30).toFixed(2),
    "% Attempted": (student) => (attemptedPuzzleData[student].size / 30).toFixed(2),
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
var studentTableColumns = ["Student", "% Active Time", "Total Time", "Persistence Score"]
var studentPuzzleTableColumns = ["#", "Attempt Date", "Active Time", "# Submissions", "Completed?", "View Replay"]

// TODO: add learn more about puzzle link
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
    util.renderAlertsPanel("single-student-alerts", "Alerts", alerts)
}

function renderSingleStudentView(student) {
    computeStudentStatistics(student)
    renderPuzzleProgressChart("single-student-view-puzzle-heatmap-container", student)
    showStudentAlerts(student)
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

function renderSingleStudentPuzzleView() {
    puzzlesTab.computePuzzleStatistics(selectedPuzzle, "single-student-puzzle-statistics-container")
    renderStudentPuzzleTable()
    util.renderCheckboxes("student-puzzle-view-table-settings", util.SINGLE_STUDENT_PUZZLE_TABLE_COLUMNS, studentPuzzleTableColumns, handleStudentPuzzleTableColumnChange)
}

// TODO: fix primary keys of puzzles
// TODO: add concepts tested to single student puzzle view

function getReplayURL(student, puzzle, attemptIndex) {
    return `/${GROUP}/players/${student}/${puzzleKeys[puzzle]}/${attemptIndex}`
}

function renderStudentPuzzleTable() {
    const attempts = getStudentPuzzleAttempts(selectedStudent, selectedPuzzle)
    const numAttempts = attempts.length

    // TODO: generate replay links
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

    const renderFunction = (divId) => util.renderPuzzleHeatmap(divId, allPuzzlesList, puzzleStatistics, onClickFunction, student ? 1 : Object.keys(playerMap).length, student)
    util.renderGraphPopout(divId, "Puzzle Progress", renderFunction)
}

function handleAllStudentTableColumnChange(column, checked) {
    if (checked) {
        studentTableColumns.push(column)
        renderStudentTable()
        dashboard.reinitializeTableSort()
        return
    }

    studentTableColumns = studentTableColumns.filter((v) => v !== column)
    renderStudentTable()
    dashboard.reinitializeTableSort()
}

function handleStudentPuzzleTableColumnChange(column, checked) {
    if (checked) {
        studentPuzzleTableColumns.push(column)
        renderStudentTable()
        dashboard.reinitializeTableSort()
        return
    }

    studentPuzzleTableColumns = studentPuzzleTableColumns.filter((v) => v !== column)
    renderStudentPuzzleTable()
    dashboard.reinitializeTableSort()
}

function renderAllStudentsView() {
    const value = $('input[name=student-view-view-type]:checked', '#student-view-view-type-form').val()
    switch (value) {
        case "table":
            renderStudentTable()
            return
        case "graph":
            renderStudentChart()
            return
    }
}

function handleCustomizeDisplayPanel() {
    $('#student-view-student-form input').on('change', function () {
        const value = $('input[name=student-view-student-list]:checked', '#student-view-student-form').val()
        switch (value) {
            case "all-students": 
                
            case "filter-group":
        }
    })

    $('#student-view-view-type-form input').on('change', renderAllStudentsView)

    populateFilterGroupDropdown()
    util.renderCheckboxes("student-view-table-settings", util.ALL_STUDENT_TABLE_COLUMNS, studentTableColumns, handleAllStudentTableColumnChange)
}

// TODO: handle filter saving and updating
function populateFilterGroupDropdown() {
    const filters = dashboard.getFilterKeys()
    const dropdown = document.getElementById("student-view-filter-group")

    for (let filter of filters) {
        const option = document.createElement("option")
        option.value = filter
        option.textContent = filter
        dropdown.appendChild(option)
    }
    
    $('#student-view-filter-group').dropdown({maxSelections: 10})
    // TODO: fix multiselect
    // TODO: on filter change
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

    showAllStudentsView()
    handleCustomizeDisplayPanel()
    renderPuzzleProgressChart("student-view-puzzle-heatmap-container")
}