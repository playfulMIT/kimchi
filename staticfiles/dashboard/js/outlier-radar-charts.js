import { showPage, puzzleNameToClassName, buildRadarChart, getClassAverage } from './helpers.js'
import { SANDBOX_PUZZLE_NAME, SANDBOX, METRIC_TO_METRIC_NAME, NORMALIZATION_OPTIONS } from './constants.js'

var playerMap = null
var puzzleData = null

var formattedData = null
var completedPuzzleData = null

var stdevCoeff = 2 
var minOutlierCount = 1
var minPuzzleCount = 1
var useCompletedClassAvg = false
var includeNegativeOutliers = false

var outlierMap = {}
const metricsToIgnore = new Set(["event", "different_events", "paint", "timeTotal", "inactive_time"])

var anonymizeNames = true 

function findOutliers() {
    outlierMap = {}
    for (let puzzle of Object.keys(formattedData)) {
        if (puzzle === SANDBOX_PUZZLE_NAME) continue 

        var statsMap = useCompletedClassAvg ? formattedData[puzzle]['completed_stats'] : formattedData[puzzle]['stats']

        for (let [metric, stats] of Object.entries(statsMap)) {
            if (metricsToIgnore.has(metric)) continue

            const threshold = stats["mean"] + stdevCoeff*stats["stdev"]
            const negative_threshold = stats["mean"] - stdevCoeff*stats["stdev"]
            for (let student of Object.keys(formattedData[puzzle])) {
                if (student === "avg" || student === "stats" || student === "completed_stats") continue
                if (useCompletedClassAvg && !completedPuzzleData[student].has(puzzle)) continue

                if (formattedData[puzzle][student][metric] > threshold || 
                    (includeNegativeOutliers && formattedData[puzzle][student][metric] < negative_threshold)) {
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

        if (Object.keys(outlierMap[student]).length === 0) {
            delete outlierMap[student]
        } else {
            var puzzlesPerMetric = {}
            for (let [puzzle, metrics] of Object.entries(outlierMap[student])) {
                for (let metric of metrics) {
                    if (!(metric in puzzlesPerMetric)) {
                        puzzlesPerMetric[metric] = new Set([puzzle])
                    } else {
                        puzzlesPerMetric[metric].add(puzzle)
                    }
                }
            }

            var puzzlesToKeep = {}
            for (let [metric, puzzles] of Object.entries(puzzlesPerMetric)) {
                if (puzzles.size > minPuzzleCount) {
                    for (let puzzle of puzzles) {
                        if (!(puzzle in puzzlesToKeep)) {
                            puzzlesToKeep[puzzle] = [metric]
                        } else {
                            puzzlesToKeep[puzzle].push(metric)
                        }
                    }
                }
            }

            for (let puzzle of Object.keys(outlierMap[student])) {
                if (puzzle in puzzlesToKeep) {
                    outlierMap[student][puzzle] = puzzlesToKeep[puzzle]
                } else {
                    delete outlierMap[student][puzzle]
                }
            }

            if (Object.keys(outlierMap[student]).length === 0) {
                delete outlierMap[student]
            }
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
    $("#outlier-accordion").empty()

    const sortedKeys = Object.keys(outlierMap).sort((a, b) => Object.keys(outlierMap[b]).length - Object.keys(outlierMap[a]).length)
    for (let student of sortedKeys) {
        const collapseId = "student-" + student + "-collapse"
        const studentName = anonymizeNames ? student : playerMap[student]

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
    if ($("#outlier-radar-stdev-coeff").val() === "" || $("#outlier-radar-min-metrics").val() === ""
        || $("#outlier-radar-min-puzzles").val() === "") {
        $("#outlier-radar-set-criteria-btn").prop("disabled", true)
    } else {
        $("#outlier-radar-set-criteria-btn").prop("disabled", false)
    }
}

export function showOutlierRadarCharts(pMap, puzzData, levelsOfActivity, completed, anonymize=true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        formattedData = levelsOfActivity
        anonymizeNames = anonymize

        completedPuzzleData = {}
        for (let student of Object.keys(completed)) {
            completedPuzzleData[student] = new Set(completed[student])
        }

        $("#outlier-radar-stdev-coeff").val(stdevCoeff)
        $("#outlier-radar-stdev-coeff").on("input", handleEmptyParam)
        $("#outlier-radar-min-metrics").val(minOutlierCount)
        $("#outlier-radar-min-metrics").on("input", handleEmptyParam)
        $("#outlier-radar-min-puzzles").val(minPuzzleCount)
        $("#outlier-radar-min-puzzles").on("input", handleEmptyParam)
        $("#outlier-radar-completed-avg").prop("checked", useCompletedClassAvg)
        $("#outlier-radar-negative-outliers").prop("checked", includeNegativeOutliers)

        $("#outlier-radar-set-criteria-btn").click(() => {
            stdevCoeff = parseInt($("#outlier-radar-stdev-coeff").val())
            minOutlierCount = parseInt($("#outlier-radar-min-metrics").val())
            minPuzzleCount = parseInt($("#outlier-radar-min-puzzles").val())
            useCompletedClassAvg = $("#outlier-radar-completed-avg").is(":checked")
            includeNegativeOutliers = $("#outlier-radar-negative-outliers").is(":checked")
            findOutliers()
        })

        $("#outlier-radar-set-filters-btn").click(() => {
            findOutliers()
        })

        showFilters()
        findOutliers()
    }
    
    showPage("outlier-radar-container", "nav-outlier-radar")
}