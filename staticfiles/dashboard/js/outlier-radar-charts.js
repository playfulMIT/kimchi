import { showPage, puzzleNameToClassName, buildRadarChart } from './helpers.js'
import { SANDBOX_PUZZLE_NAME, SANDBOX, METRIC_TO_METRIC_NAME } from './constants.js'

var playerMap = null
var puzzleData = null

var formattedData = null

var stdevCoeff = 2 
var minOutlierCount = 1

var outlierMap = {}
const metricsToIgnore = new Set(["event", "different_events", "paint"])

function findOutliers() {
    outlierMap = {}
    for (let puzzle of Object.keys(formattedData)) {
        if (puzzle === SANDBOX_PUZZLE_NAME) continue 

        for (let [metric, stats] of Object.entries(formattedData[puzzle]['stats'])) {
            if (metricsToIgnore.has(metric)) continue

            const threshold = stats["mean"] + stdevCoeff*stats["stdev"]
            for (let student of Object.keys(formattedData[puzzle])) {
                if (student === "avg" || student === "stats") continue

                if (formattedData[puzzle][student][metric] > threshold) {
                    if (!(student in outlierMap)) {
                        outlierMap[student] = {}
                    }
                    if (!(puzzle in outlierMap[student])) {
                        outlierMap[student][puzzle] = []
                    }
                    outlierMap[student][puzzle].push(metric)
                }
            }
        }
    }

    for (let student of Object.keys(outlierMap)) {
        for (let [puzzle, metrics] of Object.entries(outlierMap[student])) {
            if (metrics.length < minOutlierCount) {
                delete outlierMap[student][puzzle]
            }
        }
        if (Object.keys(outlierMap[student]) === 0) {
            delete outlierMap[student]
        }
    }

    showOutliersList()
}

function showRadarModal(student, puzzle, metrics) {
    var axisList = []
    if (metrics.length === 1) {
        axisList = [...metrics, ...metrics, ...metrics]
    } else if (metrics.length === 2) {
        axisList = [...metrics, ...metrics]
    } else {
        axisList = metrics
    }

    const studentData = {}
    studentData[student] = formattedData[puzzle][student]
    studentData["avg"] = formattedData[puzzle]["avg"]

    const puzzleStats = {}
    puzzleStats[student] = formattedData[puzzle]['stats']
    puzzleStats["avg"] = formattedData[puzzle]['stats']

    $("#outlier-radar-modal-puzzle").text(puzzle)
    buildRadarChart(studentData, axisList, "#outlier-radar-svg", new Set([student, "avg"]), playerMap, true, puzzleStats)
    $('#outlier-radar-modal').modal('show')
}

function showOutliersList() {
    $("#outlier-accordion").empty()

    const sortedKeys = Object.keys(outlierMap).sort((a, b) => Object.keys(outlierMap[b]).length - Object.keys(outlierMap[a]).length)
    for (let student of sortedKeys) {
        const collapseId = "student-" + student + "-collapse"
        const studentName = playerMap[student]

        const card = document.createElement("div")
        card.className = "card"

        const header = document.createElement("div")
        header.className = "card-header"
        header.id = "student-" + student + "-header"
        header.innerHTML = `<h2 class="mb-0"><button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#${collapseId}"` + 
            `aria-expanded="true" aria-controls="${collapseId}">${studentName}</button>` + 
            `<span class="badge badge-warning outlier-student-badge">${Object.keys(outlierMap[student]).length}</span></h2>`
        card.appendChild(header)

        const collapse = document.createElement("div")
        collapse.id = collapseId
        collapse.className = "collapse"
        collapse.setAttribute("aria-labelledby", header.id)
        collapse.setAttribute("data-parent", "#outlier-accordion")
        
        const tableBodyId = "outlier-student-" + student + "-table"
        const body = document.createElement("div")
        body.className = "card-body"
        body.innerHTML = `<table class="table"><thead><tr><th scope="col">Puzzle</th><th scope="col">Outlier Metrics</th><th scope="col">Radar Chart</th></tr></thead><tbody id="${tableBodyId}"></tbody></table>`
        collapse.appendChild(body)
        card.appendChild(collapse)

        document.getElementById("outlier-accordion").appendChild(card)

        for (let [puzzle, metrics] of Object.entries(outlierMap[student])) {
            const tr = document.createElement("tr")
            tr.innerHTML = `<th scope="row">${puzzle}</th><td>${metrics.map(v => METRIC_TO_METRIC_NAME[v]).join(", ")}</td>` +
                `<td><button id="${student}-${puzzleNameToClassName(puzzle)}-radar-btn" type="button" class="btn btn-secondary btn-sm">Show &#187;</button></td>`
            $("#" + tableBodyId).append(tr)

            $(`#${student}-${puzzleNameToClassName(puzzle)}-radar-btn`).click(function () {
                showRadarModal(student, puzzle, metrics)
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
    if ($("#outlier-radar-stdev-coeff").val() === "" || $("#outlier-radar-min-metrics").val() === "") {
        $("#outlier-radar-set-criteria-btn").prop("disabled", true)
    } else {
        $("#outlier-radar-set-criteria-btn").prop("disabled", false)
    }
}

export function showOutlierRadarCharts(pMap, puzzData, levelsOfActivity) {
    playerMap = pMap
    puzzleData = puzzData
    formattedData = levelsOfActivity

    if (puzzleData["canUseSandbox"]) {
        puzzleData["puzzles"][SANDBOX] = [SANDBOX_PUZZLE_NAME]
    }

    $("#outlier-radar-stdev-coeff").val(stdevCoeff)
    $("#outlier-radar-stdev-coeff").on("input", handleEmptyParam)
    $("#outlier-radar-min-metrics").val(minOutlierCount)
    $("#outlier-radar-min-metrics").on("input", handleEmptyParam)

    $("#outlier-radar-set-criteria-btn").click(() => {
        stdevCoeff = parseInt($("#outlier-radar-stdev-coeff").val())
        minOutlierCount = parseInt($("#outlier-radar-min-metrics").val())
        findOutliers()
    })

    $("#outlier-radar-set-filters-btn").click(() => {
        findOutliers()
    })

    showFilters()
    findOutliers()
    showPage("outlier-radar-container", "nav-outlier-radar")
}