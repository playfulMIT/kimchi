import { showPage, showPlayerList, toCamelCase, createOptionDropdownItems, buildRadarChart, createNormalizationToggle, getClassAverage } from '../util/helpers.js'
import { SANDBOX_PUZZLE_NAME, DEFAULT_LEVELS_OF_ACTIVITY, NORMALIZATION_OPTIONS, NORMALIZATION_OPTION_KEYS } from '../util/constants.js'

var playerMap = null
var puzzleData = null

var formattedData = null

var currentDataset = {}
var currentPlayers = new Set()
var currentPuzzle = null
var studentsToAdd = new Set()
var currentStatistics = {}

var normalizationMode = NORMALIZATION_OPTIONS.NONE
var normalizationKey = NORMALIZATION_OPTION_KEYS[normalizationMode]

var axisValues = []

const playerButtonClass = "puzzle-radar-player"

function addStudentToChart(ids) {
    if (currentPuzzle) {
        for (let id of ids) {
            if (id === "avg") {
                currentDataset[id] = getClassAverage(formattedData[currentPuzzle][normalizationKey].all_stats) || DEFAULT_LEVELS_OF_ACTIVITY
                continue
            }

            currentDataset[id] = formattedData[currentPuzzle][normalizationKey][id] || DEFAULT_LEVELS_OF_ACTIVITY
            currentStatistics[id] = formattedData[currentPuzzle][normalizationKey].all_stats
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

    $(".puzzle-plus-option-button").each(function(i, e) {
        if ($(e).text() === " Option") return
        newAxisValues.push($(e).attr("dropdown-value"))
    })

    axisValues = newAxisValues
    createRadarChart()
}

function reselectDataAndBuild(event, puzzle) {
    $("#puzzle-dropdown-button").text(puzzle)
    $(".puzzle-dropdown-option").removeClass("active")
    if (event) {
        $(event.target).addClass("active")
    }

    currentPuzzle = puzzle
    currentDataset = {}

    for (let player of currentPlayers) {
        if (player === "avg") {
            currentDataset[player] = getClassAverage(formattedData[currentPuzzle][normalizationKey].all_stats) || DEFAULT_LEVELS_OF_ACTIVITY
        } else {
            currentDataset[player] = (normalizationMode !== 0 ? formattedData[currentPuzzle][normalizationKey].all_stats[player] : formattedData[currentPuzzle][normalizationKey][player]) || DEFAULT_LEVELS_OF_ACTIVITY
        }
    }
    createRadarChart()
} 

function onPuzzleClick(event, puzzle) {
    reselectDataAndBuild(event, puzzle)
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
    buildRadarChart(currentDataset, axisValues, '#puzzle-radar-chart', currentPlayers, playerMap)
}

function handleAddStudentButtonClick(pk) {
    const formatSelectedPlayers = (players) => {
        return players.size > 0 ? [...players].map(p => playerMap[p]).join(', ') : "None"
    }

    if (studentsToAdd.has(pk)) {
        studentsToAdd.delete(pk)
        $(`#${pk}.${playerButtonClass}`).removeClass("active")
    } else if (pk === null) {
        studentsToAdd = new Set()
    } else {
        studentsToAdd.add(pk)
        $(`#${pk}.${playerButtonClass}`).addClass("active")
    }

    if (studentsToAdd.size > 0) {
        $("#add-student-radar").prop("disabled", false)
    } else {
        $("#add-student-radar").prop("disabled", true)
    }

    $("#selected-player-radar").text(formatSelectedPlayers(studentsToAdd))
}

function toggleNormalization(event) {
    normalizationMode = NORMALIZATION_OPTIONS[event.target.value]
    normalizationKey = NORMALIZATION_OPTION_KEYS[normalizationMode]
    reselectDataAndBuild(null, currentPuzzle)
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
            showPlayerList(playerButtonClass, "add-player-list", filteredPlayerMap, (event) => handleAddStudentButtonClick(event.target.id))

            if (currentPuzzle) {
                for (let key of Object.keys(filteredPlayerMap)) {
                    if (!formattedData[currentPuzzle][normalizationKey][key] || formattedData[currentPuzzle][normalizationKey][key].event == 0) {
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