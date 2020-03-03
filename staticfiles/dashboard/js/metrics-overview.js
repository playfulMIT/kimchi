import { 
    API, DIFFICULTY_LEVEL, LEVELS, INDEX_TO_SHAPE, 
    INDEX_TO_XFM_MODE, FUNNEL_KEY_NAME_MAP, 
    DEFAULT_FUNNEL, TIME_BIN_SIZE, SNAPSHOT_BIN_SIZE,
    DEFAULT_SHAPE_ARRAY, DEFAULT_MODE_ARRAY 
} from './constants.js'
import { callAPI, toEchartsData, formatPlurals, formatTime, createBarChart } from './helpers.js'

// TODO: fix collapse dimensions

// TODO: add sandbox level 
// TODO: add total student count

const onePerStudentFunnelReducer = (accumulator, currentValue) => ({
    started: accumulator.started + Math.min(1, currentValue.started),
    create_shape: accumulator.create_shape + Math.min(1, currentValue.create_shape),
    submitted: accumulator.submitted + Math.min(1, currentValue.submitted),
    completed: accumulator.completed + Math.min(1, currentValue.completed)
})
const manyPerStudentFunnelReducer = (accumulator, currentValue) => ({
    started: accumulator.started + currentValue.started,
    create_shape: accumulator.create_shape + currentValue.create_shape,
    submitted: accumulator.submitted + currentValue.submitted,
    completed: accumulator.completed + currentValue.completed
})
const onePerStudentNumberArrayReducer = (accumulator, currentValue) => {
    const reducedArray = []
    for (var i = 0; i < accumulator.length; i++) {
        reducedArray.push(accumulator[i] + Math.min(1, currentValue[i]))
    }
    return reducedArray
}
const onePerStudentBooleanArrayReducer = (accumulator, currentValue) => {
    const reducedArray = []
    for (var i = 0; i < accumulator.length; i++) {
        reducedArray.push(accumulator[i] + (currentValue[i] ? 1 : 0))
    }
    return reducedArray
}
const binSnapshotPerStudentReducer = (accumulator, currentValue) => {
    const index = Math.floor(currentValue / SNAPSHOT_BIN_SIZE)
    accumulator[index] = accumulator[index] ? accumulator[index] + 1 : 1
    return accumulator
}
const binTimePerStudentReducer = (accumulator, currentValue) => {
    const index = Math.floor(currentValue / TIME_BIN_SIZE)
    accumulator[index] = accumulator[index] ? accumulator[index] + 1 : 1
    return accumulator
}

var rawFunnelData = null
var timePerAttempt = null
var shapesUsed = null
var modesUsed = null
var snapshotsTaken = null

var playerMap = null 
var activePlayer = null
var activeDifficulty = null
var activeFunnelId = null
var numPlayers = 0

$(document).ready(() => {
    for (let [key, value] of Object.entries(DIFFICULTY_LEVEL)) {
        $(`#difficulty-${value}`).click(() => showFunnels(value, activePlayer))
    }
})

function reduceRawFunnelData(puzzle, user = null, toOnePerStudent = true) {
    const reducer = toOnePerStudent ? onePerStudentFunnelReducer : manyPerStudentFunnelReducer
    var reducedData = null
    if (user) {
        const toReduce = rawFunnelData[puzzle] && rawFunnelData[puzzle][user] ? [rawFunnelData[puzzle][user]] : []
        reducedData = toReduce.reduce(reducer, DEFAULT_FUNNEL)
    } else {
        reducedData = Object.values(rawFunnelData[puzzle] || []).reduce(reducer, DEFAULT_FUNNEL)
    }
    return reducedData
}

function createFunnel(data, max, divId, rowId, title, showLegend = false) {
    const funnelChart = echarts.init(document.getElementById(divId))
    const options = {
        title: {
            text: title,
            left: "center",
            triggerEvent: true
        },
        tooltip: {
            trigger: "item",
            formatter: `{b}<br>{c} students`
        },
        calculable: true,
        series: {
            name: title,
            type: "funnel",
            min: 0,
            max: max,
            height: '80%',
            width: '80%',
            top: '15%',
            left: '10%',
            sort: "descending",
            label: { show: true, position: "inside" },
            data: toEchartsData(data, FUNNEL_KEY_NAME_MAP)
        }
    }

    if (showLegend) {
        options.legend = {
            data: Object.values(FUNNEL_KEY_NAME_MAP)
        }
    }

    funnelChart.setOption(options)
    $(`#${divId}`).on("click", function() {
        $(`#${activeFunnelId}`).removeClass("active")
        if (activeFunnelId == divId) {
            activeFunnelId = null
            return
        }

        activeFunnelId = divId
        $(`#${activeFunnelId}`).addClass("active")
    })

    const puzzleMetricsDiv = document.createElement("div")
    puzzleMetricsDiv.id = divId + "-collapsible"
    puzzleMetricsDiv.className = "collapse"
    puzzleMetricsDiv.dataset.parent = "#echarts-funnel-container"
    document.getElementById(`${rowId}-detail`).appendChild(puzzleMetricsDiv)
    generatePuzzleMetrics(puzzleMetricsDiv, divId, title, data, activePlayer)
    
}

function createMetricCard(name, value) {
    const card = document.createElement("div")
    card.className = "card text-center bg-light mb-3"
    card.innerHTML = ` <div class="card-body"><h5 class="card-title">${value}</h5><h6 class="card-subtitle mb-2 text-muted">${name}</h6></div>`
    return card
}

function addBarChartToDiv(parentDivElement, id, data, title, xAxisData = null, height = "200px", width = "225px") {
    const barChart = document.createElement("div")
    barChart.id = id
    barChart.style.height = height
    barChart.style.width = width
    parentDivElement.appendChild(barChart)
    createBarChart(data, barChart.id, title, xAxisData)
}

function generatePuzzleMetrics(div, parentDivId, puzzle, chartFunnelData, user = null) {
    const summedFunnelData = reduceRawFunnelData(puzzle, user, false)

    if (user) {
        // TODO: total time spent in puzzle
        var avgTime = 0
        var filteredTimes = []
        if (timePerAttempt[puzzle] && timePerAttempt[puzzle][user]) {
            filteredTimes = (timePerAttempt[puzzle][user] || []).filter(v => v != null)
            const [sum, count] = (filteredTimes).reduce(function (a, c) { return [a[0] + c, a[1] + 1] }, [0, 0])
            avgTime = sum / count
        }

        // TODO: right now shapes are totals, but it might make more sense to be per attempt
        // also should deletion be accounted for?
        const shapeEchartsData = []
        if (shapesUsed[puzzle] && shapesUsed[puzzle][user]) {
            for (var i = 0; i < shapesUsed[puzzle][user].length; i++) {
                shapeEchartsData.push({ name: INDEX_TO_SHAPE[i], value: shapesUsed[puzzle][user][i] })
            }
        }
        
        div.appendChild(createMetricCard(formatPlurals("Attempted submission", summedFunnelData.submitted), summedFunnelData.submitted))
        div.appendChild(createMetricCard(formatPlurals("Correct submission", summedFunnelData.completed), summedFunnelData.completed))
        
        if (snapshotsTaken[puzzle] && snapshotsTaken[puzzle][user]) {
            div.appendChild(createMetricCard(`${formatPlurals("Snapshot", snapshotsTaken[puzzle][user])} taken`, snapshotsTaken[puzzle][user]))
        }

        if (avgTime) {
            div.appendChild(createMetricCard("Average time until correct submission", formatTime(avgTime)))
        }

        if (modesUsed[puzzle] && modesUsed[puzzle][user]) {
            for (var i = 0; i < modesUsed[puzzle][user].length; i++) {
                const value = modesUsed[puzzle][user][i] ? "Yes" : "No"
                div.appendChild(createMetricCard(`Used ${INDEX_TO_XFM_MODE[i]} transform mode`, value))
            }
        }
        
        $(`#${div.id}`).on("shown.bs.collapse", function () {
            if (avgTime && filteredTimes.length > 1) {
                addBarChartToDiv(div, parentDivId + "-timechart", filteredTimes, "Time per correct submission")
            }

            if (shapeEchartsData.length > 0) {
                addBarChartToDiv(div, parentDivId + "-shapechart", shapeEchartsData, "Shapes used", INDEX_TO_SHAPE)
            }
        })
    } else {
        const avgAttempts = (summedFunnelData.submitted / chartFunnelData.submitted).toFixed()
        
        const shapesPerStudent = Object.values(shapesUsed[puzzle] || []).reduce(onePerStudentNumberArrayReducer, DEFAULT_SHAPE_ARRAY)
        const shapeEchartsData = []
        for (var i = 0; i < shapesPerStudent.length; i++) {
            shapeEchartsData.push({ name: INDEX_TO_SHAPE[i], value: shapesPerStudent[i] })
        }

        const modesPerStudent = Object.values(modesUsed[puzzle] || []).reduce(onePerStudentBooleanArrayReducer, DEFAULT_MODE_ARRAY)
        const modeEchartsData = []
        for (var i = 0; i < modesPerStudent.length; i++) {
            modeEchartsData.push({ name: INDEX_TO_XFM_MODE[i], value: modesPerStudent[i] })
        }

        const binnedSnapshots = Object.values(snapshotsTaken[puzzle] || []).reduce(binSnapshotPerStudentReducer, [0])
        const snapshotEchartsData = []
        const snapshotEchartsXAxisData = []
        for (var i = 0; i < binnedSnapshots.length; i++) {
            const bin = `${i * SNAPSHOT_BIN_SIZE}-${(i + 1) * SNAPSHOT_BIN_SIZE - 1}`
            snapshotEchartsXAxisData.push(bin)
            snapshotEchartsData.push({ name: bin, value: binnedSnapshots[i]})
        }

        // TODO: try to bin times, should this be average per student or something else?
        var totalSum = 0
        var totalCount = 0
        for (let times of Object.values(timePerAttempt[puzzle] || [])) {
            const filteredTimes = (times || []).filter(v => v != null)
            const [sum, count] = (filteredTimes).reduce(function (a, c) { return [a[0] + c, a[1] + 1] }, [0, 0])
            totalSum += sum 
            totalCount += count
        }
        const avgTime = totalSum / totalCount

        div.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.started)} started this puzzle`, chartFunnelData.started))
        
        if (chartFunnelData.started) {
            div.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.submitted)} submitted an attempt to solve this puzzle`, chartFunnelData.submitted))
            div.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.completed)} completed this puzzle`, chartFunnelData.completed))

            if (chartFunnelData.submitted) {
                div.appendChild(createMetricCard(`${formatPlurals("Attempt", avgAttempts)} on average`, avgAttempts))
            }

            if (avgTime) {
                div.appendChild(createMetricCard("Average time until correct submission", formatTime(avgTime)))
            }

            $(`#${div.id}`).on("shown.bs.collapse", function () {
                if (shapeEchartsData.length > 0) {
                    addBarChartToDiv(div, parentDivId + "-shapechart", shapeEchartsData, "Shapes used per student", INDEX_TO_SHAPE)
                }
                if (modeEchartsData.length > 0) {
                    addBarChartToDiv(div, parentDivId + "-modechart", modeEchartsData, "Modes used per student", INDEX_TO_XFM_MODE)
                }
                if (snapshotEchartsData.length > 0) {
                    addBarChartToDiv(div, parentDivId + "-snapchart", snapshotEchartsData, "Histogram of snapshot values", snapshotEchartsXAxisData)
                }
            })
        }

        // TODO: average total time spent in puzzle
    }
}

function createFunnelDataForDifficulty(difficulty, user = null) {
    const puzzles = LEVELS[difficulty]
    const data = {}

    for (const puzzle of puzzles) {
        const reducedData = reduceRawFunnelData(puzzle, user)
        data[puzzle] = reducedData
    }

    return data
}

function createFunnelDivs(rows, cols) {
    const height = "100%"
    const width = (100 / cols) + "%"
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            const div = document.createElement("button")
            const divNum = (r * cols) + c + 1 
            const idName = `echarts-funnel-${divNum}`
            div.id = idName
            div.className = "funnel btn btn-outline-secondary"
            div.style.height = height
            div.style.width = width
            div.dataset.toggle = "collapse"
            div.dataset.target = `#${idName}-collapsible`
            document.getElementById(`funnel-row-${r + 1}`).appendChild(div)
        }
    }
}

function showFunnels(difficulty, user = null) {
    activeDifficulty = difficulty
    $("#funnel-difficulty > button").removeClass("active")
    $(`#difficulty-${difficulty}`).addClass("active")
    $(".funnel-row > button").remove()
    $(".funnel-detail-row > div").remove()

    const numLevels = LEVELS[difficulty].length
    const numRows = 3
    const numColumns = numLevels / numRows
    
    createFunnelDivs(numRows, numColumns)

    const data = createFunnelDataForDifficulty(difficulty, user)
    
    var chartNum = 1
    for (let [key, value] of Object.entries(data)) {
        const rowNum = Math.ceil(chartNum / numColumns).toFixed()
        createFunnel(value, user ? 1 : numPlayers, `echarts-funnel-${chartNum}`, `funnel-row-${rowNum}`, key)
        chartNum++
    }
}

function togglePlayer(pk) {
    $(`#${activePlayer}`).toggleClass("active")

    if (activePlayer === pk) {
        activePlayer = null
    } else {
        activePlayer = pk
        $(`#${activePlayer}`).toggleClass("active")
    }
    
    showFunnels(activeDifficulty, activePlayer)
}

function showPlayerList() {
    for (let [pk, player] of Object.entries(playerMap)) {
        const button = document.createElement("button")
        button.id = pk
        button.className = "list-group-item list-group-item-action"
        button.type = "button"
        button.textContent = player
        document.getElementById("player-list").appendChild(button)
        $(`#${pk}`).click(() => {
            togglePlayer(pk)
        })
    }
}

export async function showMetricsOverview() {
    $("#page-container > .page").hide()
    $(".navbar-nav > a").removeClass("active")
    $("#metrics-container").show()
    $("#nav-metrics").addClass("active")
    $("#funnel-difficulty").hide()

    // TODO: add loader?
    playerMap = await callAPI(`${API}/players`)
    numPlayers = Object.keys(playerMap).length

    rawFunnelData = await callAPI(`${API}/funnelperpuzzle`)
    timePerAttempt = await callAPI(`${API}/timeperpuzzle`)
    shapesUsed = await callAPI(`${API}/shapesperpuzzle`)
    modesUsed = await callAPI(`${API}/modesperpuzzle`)
    snapshotsTaken = await callAPI(`${API}/snapshotsperpuzzle`)

    $("#funnel-difficulty").show()
    showPlayerList()
    showFunnels(DIFFICULTY_LEVEL.BEGINNER)
}