import { showPage, formatTime, getClassAverage } from '../util/helpers.js'
import { MONSTER_IMAGE_PATHS } from '../util/constants.js'
import { blockDefinitions, setBlockCodeGeneration } from '../../../thesisdashboard/blockly/block-def.js'
import * as persistenceMountain from './persistence-mountain.js'
import * as customizeTab from './customize-alerts.js'
import * as filter from '../../../thesisdashboard/js/filter.js'
import { showCustomizeTab } from './customize-alerts.js';

const SVG_ID = "portal-view-svg"

var anonymizeNames = false
var playerMap = null
var puzzleData = null
var persistenceData = null
var persistenceByPuzzleData = null
var completedPuzzleData = null
var attemptedPuzzleData = null
var levelsOfActivityData = null
var insightsData = null
var puzzleList = []

var selectedOverviewView = null

// TODO: move axis titles

const alerts = {}

const viewMap = {
    attemptedVsCompletedView: {
        name: 'Student Attempted vs. Completed',
        renderFunction: renderStudentAttemptedVsCompletedView
    }
}

var activeAlerts = {}
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


export function getFilter(filterName) {
    return alerts[filterName]
}

export function setFilter(filterName, filter) {
    alerts[filterName] = filter
}

export function removeFilter(filterName) {
    delete alerts[filterName]
}

export function getFilterKeys() {
    return Object.keys(alerts)
}

export function getColorForFilter(filterName) {
    return alertColorScale(filterName)
}

function fetchSavedFiltersOnLoad() {
    const tempWorkspace = Blockly.inject('blockly-temp-container', { toolbox: document.getElementById('toolbox') })

    function saveToFilters(filterName, xmlString) {
        const xml = Blockly.Xml.textToDom(xmlString)
        Blockly.Xml.domToWorkspace(xml, tempWorkspace)
        const filter = Blockly.JavaScript.workspaceToCode(tempWorkspace)
        alerts[filterName] = JSON.parse(filter)
        tempWorkspace.clear()
    }

    try {
        for (var i = 0; i < window.localStorage.length; i++) {
            const filterName = window.localStorage.key(i)
            const xmlString = window.localStorage.getItem(filterName)
            saveToFilters(filterName, xmlString)
        }
        tempWorkspace.dispose()
    } catch (e) {
        alert("Unable to retrieve all of the previously saved filters.")
        console.error(e)
    }
}

export function renderAlertsDisplay() {
    var counter = 1
    const alertsDisplay = document.getElementById("portal-alerts-display")
    alertsDisplay.innerHTML = ''
    activeAlerts = {}

    for (let alert of Object.keys(alerts)) {
        const formDiv = document.createElement('div')
        formDiv.className = "form-check"
        formDiv.innerHTML = `<style>#portal-alert${counter}:checked:before {background-color:${alertColorScale(alert)}}</style><input class="form-check-input portal-alert-checkbox" type="checkbox" value="" id="portal-alert${counter}"><label class="form-check-label" for="portal-alert${counter}">${alert}</label>`
        alertsDisplay.appendChild(formDiv)
        $("#portal-alert"+counter).change(function (e) {
            if ($(e.target).is(":checked")) {
                activeAlerts[alert] = alerts[alert]
            } else {
                delete activeAlerts[alert]
            }
            updateSelectedStudents()
        })
        counter++
    }
}

function getPointClass(d) {
    return `point ${d in selectedStudents ? "alert-point" : Object.keys(activeAlerts).length ? "non-alert-point" : ""}`
}

// TODO: what to color when you have multiple alerts
function updateSelectedStudents() {
    selectedStudents = filter.retrieveSelectedStudents(Object.keys(playerMap), activeAlerts)
    
    svg.selectAll(".point")
        .attr("class", d => getPointClass(d))
        .attr("stroke", d => d in selectedStudents ? alertColorScale(selectedStudents[d][0]) : "#000")
        .style("outline-color", d => d in selectedStudents ? alertColorScale(selectedStudents[d][0]) : "#000")

    persistenceMountain.updateActiveStudentList(Object.keys(selectedStudents))
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
    renderWarningPuzzles()
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

function renderWarningPuzzles() {
    const listContainer = document.createElement("ul")
    listContainer.className = "portal-view-overview-unordered-list"
    const puzzleString = insightsData.warning_puzzles.map(v => puzzleList.findIndex(p => p === v)+1).sort((a,b) => a-b).join(", ")

    const listElement = document.createElement("li")
    listElement.innerHTML = 'Warning Puzzles:<br>' + puzzleString
    listContainer.appendChild(listElement)
    document.getElementById("portal-view-overview-attention-puzzles").appendChild(listContainer)
}

// additional ring for multiple alerts?

function renderOverviewViewsOptions() {
    var counter = 1
    for (let view of Object.keys(viewMap)) {
        const formDiv = document.createElement('div')
        formDiv.className = "form-check"
        formDiv.innerHTML = `<input class="form-check-input" type="radio" name="portal-overview-views-radio" value="${view}" id="portal-view${counter}" ${counter == 1 ? "checked" : ""}><label class="form-check-label" for="portal-view${counter}">${viewMap[view].name}</label>`
        document.getElementById("portal-view-overview-views").appendChild(formDiv)
        $("#portal-view" + counter).change(() => {
            selectedOverviewView = view
            viewMap[view].renderFunction()
        })
        if (counter === 1) {
            selectedOverviewView = view
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
        .attr("id", SVG_ID)

    tooltip = d3.select("body").append("div")
        .attr("id", "portal-tooltip")
        .attr("class", "tooltip")
        .style("opacity", 0)

    xScale = d3.scaleLinear().range([0, width])
    yScale = d3.scaleLinear().range([height, 0])
    alertColorScale = d3.scaleOrdinal(d3.schemeSet1).domain(Object.keys(alerts))
    // TODO: initial rendering
}

function updateAxisScales(xDomain, yDomain) {
    xScale.domain(xDomain)
    yScale.domain(yDomain)
}

function clearPortalViewArea() {
    svg.selectAll("*").remove()
    svg.attr("viewBox", `0 0 ${width} ${height}`)
}

// TODO: separate views to hanle loading

// redraw the scatter plot
function renderStudentAttemptedVsCompletedView() {
    clearPortalViewArea()

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

function getTooltipHTML(d) {
    const name = anonymizeNames ? 'Student ' + d : playerMap[d]
    const persistenceScore = d in persistenceData ? persistenceData[d][persistenceData[d].length - 1].percentileCompositeAcrossAttempts : "N/A"
    return `${name}<br>Persistence: ${persistenceScore}`
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
            .attr("class", d => getPointClass(d))
            .attr("id", d => "portal-student-point" + d)
            .attr("x", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0) - (monsterSize / 2))
            .attr("y", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0) - (monsterSize / 2))
            .style("outline-color", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(getTooltipHTML(d))
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
            .attr("class", d => getPointClass(d))
            .attr("id", d => "portal-student-point" + d)
            .attr("r", 3.5)
            .attr("cx", d => xScale(d in attemptedPuzzleData ? attemptedPuzzleData[d].size : 0))
            .attr("cy", d => yScale(d in completedPuzzleData ? completedPuzzleData[d].size : 0))
            .attr("stroke", d => d in selectedStudents ? alertColorScale(selectedStudents[d]) : "#000")
            .on("mouseover", function (d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9)

                tooltip.html(getTooltipHTML(d))
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

function renderOverviewTab() {
    clearPortalViewArea()
    viewMap[selectedOverviewView].renderFunction()
}

function renderPersistenceTab() {
    clearPortalViewArea()
    persistenceMountain.buildPersistenceMountain(document.getElementById(SVG_ID), persistenceData, playerMonsterMap, width, height)
}

function renderCustomizeTab() {
    $("#portal-view-customize-container").show()
    customizeTab.showCustomizeTab()
}

function hideCustomizeTab() {
    $("#portal-view-customize-container").hide()
}

function initializeBlocklyCode() {
    Blockly.defineBlocksWithJsonArray(blockDefinitions(puzzleList))
    setBlockCodeGeneration()
}

export function showPortal(pMap, puzzData, persistence, persistenceByPuzzle, completed, attempted, loa, insights, anonymize=true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        anonymizeNames = anonymize

        for (let puzzles of Object.values(puzzleData["puzzles"])) {
            puzzleList.push(...puzzles)
        }

        persistenceData = persistence
        persistenceByPuzzleData = persistenceByPuzzle
        completedPuzzleData = completed
        attemptedPuzzleData = attempted
        levelsOfActivityData = loa
        insightsData = insights

        assignPlayersToMonsters()
        initializeBlocklyCode()
        fetchSavedFiltersOnLoad()
        filter.setFilterModuleData(levelsOfActivityData, persistenceData, completedPuzzleData, attemptedPuzzleData, persistenceByPuzzleData)
    }
    
    showPage("portal-container", "nav-portal")
    if (!svg) {
        initializeView()
        renderOverviewViewsOptions()
        renderAlertsDisplay()
        computeAndRenderClassStatistics()

        $("#portal-overview-tab").on("show.bs.tab", function (event) {
            renderOverviewTab()
        })

        $("#portal-persistence-tab").on("show.bs.tab", function (event) {
            renderPersistenceTab()
        })

        $("#portal-customize-tab").on("show.bs.tab", function (event) {
            renderCustomizeTab()
        })

        $("#portal-customize-tab").on("hide.bs.tab", function (event) {
            hideCustomizeTab()
        })
    }
}