import { API, DIFFICULTY_LEVEL, LEVELS } from './constants.js'
import { callAPI, toEchartsData } from './helpers.js'

const defaultFunnel = { started: 0, create_shape: 0, submitted: 0, completed: 0 }
const keyNameMap = {
    started: "started puzzle",
    create_shape: "created a shape",
    submitted: "submission attempt",
    completed: "completed puzzle"
}
const funnelReducer = (accumulator, currentValue) => ({
    started: accumulator.started + Math.min(1, currentValue.started),
    create_shape: accumulator.create_shape + Math.min(1, currentValue.create_shape),
    submitted: accumulator.submitted + Math.min(1, currentValue.submitted),
    completed: accumulator.completed + Math.min(1, currentValue.completed)
})

var rawFunnelData = null

$(document).ready(() => {
    for (let [key, value] of Object.entries(DIFFICULTY_LEVEL)) {
        $(`#difficulty-${value}`).click(() => showFunnels(value))
    }
})

// createMetricCard = (name, value) => {
//     const card = document.createElement("div")
//     card.className = "card text-center bg-light mb-3"
//     card.innerHTML = ` <div class="card-body"><h5 class="card-title">${value}</h5><h6 class="card-subtitle mb-2 text-muted">${name}</h6></div>`
//     $("#basic-metric-cards").append(card)
// }

// showMetricsOverview = () => {
//     $("#metrics-container > div").hide()
//     $(".navbar-nav > a").removeClass("active")
//     $("#basic-metrics-container").show()
//     $("#nav-basic-metrics").addClass("active")
//     $("#basic-metric-cards > div").remove()

//     if (scale === REPORT_OPTIONS.SCALE.CLASS) {
//         var snapshotCount = 0
//         var timeSpent = 0
//         var latestLastCompleted = null
//         var earliestLastCompleted = null
//         var incompleted = 0

//         if (filter === REPORT_OPTIONS.FILTER.ALL_SKILLS) {
//             callAPI(dashboardApi + "players")
//                 .then(response => {
//                     const playerList = Object.keys(response).join(',')
//                     callAPI(`${dashboardApi}snapshot?players=${playerList}`)
//                 })

//             var snapSum = 0
//             for (const val of snapshotMap.values()) snapSum += val
//             snapshotCount = snapSum / filteredPlayerSet.size

//             var timeSum = 0
//             var incompleteSum = 0
//             var timeCount = 0
//             for (const val of timePerPuzzleMap.values()) {
//                 for (const time of Object.values(val)) {
//                     if (time) {
//                         if (time != -1) {
//                             timeSum += time
//                             timeCount += 1
//                         }
//                     } else {
//                         incompleteSum += 1
//                     }
//                 }
//             }

//             timeSpent = timeSum / timeCount
//             incompleted = incompleteSum / filteredPlayerSet.size

//             var minLevel = [Infinity, Infinity]
//             var maxLevel = [-1, -1]
//             const levelKeys = Object.keys(LEVELS)
//             lastCompletedLevelMap.forEach((level, user, map) => {
//                 for (var i = 0; i < levelKeys.length; i++) {
//                     const j = LEVELS[levelKeys[i]].indexOf(level)
//                     if (j != -1) {
//                         if (i >= maxLevel[0] && j > maxLevel[1]) {
//                             maxLevel = [i, j]
//                         } else if (i <= minLevel[0] && j < minLevel[1]) {
//                             minLevel = [i, j]
//                         }
//                         break
//                     }
//                 }
//             })

//             if (minLevel[0] != Infinity && minLevel[1] != Infinity) {
//                 earliestLastCompleted = LEVELS[levelKeys[minLevel[0]]][minLevel[1]]
//                 latestLastCompleted = LEVELS[levelKeys[maxLevel[0]]][maxLevel[1]]
//             }
//         }

//         // incompleted, time spent, snapshot, lastcompleted
//         // snapshotMap, lastCompletedLevelMap, timePerPuzzleMap

//         const timeStr = timeSpent > 60 ? `${(timeSpent / 60).toFixed()}m` : `${timeSpent.toFixed(1)}s`
//         createMetricCard("Average time per level", timeStr)
//         createMetricCard("Average snapshots per student", snapshotCount.toFixed(1))
//         createMetricCard("Average # of incomplete levels per student", incompleted.toFixed(1))
//         createMetricCard("Earliest last level completed", earliestLastCompleted)
//         createMetricCard("Latest last level completed", latestLastCompleted)
//     }
// }

function createFunnelDataForDifficulty(difficulty, user = null) {
    const levels = LEVELS[difficulty]
    const data = {}

    for (const level of levels) {
        var reducedData = null
        if (user) {
            const toReduce = rawFunnelData[level][user] ? [rawFunnelData[level][user]] : []
            reducedData = toReduce.reduce(funnelReducer, defaultFunnel)
        } else {
            reducedData = Object.values(rawFunnelData[level] || []).reduce(funnelReducer, defaultFunnel)
        }

        data[level] = toEchartsData(reducedData, keyNameMap)
    }

    return data
}

function createFunnel(data, divId, showLegend = false) {
    const funnelChart = echarts.init(document.getElementById(divId))
    const options = {
        tooltip: {
            trigger: "item",
            formatter: `{b}<br>{c} students`
        },
        calculable: true,
        series: {
            name: key,
            type: "funnel",
            min: 0,
            max: 45, // TODO: change later
            height: '100%',
            width: '100%',
            sort: "descending",
            label: { show: true, position: "inside" },
            data: data
        }
    }

    if (showLegend) {
        options.legend = {
            data: Object.values(keyNameMap)
        }
    }

    funnelChart.setOption(options)
}

function createFunnelDivs(rows, cols) {
    const height = (100 / rows) + "%"
    const width = (100 / cols) + "%"
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            const div = document.createElement("div")
            const divNum = (r * cols) + col + 1 
            const idName = `echarts-funnel-${divNum}`
            div.id = idName
            document.getElementById("echarts-funnel-container").appendChild(div)
            $(`#${idName}`).height(height)
            $(`#${idName}`).width(width)
        }
    }
}

function showFunnels(difficulty) {
    $("#funnel-difficulty > button").removeClass("active")
    $(`#difficulty-${difficulty}`).addClass("active")
    $("#echarts-funnel-container > div").remove()

    const numLevels = LEVELS[difficulty].length
    const numRows = 3
    const numColumns = numLevels / numRows
    
    createFunnelDivs(numRows, numColumns)

    const data = createFunnelDataForDifficulty(difficulty)
    var chartNum = 1
    for (let [key, value] of Object.entries(data)) {
        createFunnel(value, `echarts-funnel-${chartNum}`)
        // show level name
        chartNum++
    }
}

export async function showMetricsOverview() {
    $("#page-container > .page").hide()
    $(".navbar-nav > a").removeClass("active")
    $("#metrics-container").show()
    $("#nav-metrics").addClass("active")
    $("#funnel-difficulty").hide()

    // TODO: add loader?
    rawFunnelData = await callAPI(`${API}/funnelperpuzzle`)
    $("#funnel-difficulty").show()
    
    showFunnels(DIFFICULTY_LEVEL.BEGINNER)
}