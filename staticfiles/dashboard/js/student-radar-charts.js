import { showPage, puzzleNameToClassName, createOptionDropdownItems, buildRadarChart, createNormalizationToggle } from './helpers.js'
import { SANDBOX_PUZZLE_NAME, DEFAULT_LEVELS_OF_ACTIVITY, SANDBOX } from './constants.js'

var playerMap = null
var puzzleData = null

var formattedData = null

var currentDataset = {}
var currentStatistics = {}
var normalizationOn = false

var currentPuzzles = new Set()
var currentStudent = null
var puzzlesToAdd = new Set()

// TODO: stop legend from changing color
// TODO: change avg to median

var axisValues = []

function addPuzzleToChart(puzzles) {
    if (currentStudent) {
        for (let puzzle of puzzles) {
            currentDataset[puzzle] = formattedData[puzzle][currentStudent] || DEFAULT_LEVELS_OF_ACTIVITY
            currentStatistics[puzzle] = formattedData[puzzle].stats
        }
    }

    currentPuzzles = new Set([...currentPuzzles, ...puzzles])
    
    const puzzleList = Array.from(currentPuzzles)
    d3.select("#radar-puzzles").selectAll(".puzzle-button-radar")
        .data(puzzleList).enter()
        .append("button")
        .attr("id", d => `puzzle-button-radar-${puzzleNameToClassName(d)}`)
        .classed("puzzle-button-radar btn btn-light", true)
        .attr("type", "button")
        .text(d => d)
        .on("mouseover", (d) => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`)
                .classed("btn-light", false)
                .classed("btn-danger", true)
        })
        .on("mouseout", (d) => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`)
                .classed("btn-danger", false)
                .classed("btn-light", true)
        })
        .on("click", d => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`).remove()
            removePuzzleFromChart(d)
        })
        .append("span")
        .attr("aria-hidden", "true")
        .html("&nbsp;&times;")

    createRadarChart()
}

function removePuzzleFromChart(puzzle) {
    delete currentDataset[puzzle]
    delete currentStatistics[puzzle]
    currentPuzzles.delete(puzzle)
    createRadarChart()
}

function buildChartWithNewAxes() {
    var newAxisValues = []

    $(".student-plus-option-button").each(function (i, e) {
        if ($(e).text() === " Option") return
        newAxisValues.push($(e).attr("dropdown-value"))
    })

    axisValues = newAxisValues
    createRadarChart()
}

function showPuzzleList(puzzleList) {
    for (const puzzle of puzzleList) {
        const button = document.createElement("button")
        const buttonId = puzzleNameToClassName(puzzle)

        button.id = buttonId
        button.className = "puzzle-button list-group-item list-group-item-action btn-secondary"
        button.type = "button"
        button.textContent = puzzle
        document.getElementById("add-puzzle-list").appendChild(button)
        $(`#${buttonId}`).click(function () { handleAddPuzzleButtonClick(puzzle) })
    }
}

function onStudentClick(event, id, name) {
    $("#student-dropdown-button").text(name)
    $(".student-dropdown-option").removeClass("active")
    $(event.target).addClass("active")

    currentStudent = id
    currentDataset = {}
    currentStatistics = {}

    for (let puzzle of currentPuzzles) {
        currentDataset[puzzle] = formattedData[puzzle][currentStudent] || DEFAULT_LEVELS_OF_ACTIVITY
        currentStatistics[puzzle] = formattedData[puzzle].stats
    }
    createRadarChart()
}

function createStudentDropdown() {
    const dropdown = document.getElementById("student-dropdown-options")
    const link = document.createElement("a")
    link.className = "student-dropdown-option dropdown-item"
    link.textContent = "Class Avg."
    link.href = "#"
    link.onclick = (event) => onStudentClick(event, "avg", "Class Avg.")
    dropdown.appendChild(link)

    const divider = document.createElement("div")
    divider.className = "dropdown-divider"
    dropdown.appendChild(divider)

    for (let [id, player] of Object.entries(playerMap)) {
        const playerLink = document.createElement("a")
        playerLink.className = "student-dropdown-option dropdown-item"
        playerLink.textContent = player
        playerLink.href = "#"
        playerLink.onclick = (event) => onStudentClick(event, id, player)
        dropdown.appendChild(playerLink)
    }
}

function createRadarChart() {
    if (normalizationOn) {
        buildRadarChart(currentDataset, axisValues, '#student-radar-chart', currentPuzzles, null, true, currentStatistics)
    } else {
        buildRadarChart(currentDataset, axisValues, '#student-radar-chart', currentPuzzles, null, false, currentStatistics)
    }
}

function handleAddPuzzleButtonClick(puzzle) {
    const formatSelectedPuzzles = (puzzles) => {
        return puzzles.size > 0 ? Array.from(puzzles).join(', ') : "None"
    }

    const puzzleId = puzzle ? puzzleNameToClassName(puzzle) : ""
    if (puzzlesToAdd.has(puzzle)) {
        puzzlesToAdd.delete(puzzle)
        $(`#${puzzleId}`).removeClass("active")
    } else if (puzzle === null) {
        puzzlesToAdd = new Set()
    } else {
        puzzlesToAdd.add(puzzle)
        $(`#${puzzleId}`).addClass("active")
    }

    if (puzzlesToAdd.size > 0) {
        $("#add-puzzle-radar").prop("disabled", false)
    } else {
        $("#add-puzzle-radar").prop("disabled", true)
    }

    $("#selected-puzzle-radar").text(formatSelectedPuzzles(puzzlesToAdd))
}

function toggleNormalization(event) {
    normalizationOn = $(event.target).is(":checked")
    createRadarChart()
}

export function showStudentRadarCharts(pMap, puzzData, levelsOfActivity) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        formattedData = levelsOfActivity

        if (puzzleData["canUseSandbox"]) {
            puzzleData["puzzles"][SANDBOX] = [SANDBOX_PUZZLE_NAME]
        }

        createStudentDropdown()
        createNormalizationToggle("student-radar-container", toggleNormalization)
        createOptionDropdownItems("radar-student-option-1-dropdown", "radar-student-option-1", "radar-student-", "student-plus-option-button", 1)
        $("#build-student-radar-button").click(buildChartWithNewAxes)

        $("#add-puzzle-button-radar").on("click", () => addPuzzleToChart(puzzlesToAdd))

        $("#add-puzzle-modal-radar").on("show.bs.modal", () => {
            const filteredPuzzleList = Object.values(puzzleData["puzzles"]).reduce((prev, curr) => {
                prev.push(...curr.filter(v => !currentPuzzles.has(v)))
                return prev
            }, [])

            $("#add-puzzle-list").empty()
            showPuzzleList(filteredPuzzleList)

            if (currentStudent) {
                for (let puzzle of filteredPuzzleList) {
                    if (!formattedData[puzzle][currentStudent] || formattedData[puzzle][currentStudent].event == 0) {
                        const id = puzzleNameToClassName(puzzle)
                        $(`button#${id}`).removeClass("btn-secondary").addClass("btn-danger")
                        $(`button#${id}`).css("background-color", "red")
                    }
                }
            }

            handleAddPuzzleButtonClick(null)
        })

        $("#add-puzzle-modal-radar").on("hidden.bs.modal", () => handleAddPuzzleButtonClick(null))
    } 

    showPage("student-radar-container", "nav-student-radar")
}