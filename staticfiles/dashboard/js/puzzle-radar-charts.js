import { showPage, showPlayerList, toCamelCase, createOptionDropdownItems, buildRadarChart, createNormalizationToggle } from './helpers.js'
import { SANDBOX_PUZZLE_NAME, DEFAULT_LEVELS_OF_ACTIVITY } from './constants.js'

var playerMap = null
var puzzleData = null

var formattedData = null

var currentDataset = {}
var currentStatistics = {}
var currentPlayers = new Set()
var currentPuzzle = null
var studentsToAdd = new Set()

// TODO: stop legend from changing color
// TODO: change avg to median
// TODO: make option things more salient 

var normalizationOn = false

var axisValues = []
var axisNames = []

// TODO: optimize render 

function addStudentToChart(ids) {
    if (currentPuzzle) {
        for (let id of ids) {
            currentDataset[id] = formattedData[currentPuzzle][id] || DEFAULT_LEVELS_OF_ACTIVITY
            currentStatistics[id] = formattedData[currentPuzzle].stats
        }
    }
    currentPlayers = new Set([...currentPlayers, ...ids])

    const playerList = Array.from(currentPlayers)
    d3.select("#radar-players").selectAll(".player-button-radar")
        .data(playerList).enter()
        .append("button")
        .attr("id", d => `player-button-radar-${d}`)
        .classed("player-button-radar btn btn-light", true)
        .attr("type", "button")
        .text(d => d === "avg" ? "Class Avg." : playerMap[d])
        .on("mouseover", (d) => {
            d3.select(`#player-button-radar-${d}`)
                .classed("btn-light", false)
                .classed("btn-danger", true)
        })
        .on("mouseout", (d) => {
            d3.select(`#player-button-radar-${d}`)
                .classed("btn-danger", false)
                .classed("btn-light", true)
        })
        .on("click", d => {
            d3.select(`#player-button-radar-${d}`).remove()
            removeStudentFromChart(d)
        })
        .append("span")
        .attr("aria-hidden", "true")
        .html("&nbsp;&times;")

    createRadarChart()
}

function removeStudentFromChart(id) {
    delete currentDataset[id]
    delete currentStatistics[id]
    currentPlayers.delete(id)
    createRadarChart()
}

function buildChartWithNewAxes() {
    var newAxisValues = []
    var newAxisNames = []

    $(".puzzle-plus-option-button").each(function(i, e) {
        if ($(e).text() === " Option") return
        newAxisValues.push($(e).attr("dropdown-value"))
        newAxisNames.push($(e).text())
    })

    axisValues = newAxisValues
    axisNames = newAxisNames
    createRadarChart()
}

function onPuzzleClick(event, puzzle) {
    $("#puzzle-dropdown-button").text(puzzle)
    $(".puzzle-dropdown-option").removeClass("active")
    $(event.target).addClass("active")

    currentPuzzle = puzzle
    currentDataset = {}
    currentStatistics = {}

    for (let player of currentPlayers) {
        currentDataset[player] = formattedData[currentPuzzle][player] || DEFAULT_LEVELS_OF_ACTIVITY
        currentStatistics[player] = formattedData[currentPuzzle].stats
    }
    createRadarChart()
} 

function createPuzzleDropdown() {
    const dropdown = document.getElementById("puzzle-dropdown-options")
    var firstIter = true

    for (let [difficulty, puzzles] of Object.entries(puzzleData["puzzles"])) {
        if (!firstIter) {
            const divider = document.createElement("div")
            divider.className = "dropdown-divider"
            dropdown.appendChild(divider)
        }
        firstIter = false

        const header = document.createElement("h6")
        header.className = "dropdown-header"
        header.textContent = toCamelCase(difficulty)
        dropdown.appendChild(header)

        for (let puzzle of puzzles) {
            const link = document.createElement("a")
            link.className = "puzzle-dropdown-option dropdown-item"
            link.href = "#"
            link.textContent = puzzle
            link.onclick = (event) => onPuzzleClick(event, puzzle)
            dropdown.appendChild(link)
        }
    }

    if (puzzleData["canUseSandbox"]) {
        if (!firstIter) {
            const divider = document.createElement("div")
            divider.className = "dropdown-divider"
            dropdown.appendChild(divider)
        }

        const link = document.createElement("a")
        link.className = "puzzle-dropdown-option dropdown-item"
        link.href = "#"
        link.textContent = SANDBOX_PUZZLE_NAME
        link.onclick = (event) => onPuzzleClick(event, SANDBOX_PUZZLE_NAME)
        dropdown.appendChild(link)
    }
}   

function createRadarChart() {
    if (normalizationOn) {
        buildRadarChart(currentDataset, axisValues, axisNames, '#puzzle-radar-chart', currentPlayers, playerMap, true, currentStatistics)
    } else {
        buildRadarChart(currentDataset, axisValues, axisNames, '#puzzle-radar-chart', currentPlayers, playerMap, false, currentStatistics)
    }
}

function handleAddStudentButtonClick(pk) {
    const formatSelectedPlayers = (players) => {
        return players.size > 0 ? [...players].map(p => playerMap[p]).join(', ') : "None"
    }

    if (studentsToAdd.has(pk)) {
        studentsToAdd.delete(pk)
        $(`#${pk}`).removeClass("active")
    } else if (pk === null) {
        studentsToAdd = new Set()
    } else {
        studentsToAdd.add(pk)
        $(`#${pk}`).addClass("active")
    }

    if (studentsToAdd.size > 0) {
        $("#add-student-radar").prop("disabled", false)
    } else {
        $("#add-student-radar").prop("disabled", true)
    }

    $("#selected-player-radar").text(formatSelectedPlayers(studentsToAdd))
}

function toggleNormalization(event) {
    normalizationOn = $(event.target).is(":checked")
    createRadarChart()
}

export function showPuzzleRadarCharts(pMap, puzzData, levelsOfActivity) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        formattedData = levelsOfActivity

        createPuzzleDropdown()
        createNormalizationToggle("puzzle-radar-container", toggleNormalization)
        createOptionDropdownItems("radar-puzzle-option-1-dropdown", "radar-puzzle-option-1", "radar-puzzle-", "puzzle-plus-option-button", 1)
        $("#build-puzzle-radar-button").click(buildChartWithNewAxes)

        $("#add-class-average-button").on("click", () => addStudentToChart(new Set(["avg"])))
        $("#add-student-button-radar").on("click", () => addStudentToChart(studentsToAdd))

        $("#add-student-modal-radar").on("show.bs.modal", () => {
            const filteredPlayerMap = Object.assign(...Object.keys(playerMap)
                .filter(key => !currentPlayers.has(key))
                .map(key => ({ [key]: playerMap[key] })))

            $("#add-player-list").empty()
            showPlayerList("add-player-list", filteredPlayerMap, (event) => handleAddStudentButtonClick(event.target.id))

            if (currentPuzzle) {
                for (let key of Object.keys(filteredPlayerMap)) {
                    if (!formattedData[currentPuzzle][key] || formattedData[currentPuzzle][key].event == 0) {
                        $(`button#${key}`).removeClass("btn-secondary").addClass("btn-danger")
                        $(`button#${key}`).css("background-color", "red")
                    }
                }
            }

            handleAddStudentButtonClick(null)
        })

        $("#add-student-modal-radar").on("hidden.bs.modal", () => handleAddStudentButtonClick(null))
    }
    
    showPage("puzzle-radar-container", "nav-puzzle-radar")
}