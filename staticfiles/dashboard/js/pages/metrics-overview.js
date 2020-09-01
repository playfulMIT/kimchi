import { 
    API, INDEX_TO_SHAPE, INDEX_TO_XFM_MODE, FUNNEL_KEY_NAME_MAP, 
    SESSION_BIN_SIZE, DEFAULT_FUNNEL, TIME_BIN_SIZE, SNAPSHOT_BIN_SIZE,
    DEFAULT_SHAPE_ARRAY, DEFAULT_MODE_ARRAY, SANDBOX, SANDBOX_PUZZLE_NAME
} from '../util/constants.js'
import { 
    callAPI, toEchartsData, formatPlurals, formatTime, showPage,
    createBarChart, createGraphCard, createMetricCard, showPlayerList,
    toCamelCase
} from '../util/helpers.js'

// TODO: attempt funnel rotation 
// TODO: student search?
// TODO: student list/info per metric?

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
const binSessionPerStudentReducer = (accumulator, currentValue) => {
    const index = Math.floor(currentValue.length / SESSION_BIN_SIZE)
    accumulator[index] = accumulator[index] ? accumulator[index] + 1 : 1
    return accumulator
}
const binTimePerStudentReducer = (accumulator, currentValue) => {
    const index = Math.floor(currentValue / TIME_BIN_SIZE)
    accumulator[index] = accumulator[index] ? accumulator[index] + 1 : 1
    return accumulator
}

var puzzleData = null
var rawFunnelData = null
var timePerAttempt = null
var shapesUsed = null
var modesUsed = null
var snapshotsTaken = null

var playerMap = null
var numPlayers = 0
var activePlayer = null
var activeDifficulty = null
var activeFunnelId = null

var funnelPlayerMax = 0

var anonymizeNames = true
var printName = null

const playerButtonClass = "metrics-overview-player"

$(document).ready(() => {
    $('#zoom-range').on('input', function() {
        funnelPlayerMax = Math.floor(numPlayers/this.value)
        showFunnels(activeDifficulty, activePlayer)
    })
    $('#funnel-zoom-out').click(() => {
        document.getElementById('zoom-range').stepDown()
        funnelPlayerMax = Math.floor(numPlayers / $('#zoom-range').val())
        showFunnels(activeDifficulty, activePlayer)
    })
    $('#funnel-zoom-in').click(() => {
        document.getElementById('zoom-range').stepUp()
        funnelPlayerMax = Math.floor(numPlayers / $('#zoom-range').val())
        showFunnels(activeDifficulty, activePlayer)
    })

    $('#filter-clear').click(function() {
        togglePlayer(null)
    })
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
    puzzleMetricsDiv.className = "collapse funnel-detail-item flex-row"
    puzzleMetricsDiv.dataset.parent = "#echarts-funnel-container"
    
    document.getElementById(`${rowId}-detail`).appendChild(puzzleMetricsDiv)
    generatePuzzleMetrics(puzzleMetricsDiv, divId, title, data, activePlayer)
}

function addBarChartToDiv(parentDivElement, id, data, title, xAxisData = null, width = "300px", height = "210px", addToCard = true) {
    $(`#${id}, #${id}-card`).remove()

    const barChart = document.createElement("div")
    barChart.id = id
    barChart.style.height = height
    barChart.style.width = width

    const chart = addToCard ? createGraphCard(barChart, id + "-card") : barChart
    parentDivElement.appendChild(chart)
    createBarChart(data, barChart.id, title, xAxisData)
}

function generatePuzzleMetrics(div, parentDivId, puzzle, chartFunnelData, user = null) {
    const summedFunnelData = reduceRawFunnelData(puzzle, user, false)

    const levelUserInfo = document.createElement('div')
    levelUserInfo.className = "h4"
    levelUserInfo.style = "padding-top: 5px; width: 100%;"
    levelUserInfo.innerHTML = `${user ? (anonymizeNames ? user : playerMap[user]) : 'Class'}  &middot;  ${puzzle}`
    div.appendChild(levelUserInfo)

    const metricCardDeck = document.createElement('div')
    metricCardDeck.className = 'card-deck'
    div.appendChild(metricCardDeck)

    const graphDiv = document.createElement('div')
    graphDiv.className = 'card-deck'
    div.appendChild(graphDiv)

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
        
        metricCardDeck.appendChild(createMetricCard(formatPlurals("Attempted submission", summedFunnelData.submitted), summedFunnelData.submitted))
        metricCardDeck.appendChild(createMetricCard(formatPlurals("Correct submission", summedFunnelData.completed), summedFunnelData.completed))
        
        if (snapshotsTaken[puzzle] && snapshotsTaken[puzzle][user]) {
            metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Snapshot", snapshotsTaken[puzzle][user])} taken`, snapshotsTaken[puzzle][user]))
        }

        if (avgTime) {
            metricCardDeck.appendChild(createMetricCard("Average time until correct submission", formatTime(avgTime)))
        }

        if (modesUsed[puzzle] && modesUsed[puzzle][user]) {
            for (var i = 0; i < modesUsed[puzzle][user].length; i++) {
                const value = modesUsed[puzzle][user][i] ? "Yes" : "No"
                metricCardDeck.appendChild(createMetricCard(`Used ${INDEX_TO_XFM_MODE[i]} transform mode`, value))
            }
        }
        
        $(`#${div.id}`).on("shown.bs.collapse", function () {
            if (avgTime && filteredTimes.length > 1) {
                addBarChartToDiv(graphDiv, parentDivId + "-timechart", filteredTimes, "Time per correct submission")
            }

            if (shapeEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-shapechart", shapeEchartsData, "Shapes used", INDEX_TO_SHAPE)
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

        metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.started)} started this puzzle`, chartFunnelData.started))
        
        if (chartFunnelData.started) {
            metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.submitted)} submitted an attempt to solve this puzzle`, chartFunnelData.submitted))
            metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.completed)} completed this puzzle`, chartFunnelData.completed))

            if (chartFunnelData.submitted) {
                metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Attempt", avgAttempts)} on average`, avgAttempts))
            }

            if (avgTime) {
                metricCardDeck.appendChild(createMetricCard("Average time until correct submission", formatTime(avgTime)))
            }

            $(`#${div.id}`).on("shown.bs.collapse", function () {
                if (shapeEchartsData.length > 0) {
                    addBarChartToDiv(graphDiv, parentDivId + "-shapechart", shapeEchartsData, "Shapes used per student", INDEX_TO_SHAPE)
                }
                if (modeEchartsData.length > 0) {
                    addBarChartToDiv(graphDiv, parentDivId + "-modechart", modeEchartsData, "Modes used per student", INDEX_TO_XFM_MODE)
                }
                if (snapshotEchartsData.length > 0) {
                    addBarChartToDiv(graphDiv, parentDivId + "-snapchart", snapshotEchartsData, "Histogram of snapshot values", snapshotEchartsXAxisData)
                }
            })
        }

        // TODO: average total time spent in puzzle
    }
}

function createFunnelDataForDifficulty(difficulty, user = null) {
    const puzzles = puzzleData['puzzles'][difficulty]
    const data = {}

    for (const puzzle of puzzles) {
        const reducedData = reduceRawFunnelData(puzzle, user)
        data[puzzle] = reducedData
    }

    return data
}

function createFunnelDivs(rows, cols) {
    const height = "100%"
    const width = (98 / cols) + "%"
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
    $(".funnel-row > button, .funnel-detail-row > div").remove()
    $("#echarts-funnel-container").show()
    $("#sandbox-metrics-container").hide()
    $(".zoom-item").prop("disabled", false)
    $(".zoom-item").css("cursor", "default")
    $(".zoom-icon").css("cursor", "pointer")


    $("#class-level-filter-text").text(printName(user))
    
    if (user) {
        $("#filter-clear").show()
    } else {
        $("#filter-clear").hide()
    }

    const numLevels = puzzleData["puzzles"][difficulty].length
    const numRows = 3
    const numColumns = numLevels / numRows
    
    createFunnelDivs(numRows, numColumns)

    const data = createFunnelDataForDifficulty(difficulty, user)
    
    var chartNum = 1
    for (let [key, value] of Object.entries(data)) {
        const rowNum = Math.ceil(chartNum / numColumns).toFixed()
        createFunnel(value, user ? 1 : funnelPlayerMax, `echarts-funnel-${chartNum}`, `funnel-row-${rowNum}`, key)
        chartNum++
    }
}

function showSandboxMetrics(user = null) {
    const parentDivId = "sandbox-metrics-container"
    const puzzle = SANDBOX_PUZZLE_NAME
    const chartFunnelData = reduceRawFunnelData(puzzle, user)
    activeDifficulty = SANDBOX

    $("#funnel-difficulty > button").removeClass("active")
    $(`#difficulty-${activeDifficulty}`).addClass("active")
    $(`#${parentDivId} > div`).remove()
    $("#echarts-funnel-container").hide()
    $(`#${parentDivId}`).show()
    $(".zoom-item").prop("disabled", true)
    $(".zoom-item").css("cursor", "not-allowed")

    $("#class-level-filter-text").text(printName(user))

    if (user) {
        $("#filter-clear").show()
    } else {
        $("#filter-clear").hide()
    }

    const levelUserInfo = document.createElement('div')
    levelUserInfo.className = "h4"
    levelUserInfo.style = "padding-top: 5px; width: 100%;"
    levelUserInfo.innerHTML = `${printName(user)}  &middot;  Sandbox`
    $(`#${parentDivId}`).append(levelUserInfo)
    
    const metricCardDeck = document.createElement('div')
    metricCardDeck.className = 'card-deck'
    $(`#${parentDivId}`).append(metricCardDeck)

    const graphDiv = document.createElement('div')
    if (user) {
        graphDiv.style = "width: 30%;"
    } else {
        graphDiv.className = 'card-deck'
    }
    $(`#${parentDivId}`).append(graphDiv)

    if (user) {
        var attempts = 0
        if (timePerAttempt[puzzle] && timePerAttempt[puzzle][user]) {
            attempts = timePerAttempt[puzzle][user].length
        }
        metricCardDeck.appendChild(createMetricCard(formatPlurals("Sandbox session", attempts), attempts))

        if (attempts > 0) {
            const shapeEchartsData = []
            if (shapesUsed[puzzle] && shapesUsed[puzzle][user]) {
                for (var i = 0; i < shapesUsed[puzzle][user].length; i++) {
                    shapeEchartsData.push({ name: INDEX_TO_SHAPE[i], value: shapesUsed[puzzle][user][i] })
                }
            }

            if (snapshotsTaken[puzzle] && snapshotsTaken[puzzle][user]) {
                metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Snapshot", snapshotsTaken[puzzle][user])} taken`, snapshotsTaken[puzzle][user]))
            }

            if (modesUsed[puzzle] && modesUsed[puzzle][user]) {
                for (var i = 0; i < modesUsed[puzzle][user].length; i++) {
                    const value = modesUsed[puzzle][user][i] ? "Yes" : "No"
                    metricCardDeck.appendChild(createMetricCard(`Used ${INDEX_TO_XFM_MODE[i]} transform mode`, value))
                }
            }

            if (shapeEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-shapechart", shapeEchartsData, "Shapes used", INDEX_TO_SHAPE)
            }
        }
    } else {
        const summedFunnelData = reduceRawFunnelData(puzzle, user, false)
        const avgSessions = (summedFunnelData.started / chartFunnelData.started).toFixed()

        const binnedSessions = Object.values(timePerAttempt[puzzle] || []).reduce(binSessionPerStudentReducer, [0])
        const sessionEchartsData = []
        const sessionEchartsXAxisData = []
        for (var i = 0; i < binnedSessions.length; i++) {
            const bin = `${i * SESSION_BIN_SIZE}-${(i + 1) * SESSION_BIN_SIZE - 1}`
            sessionEchartsXAxisData.push(bin)
            sessionEchartsData.push({ name: bin, value: binnedSessions[i] })
        }

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
            snapshotEchartsData.push({ name: bin, value: binnedSnapshots[i] })
        }

        metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Student", chartFunnelData.started)} opened the Sandbox`, chartFunnelData.started))
        if (chartFunnelData.started > 0) {
            metricCardDeck.appendChild(createMetricCard(`${formatPlurals("Sandbox session", avgSessions)} on average`, avgSessions))

            if (sessionEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-sessionchart", sessionEchartsData, "Histogram of sessions", sessionEchartsXAxisData, "250px")
            }
            if (shapeEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-shapechart", shapeEchartsData, "Shapes used per student", INDEX_TO_SHAPE, "250px")
            }
            if (modeEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-modechart", modeEchartsData, "Modes used per student", INDEX_TO_XFM_MODE, "250px")
            }
            if (snapshotEchartsData.length > 0) {
                addBarChartToDiv(graphDiv, parentDivId + "-snapchart", snapshotEchartsData, "Histogram of snapshot values", snapshotEchartsXAxisData, "250px")
            }
        }
    }

    // TODO: total time spent in sandbox
}

function togglePlayer(pk) {
    $(`#${activePlayer}.${playerButtonClass}`).toggleClass("active")
    
    if (activePlayer === pk) {
        activePlayer = null
    } else {
        activePlayer = pk
        if (activePlayer) $(`#${activePlayer}.${playerButtonClass}`).toggleClass("active")
    }
    
    if (activeDifficulty === SANDBOX) {
        showSandboxMetrics(activePlayer)
    } else {
        showFunnels(activeDifficulty, activePlayer)
        if (activeFunnelId) {
            $(`#${activeFunnelId}`).addClass("active")
            $(`#${activeFunnelId}-collapsible`).collapse('show')
        }
    }
}

function createDifficultyTabs() {
    $('#funnel-difficulty > button').remove()
    
    for (let [key, value] of Object.entries(puzzleData["puzzles"])) {
        const button = document.createElement('button')
        button.id = `difficulty-${key}`
        button.type = 'button'
        button.className = 'btn btn-info'
        button.textContent = toCamelCase(key)
        document.getElementById('funnel-difficulty').appendChild(button)

        $(`#difficulty-${key}`).click(() => {
            activeFunnelId = null
            showFunnels(key, activePlayer)
        })
    }

    if (puzzleData["canUseSandbox"]) {
        const button = document.createElement('button')
        button.id = `difficulty-${SANDBOX}`
        button.type = 'button'
        button.className = 'btn btn-info'
        button.textContent = SANDBOX_PUZZLE_NAME
        document.getElementById('funnel-difficulty').appendChild(button)

        $(`#difficulty-${SANDBOX}`).click(() => {
            activeFunnelId = null
            showSandboxMetrics(activePlayer)
        })
    }
}

export async function showMetricsOverview(pMap, numP, puzzData, anonymize=true) {
    playerMap = pMap
    numPlayers = numP
    puzzleData = puzzData
    anonymizeNames = anonymize
    printName = (user) => user ? (anonymizeNames ? user : playerMap[user]) : "Class"

    if (playerMap && !rawFunnelData) {
        showPage("loader-container")
        funnelPlayerMax = numPlayers

        rawFunnelData = await callAPI(`${API}/funnelperpuzzle`)
        timePerAttempt = await callAPI(`${API}/timeperpuzzle`)
        shapesUsed = await callAPI(`${API}/shapesperpuzzle`)
        modesUsed = await callAPI(`${API}/modesperpuzzle`)
        snapshotsTaken = await callAPI(`${API}/snapshotsperpuzzle`)
    }

    showPage("metrics-container", "nav-metrics")

    createDifficultyTabs()
    $("#funnel-difficulty").show()

    document.getElementById("player-count").innerHTML = `${numPlayers} ${formatPlurals("Student", numPlayers)}`
    showPlayerList(playerButtonClass, "player-list", playerMap, (event) => {togglePlayer(event.target.id)}, anonymizeNames)
    showFunnels(Object.keys(puzzleData['puzzles'])[0])
}