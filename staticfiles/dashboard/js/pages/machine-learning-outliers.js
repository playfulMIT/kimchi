import { showPage, puzzleNameToClassName, buildRadarChart, getClassAverage } from '../util/helpers.js'
import { SANDBOX_PUZZLE_NAME, SANDBOX, METRIC_TO_METRIC_NAME, NORMALIZATION_OPTIONS, NORMALIZATION_OPTION_KEYS } from '../util/constants.js'

const NORM_KEY = NORMALIZATION_OPTION_KEYS[NORMALIZATION_OPTIONS.NONE]
var playerMap = null
var puzzleData = null
var levelsOfActivity = null

var outlierData = null
var completedPuzzleData = null

var useCompletedClassAvg = false

const metricsToIgnore = new Set(["event", "different_events", "paint", "timeTotal", "inactive_time"])

var anonymizeNames = true

function showRadarModal(student, puzzle, metrics) {
    var axisList = []
    if (metrics.length === 1) {
        axisList = [...metrics, ...metrics, ...metrics]
    } else if (metrics.length === 2) {
        axisList = [...metrics, ...metrics]
    } else {
        axisList = metrics
    }

    const stats = useCompletedClassAvg ? formattedData[puzzle]['completed_stats'] : formattedData[puzzle]['stats']

    const studentData = {}
    studentData[student] = formattedData[puzzle][student]
    studentData["avg"] = getClassAverage(stats)

    const puzzleStats = {}
    puzzleStats[student] = stats
    puzzleStats["avg"] = stats

    $("#outlier-radar-modal-puzzle").text(puzzle)
    buildRadarChart(studentData, axisList, "#outlier-radar-svg", new Set([student, "avg"]), anonymizeNames ? null : playerMap, NORMALIZATION_OPTIONS.STANDARD, puzzleStats)
    $('#outlier-radar-modal').modal('show')
}

function showOutliersList() {
    $("#ml-outlier-accordion").empty()

    const sortedKeys = Object.keys(outlierData).sort((a, b) => Object.keys(outlierData[b]).length - Object.keys(outlierData[a]).length)
    for (let student of sortedKeys) {
        const collapseId = "ml-outlier-student-" + student + "-collapse"
        const studentName = anonymizeNames ? student : playerMap[student]

        const card = document.createElement("div")
        card.className = "card"

        const header = document.createElement("div")
        header.className = "card-header"
        header.id = "ml-outlier-student-" + student + "-header"
        header.innerHTML = `<h2 class="mb-0"><button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#${collapseId}"` +
            `aria-expanded="true" aria-controls="${collapseId}">${studentName}</button>` +
            `<span class="badge badge-warning outlier-student-badge">${Object.keys(outlierData[student]).length}</span></h2>`
        card.appendChild(header)

        const collapse = document.createElement("div")
        collapse.id = collapseId
        collapse.className = "collapse"
        collapse.setAttribute("aria-labelledby", header.id)
        collapse.setAttribute("data-parent", "#ml-outlier-accordion")

        const tableBodyId = "ml-outlier-student-" + student + "-table"
        const body = document.createElement("div")
        body.className = "card-body"
        body.innerHTML = `<table class="table"><thead><tr><th scope="col">Puzzle</th><th scope="col">Alerts</th></tr></thead><tbody id="${tableBodyId}"></tbody></table>`
        collapse.appendChild(body)
        card.appendChild(collapse)

        document.getElementById("ml-outlier-accordion").appendChild(card)

        for (let puzzle of outlierData[student]) {
            const puzzleClassName = puzzleNameToClassName(puzzle)
            const tr = document.createElement("tr")
            tr.innerHTML = `<th scope="row">${puzzle}</th><td id="ml-outlier-${student}-${puzzleClassName}-alerts"></td>` +
                `<td><button id="ml-outlier-${student}-${puzzleClassName}-radar-btn" type="button" class="btn btn-secondary btn-sm">Show &#187;</button></td>`
            $("#" + tableBodyId).append(tr)


            $(`#ml-outlier-${student}-${puzzleClassName}-alerts`).html(function () {
                const flags = []
                if (completedPuzzleData[student].has(puzzle)) {
                    flags.push("Completed")
                } else if (levelsOfActivity[puzzle][NORM_KEY][student].timeTotal >= 60) {
                    flags.push("Quickly abandonded")
                }
                
                return flags.join()

                // low time
                // low event percentile? 
                // outlier that completed and is below class avg
                // outlier on a puzzle of lower difficulty?
            })

            $(`#ml-outlier-${student}-${puzzleClassName}-radar-btn`).click(function () {
                alert("button clicked")
            })
        }
    }
}

function handleFilterCheckboxToggle(filter, event) {
    if ($(event.target).is(":checked")) {
        metricsToIgnore.delete(filter)
    } else {
        metricsToIgnore.add(filter)
    }
}

function showFilters() {
    $("#outlier-filters-container").empty()
    for (let [filter, filterName] of Object.entries(METRIC_TO_METRIC_NAME)) {
        const div = document.createElement("div")
        div.className = "form-check"

        const input = document.createElement("input")
        input.className = "form-check-input"
        input.type = "checkbox"
        if (!metricsToIgnore.has(filter)) input.checked = true
        input.id = filter + "-checkbox"
        input.oninput = (event) => handleFilterCheckboxToggle(filter, event)

        const label = document.createElement("label")
        label.className = "form-check-label"
        label.setAttribute("for", input.id)
        label.textContent = filterName
        div.appendChild(input)
        div.appendChild(label)

        document.getElementById("outlier-filters-container").appendChild(div)
    }
}

function handleEmptyParam() {
    if ($("#outlier-radar-stdev-coeff").val() === "" || $("#outlier-radar-min-metrics").val() === ""
        || $("#outlier-radar-min-puzzles").val() === "") {
        $("#outlier-radar-set-criteria-btn").prop("disabled", true)
    } else {
        $("#outlier-radar-set-criteria-btn").prop("disabled", false)
    }
}

export function showMachineLearningOutliers(pMap, puzzData, outliers, loa, completed, anonymize = true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        levelsOfActivity = loa
        outlierData = outliers
        anonymizeNames = anonymize

        completedPuzzleData = completed

        showOutliersList()
    }

    showPage("ml-outlier-container", "nav-ml-outliers")
}