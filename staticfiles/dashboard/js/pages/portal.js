import { showPage, formatTime, getClassAverage } from '../util/helpers.js'
import { MONSTER_IMAGE_PATHS } from '../util/constants.js';

var anonymizeNames = false
var playerMap = null
var puzzleData = null
var persistenceData = null
var completedPuzzleData = null
var attemptedPuzzleData = null
var levelsOfActivityData = null
var puzzleList = []

// TODO: fix alert colors
// TODO: add monsters
// TODO: move axis titles

const alerts = {
    // 'All students': [],
    'Students with < 40 persistence': [
        ['persistence', '<', 40]
    ],
    'Students who finished puzzle [10, 11, 12]': [
        ['completed_puzzles', 'has', 10],
        ['completed_puzzles', 'has', 11],
        ['completed_puzzles', 'has', 12]
    ]
}
// filter structure ['metric_name', 'condition', 'value']

var activeAlerts = new Set()
var selectedStudents = {}

var svg = null
var tooltip = null
const margin = { top: 20, right: 40, bottom: 30, left: 30 }
var width = 0
var height = 0
var xScale = null
var yScale = null
var alertColorScale = null

var displayStudentsAsMonsters = true
var playerMonsterMap = {}

// TODO: fix checkmarks 

function renderAlertsDisplay() {
    var counter = 1
    for (let alert of Object.keys(alerts)) {
        const formDiv = document.createElement('div')
        formDiv.className = "form-check"
        formDiv.innerHTML = `<style>#portal-alert${counter}:checked:before {background-color:${alertColorScale(alert)}}</style><input class="form-check-input portal-alert-checkbox" type="checkbox" value="" id="portal-alert${counter}"><label class="form-check-label" for="portal-alert${counter}">${alert}</label>`
        document.getElementById("portal-alerts-display").appendChild(formDiv)
        $("#portal-alert"+counter).change(function (e) {
            if ($(e.target).is(":checked")) {
                activeAlerts.add(alert)
            } else {
                activeAlerts.delete(alert)
            }
            updateSelectedStudents()
        })
        counter++
    }
}

function shouldFilterStudentPersistence(student, condition, comparisonValue) {
    if (student in persistenceData) {
        const value = persistenceData[student][persistenceData[student].length-1].percentileCompositeAcrossAttempts
        const delta = comparisonValue - value
        switch (condition) {
            case '<':
                return (delta <= 0)
            case '>':
                return (delta >= 0)
            case '=':
                return (delta != 0)
            case '>=':
                return (delta > 0)
            case '<=':
                return (delta < 0)
        }
    }

    // TODO: still include students with no persistence data
    return true
}

function shouldFilterStudentCompletedPuzzle(student, condition, puzzleNum) {
    const puzzleName = puzzleList[puzzleNum-1]
    if (student in completedPuzzleData) {
        switch (condition) {
            case "has":
                return !completedPuzzleData[student].has(puzzleName)
            default:
                return completedPuzzleData[student].has(puzzleName)
        }
    }

    return condition === "has" ? true : false
}

// returns true if the student should be removed
function shouldFilterStudent(student, filterName) {
    var shouldFilterStudent = false
    if (filterName === "All students") {
        return false
    }

    for (let filter of alerts[filterName]) {
        switch (filter[0]) {
            case 'persistence':
                shouldFilterStudent = shouldFilterStudentPersistence(student, filter[1], filter[2])
                break
            case 'completed_puzzles':
                shouldFilterStudent = shouldFilterStudentCompletedPuzzle(student, filter[1], filter[2])
                break
        }
        if (shouldFilterStudent) {
            return true
        }
    }
    return false
}

// TODO: what to color when you have multiple alerts
function updateSelectedStudents() {
    selectedStudents = {}
    for (let student of Object.keys(playerMap)) {
        var shouldAddStudent = false
        var alertName = null
        for (let filterName of activeAlerts) {
            if (!shouldFilterStudent(student, filterName)) {
                shouldAddStudent = true
                alertName = filterName
                break
            }
        }
        if (shouldAddStudent) {
            selectedStudents[student] = alertName
        }
    }
    
    svg.selectAll(".point")
        .attr("class", d => `point ${d in selectedStudents ? "alert-point" : ""}`)
        .attr("stroke", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
        .style("outline-color", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
}

function computeAndRenderClassStatistics() {
    const studentCount = Object.keys(playerMap).length
    
    var totalActiveTime = 0
    var totalTime = 0
    for (let puzzle of Object.keys(levelsOfActivityData)) {
        for (let student of Object.keys(playerMap)) {
            if (!(student in levelsOfActivityData[puzzle].no_normalization)) {
                continue
            }
            const levelsData = levelsOfActivityData[puzzle].no_normalization[student]
            totalTime += levelsData.timeTotal
            totalActiveTime += levelsData.active_time
        }
    }
    
    var totalPuzzlesCompleted = 0
    for (let student in completedPuzzleData) {
        totalPuzzlesCompleted += completedPuzzleData[student].size
    }

    var totalPuzzlesAttempted = 0
    for (let student in attemptedPuzzleData) {
        totalPuzzlesAttempted += attemptedPuzzleData[student].size
    }
    
    const statsMap = {
        'Avg. active time spent': formatTime(totalActiveTime / studentCount),
        'Avg. time spent': formatTime(totalTime / studentCount),
        'Avg. # of puzzles completed': (totalPuzzlesCompleted / studentCount).toFixed(1),
        'Avg. # of puzzles attempted': (totalPuzzlesAttempted / studentCount).toFixed(1)
    }
    renderClassStats(statsMap)
}

function renderClassStats(statsMap) {
    const listContainer = document.createElement("ul")
    listContainer.className = "portal-view-overview-unordered-list"
    for (let [description, value] of Object.entries(statsMap)) {
        const listElement = document.createElement("li")
        listElement.innerHTML = `${description}: <span class="italicized">${value}</span>`
        listContainer.appendChild(listElement)
    }
    document.getElementById("portal-view-overview-stats").appendChild(listContainer)
}

function renderOverviewViewsOptions() {
    const viewMap = {
        attemptedVsCompletedView: {
            name: 'Student Attempted vs. Completed',
            renderFunction: renderStudentAttemptedVsCompletedView
        }
    }

    var counter = 1
    for (let view of Object.keys(viewMap)) {
        const formDiv = document.createElement('div')
        formDiv.className = "form-check"
        formDiv.innerHTML = `<input class="form-check-input" type="radio" name="portal-overview-views-radio" value="${view}" id="portal-view${counter}" ${counter == 1 ? "checked" : ""}><label class="form-check-label" for="portal-view${counter}">${viewMap[view].name}</label>`
        document.getElementById("portal-view-overview-views").appendChild(formDiv)
        $("#portal-view" + counter).change(viewMap[view].renderFunction)
        if (counter === 1) {
            viewMap[view].renderFunction()
        }
        counter++
    }

    displayStudentsAsMonsters = $("#portal-toggle-creatures").is(":checked")
    $("#portal-toggle-creatures").change(function() {
        displayStudentsAsMonsters = $("#portal-toggle-creatures").is(":checked")
        renderStudentPoints()
    })
}

function initializeView() {
    const graphDiv = document.getElementById("portal-view-area")
    width = graphDiv.clientWidth - margin.left - margin.right
    height = graphDiv.clientHeight - margin.top - margin.bottom

    svg = d3.select("#portal-view-area").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    tooltip = d3.select("body").append("div")
        .attr("id", "portal-tooltip")
        .attr("class", "tooltip")
        .style("opacity", 0)

    xScale = d3.scaleLinear().range([0, width])
    yScale = d3.scaleLinear().range([height, 0])
    alertColorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(Object.keys(alerts))
    // TODO: initial rendering
}

function updateAxisScales(xDomain, yDomain) {
    xScale.domain(xDomain)
    yScale.domain(yDomain)
}

// redraw the scatter plot
function renderStudentAttemptedVsCompletedView() {
    svg.selectAll("*").remove()

    updateAxisScales([0,30], [0,30])

    const polygonPoints = [[0,0], [0,30], [30,30]]

    svg.append("polygon")
        .attr("points", polygonPoints.map(x => `${xScale(x[0])},${yScale(x[1])}`).join(" "))
        .style("fill", "#C6C6C6")

    svg.append("line")
        .attr("class", "guideline")
        .attr("x1", xScale(0))
        .attr("y1", yScale(0))
        .attr("x2", xScale(30))
        .attr("y2", yScale(30))

    for (let number of [5,10,15,20,25,30]) {
        svg.append("line")
            .attr("class", "guideline")
            .attr("x1", xScale(number))
            .attr("y1", yScale(0))
            .attr("x2", xScale(number))
            .attr("y2", yScale(number))

        svg.append("line")
            .attr("class", "guideline")
            .attr("x1", xScale(0))
            .attr("y1", yScale(number))
            .attr("x2", xScale(number))
            .attr("y2", yScale(number))
    }

    // draw x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).ticks(6))
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .style("fill", "#000")
        .text("# of Puzzles Attempted")

    // draw y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(yScale).ticks(6))
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .style("fill", "#000")
        .text("# of Puzzles Completed")

    renderStudentPoints()
}

function renderStudentPoints() {
    svg.selectAll(".point").remove()
    
    if (displayStudentsAsMonsters) {
        const monsterSize = 40
        svg.selectAll(".point")
            .data(Object.keys(playerMap))
            .enter()
            .append("image")
            .attr("xlink:href", d => playerMonsterMap[d])
            .attr("width", monsterSize)
            .attr("height", monsterSize)
            .attr("class", d => `point ${d in selectedStudents ? "alert-point" : ""}`)
            .attr("id", d => "portal-student-point" + d)
            .attr("x", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0) - (monsterSize / 2))
            .attr("y", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0) - (monsterSize / 2))
            .style("outline-color", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(`${anonymizeNames ? d : playerMap[d]}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 10) + "px")
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
            })
    } else {
        svg.selectAll(".point")
            .data(Object.keys(playerMap))
            .enter()
            .append("circle")
            .attr("class", d => `point ${d in selectedStudents ? "alert-point" : ""}`)
            .attr("id", d => "portal-student-point" + d)
            .attr("r", 3.5)
            .attr("cx", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0))
            .attr("cy", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0))
            .attr("stroke", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(`${anonymizeNames ? d : playerMap[d]}`)
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 10) + "px")
            })
            .on("mouseout", function (d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0)
            })
            .on("click", handleExperimentClick)
    }
}

function assignPlayersToMonsters() {
    var index = 0
    for (let player of Object.keys(playerMap)) {
        playerMonsterMap[player] = MONSTER_IMAGE_PATHS[index]
        index++
        if (index == MONSTER_IMAGE_PATHS.length) {
            index = 0
        }
    }
}

export function showPortal(pMap, puzzData, persistence, completed, attempted, loa, anonymize=true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        anonymizeNames = anonymize

        for (let puzzles of Object.values(puzzleData["puzzles"])) {
            puzzleList.push(...puzzles)
        }

        persistenceData = persistence
        completedPuzzleData = completed
        attemptedPuzzleData = attempted
        levelsOfActivityData = loa

        assignPlayersToMonsters()
    }

    showPage("portal-container", "nav-portal")
    if (!svg) {
        initializeView()
        renderOverviewViewsOptions()
        renderAlertsDisplay()
        computeAndRenderClassStatistics()
    }
}