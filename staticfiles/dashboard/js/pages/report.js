import { callAPI, formatTime, createPuzzleSelectionTool } from "../util/helpers.js"
import { API } from "../util/constants.js"

const COMPETENCY_REPORT_COLUMNS = [
    {
        label: "Student",
        getValueFunction: (student) => playerMap[student],
        renderFunction: null,
        cellClass: (student) => "font-weight-bolder"
    },
    {
        label: "GMD.4",
        getValueFunction: (student) => student in competencyData ? competencyData[student]["GMD.4"].score : 0,
        renderFunction: null,
        cellClass: (student) => ""
    },
    {
        label: "CO.5",
        getValueFunction: (student) => student in competencyData ? competencyData[student]["CO.5"].score : 0,
        renderFunction: null,
        cellClass: (student) => ""
    },
    {
        label: "CO.6",
        getValueFunction: (student) => student in competencyData ? competencyData[student]["CO.6"].score : 0,
        cellClass: (student) => ""
    },
    {
        label: "MG.1",
        getValueFunction: (student) => student in competencyData ? competencyData[student]["MG.1"].score : 0,
        renderFunction: null,
        cellClass: (student) => ""
    },
    {
        label: "Trustworthiness (out of 100)",
        getValueFunction: (student) => student in competencyData ? Object.values(competencyData[student])[0].pca_normalized * 100 : 100,
        renderFunction: (value) => value.toFixed(2),
        cellClass: (student) => ""
    }
]

const PUZZLE_REPORT_COLUMNS = [
    {
        label: "Student",
        getValueFunction: (student) => playerMap[student],
        renderFunction: null,
        cellClass: (student) => "font-weight-bolder"
    },
    {
        label: "Last Active",
        getValueFunction: (student) => reportData[student].last_active,
        renderFunction: (date) => {
            const dateObj = new Date(date)
            return dateObj.getTime() ? d3.timeFormat("%c")(dateObj) : "N/A"
        },
        cellClass: (date) => {
            const dateObj = new Date(date)
            return dateObj.getTime() ? "" : "table-danger"
        }
    },
    {
        label: "% Puzzles Attempted",
        getValueFunction: (student) => reportData[student].attempted.filter(p => selectedPuzzles.has(p)).length * 100 / 30,
        renderFunction: (value) => (Math.round(value) !== value ? value.toFixed(2) : value) + "%",
        cellClass: (value) => value ? "" : "small-cell table-danger"
    },
    {
        label: "% Puzzles Completed",
        getValueFunction: (student) => reportData[student].completed.filter(p => selectedPuzzles.has(p)).length * 100 / 30,
        renderFunction: (value) => (Math.round(value) !== value ? value.toFixed(2) : value) + "%",
        cellClass: (value) => value ? "" : "small-cell table-danger"
    },
    {
        label: "Active Time",
        getValueFunction: (student) => reportData[student].active_time,
        renderFunction: (time) => formatTime(time),
        cellClass: (time) => time ? "" : "medium-cell table-danger"
    },
    {
        label: "Total Time",
        getValueFunction: (student) => reportData[student].total_time,
        renderFunction: (time) => formatTime(time),
        cellClass: (time) => time ? "" : "medium-cell table-danger"
    },
    {
        label: "Puzzles",
        getValueFunction: (student, puzzle) => getPuzzleValue(student, puzzle),
        renderFunction: (status) => puzzleStatusToSymbol(status),
        cellClass: (status) => ""
    },
    {
        label: "",
        getValueFunction: () => "",
        renderFunction: (value) => value,
        cellClass: (value) => "last-cell"
    }
]

function getCompetencyRowClass(student) {
    return !(student in competencyData) || (Object.values(competencyData[student])[0].model_accuracy === "N/A") ? "table-danger" : ""
} 

var playerMap = null
var competencyData = null
var reportData = null
var puzzleList = []
var selectedPuzzles = null
var tempSelectedPuzzles = new Set()
var prevLoadedReport = false

function checkDate(startDate, endDate) {
    if (!startDate || !endDate || endDate < startDate) {
        alert("Please input a valid date range!")
        return false
    }

    return true
}

function getPuzzleValue(student, puzzle) {
    if (puzzle in reportData[student].puzzles) {
        return reportData[student].puzzles[puzzle]
    }
    return { active_time: 0, total_time: 0, opened: 0, submitted: 0, completed: 0}
}

function puzzleStatusToSymbol(status) {
    if (status.completed) {
        return '<span class="text-success"><i class="fas fa-check-circle fa-lg"></i></span>'
    } else if (status.submitted) {
        return `<span class="fa-layers fa-fw text-warning"><i class="fas fa-circle fa-lg"></i><span class="fa-layers-text fa-inverse" data-fa-transform="shrink-1 right-1" style="font-weight:800">${status.submitted}</span></span>`
    } else if (status.opened) {
        return '<span class="text-secondary"><i class="fas fa-minus-circle fa-lg"></i></span>'
    }

    return ''
}

async function loadPuzzleReport(start = null, end = null) {
    $("#portal-puzzle-report-table-container").hide()
    $("#portal-puzzle-report-loader").show()
    $("#portal-puzzle-puzzle-report-settings *").prop('disabled', true)

    const url = start ? `${API}/report/${start}/${end}` : `${API}/report`
    callAPI(url).then(result => {
        reportData = result
        $("#portal-puzzle-report-loader").hide()
        $("#portal-puzzle-report-table-container").show()
        $("#portal-puzzle-report-settings *").prop('disabled', false)
        displayPuzzleReport()
    })
}

function displayPuzzleReport() {
    prevLoadedReport = true
    const table = document.getElementById("portal-puzzle-report-table")
    table.innerHTML = ""

    const header = document.createElement("thead")
    header.className = "thead-light"

    // const firstHeaderRow = document.createElement("tr")
    // header.appendChild(firstHeaderRow)
    const secondHeaderRow = document.createElement("tr")
    header.appendChild(secondHeaderRow)
    
    const selectedPuzzleList = Array.from(selectedPuzzles).map(puzzle => puzzleList.findIndex(v => v === puzzle)).sort((a,b) => a-b).map(index => puzzleList[index])
    var postPuzzle = false

    for (let column of PUZZLE_REPORT_COLUMNS) {
        if (column.label === "Puzzles") {
            // const puzzleCell = document.createElement("th")
            // puzzleCell.colSpan = "" + puzzleList.length
            // puzzleCell.style.textAlign = "center"
            // puzzleCell.textContent = "Puzzles"
            // firstHeaderRow.appendChild(puzzleCell)

            var index = 0
            for (let puzzle of selectedPuzzleList) {
                const headerCell = document.createElement("th")
                headerCell.scope = "col"
                headerCell.className = "rotated"
                headerCell.innerHTML = `<div class="rotated-header-container ${!index ? "non-spaced-header-container" : ""}"><div class="rotated-header-content">${puzzle}</div></div>`
                secondHeaderRow.appendChild(headerCell)
                index++
            }
            postPuzzle = true
        } else {
            // firstHeaderRow.appendChild(document.createElement("th"))

            const headerCell = document.createElement("th")
            headerCell.scope = "col"
            // if (column.label === "Student") headerCell.className = "first-col"
            if (postPuzzle) {
                headerCell.innerHTML = `<div class="spaced-header-container">${column.label}</div>`
                postPuzzle = false
            } else {
                headerCell.innerHTML = column.label
            }
            secondHeaderRow.appendChild(headerCell)
        }
    }

    const body = document.createElement("tbody")

    const sortedStudentList = isNaN(Object.values(playerMap)[0]) ? Object.keys(playerMap).sort((a, b) => playerMap[a].toLowerCase().localeCompare(playerMap[b].toLowerCase())) : Object.keys(playerMap)
    for (let student of sortedStudentList) {
        const row = document.createElement("tr")
        body.appendChild(row)

        for (let column of PUZZLE_REPORT_COLUMNS) {
            if (column.label === "Puzzles") {
                for (let i = 0; i < selectedPuzzleList.length; i++) {
                    const puzzle = selectedPuzzleList[i]
                    const puzzleCell = document.createElement("td")
                    const value = column.getValueFunction(student, puzzle)
                    puzzleCell.className = column.cellClass(value) + " bordered-cell"
                    puzzleCell.innerHTML = column.renderFunction ? column.renderFunction(value) : value
                    row.appendChild(puzzleCell)
                }
                continue
            }
            
            const bodyCell = document.createElement("td")
            const value = column.getValueFunction(student)
            bodyCell.className = column.cellClass(value) + " bordered-cell"
            // if (column.label === "Student") bodyCell.className += " first-col"
            bodyCell.innerHTML = column.renderFunction ? column.renderFunction(value) : value
            
            row.appendChild(bodyCell)
        }
    }

    table.appendChild(header)
    table.appendChild(body)
    console.log("here")
    $("#portal-puzzle-report-table-container").freezeTable('update')
}

function displayCompetencyReport() {
    const table = document.getElementById("portal-competency-report-table")
    table.innerHTML = ""

    const header = document.createElement("thead")
    header.className = "thead-light"

    const headerRow = document.createElement("tr")
    header.appendChild(headerRow)

    for (let column of COMPETENCY_REPORT_COLUMNS) {
        const headerCell = document.createElement("th")
        headerCell.scope = "col"
        headerCell.innerHTML = column.label
        
        headerRow.appendChild(headerCell)
    }

    const body = document.createElement("tbody")

    const sortedStudentList = isNaN(Object.values(playerMap)[0]) ? Object.keys(playerMap).sort((a, b) => playerMap[a].toLowerCase().localeCompare(playerMap[b].toLowerCase())) : Object.keys(playerMap)
    for (let student of sortedStudentList) {
        const row = document.createElement("tr")
        row.className = getCompetencyRowClass(student)
        body.appendChild(row)

        for (let column of COMPETENCY_REPORT_COLUMNS) {
            const bodyCell = document.createElement("td")
            const value = column.getValueFunction(student)
            bodyCell.className = column.cellClass(value) + " bordered-cell"
            bodyCell.innerHTML = column.renderFunction ? column.renderFunction(value) : value

            row.appendChild(bodyCell)
        }
    }

    table.appendChild(header)
    table.appendChild(body)
}

function onPuzzleChange(puzzleSet) {
    tempSelectedPuzzles = puzzleSet
}

function selectPuzzles() {
    selectedPuzzles = new Set(tempSelectedPuzzles)
    $("#puzzle-select-modal").modal("hide")
    $("#portal-report-selected-puzzle-count").text(selectedPuzzles.size === puzzleList.length ? "All" : selectedPuzzles.size)
    displayPuzzleReport()
}

// TODO: ELO..., new report type option?

function handleDateChange(reload = false) {
    var dateVal = document.querySelector('input[name = "portal-report-time-radio"]:checked').value
    if (dateVal === "all") {
        if (reload) {
            displayPuzzleReport()
            return
        }
        loadPuzzleReport()
        return
    }

    const startDate = new Date(document.getElementById("portal-report-start-date").value)
    const endDate = new Date(document.getElementById("portal-report-end-date").value)

    if (!checkDate()) return

    if (reload) {
        displayPuzzleReport()
        return
    }
    loadPuzzleReport(Math.round(startDate.getTime() / 1000), Math.round(endDate.getTime() / 1000))
}

function showReportPage(pageId) {
    $("#portal-view-report-container > .portal-report-page").hide()
    $("#" + pageId).show()
}

export function initializeTab(pMap, puzzles, competency) {
    const reload = playerMap !== null
    playerMap = pMap
    puzzleList = puzzles
    competencyData = competency
    selectedPuzzles = selectedPuzzles || new Set(puzzleList)
    if (reload && reportData) {
        displayCompetencyReport()
        handleDateChange(true)
    }

    $("#portal-puzzle-report-table-container").freezeTable({ namespace: "first-table", scrollable: true })
    $("#portal-competency-report-table-container").freezeTable({ namespace: "second-table", freezeHead: true })

    $("#portal-report-puzzle-btn").click(() => {
        tempSelectedPuzzles = selectedPuzzles
        createPuzzleSelectionTool("portal-report-puzzle-select", puzzleList, selectedPuzzles, onPuzzleChange)
    })

    $("#portal-report-select-puzzles-btn").click(() => selectPuzzles())

    $("#portal-report-reload-btn").click(() => handleDateChange())

    $("#portal-report-dates").click(() => $("#portal-report-time-radio-range").click())

    $("#portal-report-legend").popover()

    $(".portal-report-back-btn").click(() => showReportPage("portal-report-select"))
    $("#portal-report-select-puzzle").click(() => {
        showReportPage("portal-report-puzzle")
        if (!prevLoadedReport) loadPuzzleReport()
    })
    $("#portal-report-select-competency").click(() => {
        showReportPage("portal-report-competency")
        $("#portal-competency-report-table-container").freezeTable({ namespace: "second-table", freezeHead: true })

    })
}


export function showReportTab() {
    displayCompetencyReport()
}