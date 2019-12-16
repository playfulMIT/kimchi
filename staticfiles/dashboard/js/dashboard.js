const TABS = {
    EVENT_STREAM: "EVENT_STREAM",
    PARTICIPATION_FUNNEL: "PARTICIPATION_FUNNEL",
    BASIC_METRICS: "BASIC_METRICS"
}

const FUNNEL_SCALE_OPTIONS = {
    LEVEL: "LEVEL",
    SKILL: "SKILL"
}

const REPORT_OPTIONS = {
    SCALE: {
        CLASS: "CLASS",
        INDIVIDUAL: "INDIVIDUAL"
    },
    FILTER: {
        ALL_SKILLS: "ALL_SKILLS",
        BEGINNER: "BEGINNER",
        INTERMEDIATE: "INTERMEDIATE",
        ADVANCED: "ADVANCED"
    }
}

const SKILLS = [
    "Beginner",
    "Intermediate",
    "Advanced"
]

const LEVELS = {
    "Beginner": [
        "1. One Box",
        "2. Separated Boxes",
        "3. Rotate A Pyramid",
        "4. Match Silhouettes",
        "5. Removing Objects",
        "6. Stretch A Ramp",
        "7. Max 2 Boxes",
        "8. Combine 2 Ramps",
        "9. Scaling Round Objects"
    ],
    "Intermediate": [
        "Square Cross-Sections",
        "Bird Fez",
        "Pi Henge",
        "45-Degree Rotations",
        "Pyramids Are Strange",
        "Boxes Obscure Spheres",
        "Object Limits",
        "Tetromino",
        "Angled Silhouette"
    ],
    "Advanced": [
        "Sugar Cones",
        "Stranger Shapes",
        "Tall And Small",
        "Ramp It Up And Can It",
        "More Than Meets Your Eye",
        "Not Bird",
        "Unnecessary",
        "ZZZ",
        "Bull Market",
        "Few Clues",
        "Orange Dance",
        "Bear Market"
    ]
}


const app = document.getElementById('app')
const eventList = []
var eventMap = {}
var lastActiveSession = null
var lastActiveEvent = null
var filteredPlayerSet = new Set()
var filteredEventList = []
var nextEventUrl = '/api/event/?format=json'
var nextPlayerUrl = '/api/players/?format=json'
var lastCompletedLevelMap = new Map()
var timePerPuzzleMap = new Map()
var snapshotMap = new Map()
var funnelChart = null
var activeTab = TABS.EVENT_STREAM

$(document).ready(() => {
    $("#search-button").click(processEvents)
    $('#event-input').keypress(() => {
        if (event.keyCode == 13) processEvents()
    })

    $("#nav-event-stream").click(() => handleTabSwitch(TABS.EVENT_STREAM))
    $("#nav-funnel").click(() => handleTabSwitch(TABS.PARTICIPATION_FUNNEL))
    $("#nav-basic-metrics").click(() => handleTabSwitch(TABS.BASIC_METRICS))

    funnelChart = echarts.init(document.getElementById("funnel-container"))
    $("#funnel-container").hide()
    $("#basic-metrics-container").hide()
})

fetchPage = (url, shouldFetchAll = false, pagesToFetch = 1) => new Promise((resolve, reject) => {
    if (!url) resolve([])

    fetch(url, { credentials: "same-origin" })
        .then(response => {
            return response.json()
        })
        .then(data => {
            if (data.next && (shouldFetchAll || pagesToFetch > 1)) {
                fetchPage(data.next, shouldFetchAll, pagesToFetch - 1)
                    .then(pageResult => {
                        resolve({
                            results: [...data.results, ...pageResult.results],
                            nextPage: pageResult.nextPage
                        })
                    })
            } else {
                resolve({
                    results: data.results,
                    nextPage: data.next
                })
            }
        })
        .catch(error => {
            console.log('Encountered error during fetch: ', error)
            resolve({
                results: [],
                nextPage: url
            })
        })
})

onSessionClick = (session) => {
    if (lastActiveSession) {
        $(`#${lastActiveSession}`).removeClass('active')
        $(`#${lastActiveSession} > span`).removeClass('badge-light')
        $(`#${lastActiveSession} > span`).addClass('badge-primary')
    }
    $(`#${session}`).addClass('active')
    $(`#${session} > span`).removeClass('badge-primary')
    $(`#${session} > span`).addClass('badge-light')
    lastActiveSession = session
    $('#event-filter').empty()
    for (const event of eventMap[session]) {
        const button = document.createElement('button')
        button.id = event.id
        button.type = 'button'
        button.className = 'list-group-item list-group-item-action' +
            (lastActiveEvent == event.id ? ' active' : '')
        button.innerHTML = JSON.stringify(event)
        button.onclick = () => onEventClick(event)
        $('#event-filter').append(button)
    }
}

onEventClick = (event) => {
    if (lastActiveEvent) $(`#${lastActiveEvent}`).removeClass('active')
    $(`#${event.id}`).addClass('active')
    lastActiveEvent = event.id
    $('#event-id').text(event.id)
    $('#event-time').text(event.time)
    $('#event-type').text(event.type)
    $('#event-data').html(prettyprint(JSON.parse(event.data)))
    $('#event-session').text(event.session)
}

filterEventsAndPlayersByGroup = (events) => {
    filteredEventList = []
    filteredPlayerSet = new Set()
    events.forEach(event => {
        if (typeof event.data === "string") event.data = JSON.parse(event.data)
        if (event.data.group && event.data.group == group && event.data.user) {
            filteredEventList.push(event)
            filteredPlayerSet.add(event.data.user)
        }
    })
}

createEventMap = () => {
    eventMap = filteredEventList.reduce((map, event) => {
        if (event.session in map) {
            map[event.session].push(event)
        } else {
            map[event.session] = [event]
        }
        return map
    }, {})

    $('button').remove('.remove-on-update')
    $('#total-event-number').text(filteredEventList.length)
    for (const session in eventMap) {
        const button = document.createElement('button')
        button.id = session
        button.type = 'button'
        button.className = 'remove-on-update list-group-item list-group-item-action'
        button.innerHTML =
            `${session} <span class="badge badge-primary badge-pill float-right">${eventMap[session].length}</span>`
        button.onclick = () => onSessionClick(session)
        $('#session-filter').append(button)
    }

    eventMap['all-sessions-button'] = filteredEventList
    $('#all-sessions-button').click(() => onSessionClick('all-sessions-button'))
    onSessionClick('all-sessions-button')
}

calculateMetrics = () => {
    lastCompletedLevelMap = new Map()
    snapshotMap = new Map()
    timePerPuzzleMap = new Map()
    
    const puzzleTimeMap = new Map()
    filteredEventList.forEach(event => {
        if (!lastCompletedLevelMap.has(event.data.user) && event.type === "ws-puzzle_complete") {
            lastCompletedLevelMap.set(event.data.user, event.data.task_id)
        }

        if (event.type === "ws-puzzle_complete") {
            const key = event.data.user + ";" + event.data.task_id
            if (!puzzleTimeMap.has(key)) puzzleTimeMap.set(key, {
                start: null,
                end: event.time
            })
        }

        if (event.type === "ws-puzzle_started") {
            const key = event.data.user + ";" + event.data.task_id
            puzzleTimeMap.set(key, {
                start: puzzleTimeMap.has(key) && puzzleTimeMap.get(key).start ? puzzleTimeMap.get(key).start : event.time,
                end: puzzleTimeMap.has(key) ? puzzleTimeMap.get(key).end : null
            })
        }
        
        if (event.type === "ws-snapshot") {
            snapshotMap.set(event.data.user, snapshotMap.has(event.data.user) ? snapshotMap.get(event.data.user) + 1 : 1)
        }
    })

    puzzleTimeMap.forEach((val, key, map) => {
        const keyArr = key.split(";")
        const user = keyArr[0]
        const level = keyArr[1]
        const start = val.start
        const end = val.end
        var timeSpent = null

        if (end) {
            if (start) {
                timeSpent = (Date.parse(end) - Date.parse(start)) / 1000
            } else {
                timeSpent = -1
            } 
        }

        timePerPuzzleMap.set(level, timePerPuzzleMap.has(level) ? {
            ...timePerPuzzleMap.get(level),
            [user]: timeSpent
        } : { [user]: timeSpent })
    })
}

triggerEventSearch = () => new Promise((resolve, reject) => {
    const numEvents = $("#event-input").val()
    const eventsToFetch = numEvents - eventList.length

    if (eventsToFetch > 0) {
        fetchPage(nextEventUrl, false, Math.max(1, Math.ceil(eventsToFetch / 100)))
            .then(fetchData => {
                eventList.push(...fetchData.results)
                nextEventUrl = fetchData.nextPage
                filterEventsAndPlayersByGroup(eventList.slice(0, numEvents))
                resolve()
            })
    } else {
        filterEventsAndPlayersByGroup(eventList.slice(0, numEvents))
        resolve()
    }
})

showEventStream = () => {
    $("#metrics-container > div").hide()
    $(".navbar-nav > a").removeClass("active")
    $("#event-stream-container").show()
    $("#nav-event-stream").addClass("active")

    createEventMap()
}

showFunnel = (scale) => {
    $("#metrics-container > div").hide()
    $(".navbar-nav > a").removeClass("active")
    $("#funnel-container").show()
    $("#nav-funnel").addClass("active")

    var legendData = []
    const dataMap = new Map()
    const dataList = []

    if (scale === FUNNEL_SCALE_OPTIONS.SKILL) {
        legendData = Object.keys(LEVELS)

        lastCompletedLevelMap.forEach((level, user, map) => {
            var skill = "Beginner"
            for (const key of Object.keys(LEVELS)) {
                if (LEVELS[key].indexOf(level) != -1) {
                    skill = key
                    break
                }
            }
            for (var i = 0; i <= SKILLS.indexOf(skill); i++) {
                const key = SKILLS[i]
                dataMap.set(key, dataMap.has(key) ? dataMap.get(key).concat(user) : [user])
            }
        })

        for (var i = 0; i < SKILLS.length; i++) {
            const key = SKILLS[i]
            if (!dataMap.has(key)) dataMap.set(key, [])
        }

        dataMap.forEach((val, key, map) => dataList.push({ value: val.length, name: key }))
    }

    const options = {
        tooltip: {
            trigger: "item",
            formatter: `{b}<br>{c} students`
        },
        toolbox: {
            feature: {
                dataView: { readOnly: true },
                restore: {},
                saveAsImage: {}
            }
        },
        legend: {
            data: legendData
        },
        calculable: true,
        series: [
            {
                type: "funnel",
                width: "100%",
                min: 0,
                max: filteredPlayerSet.size,
                minSize: "0%",
                maxSize: "100%",
                sort: "descending",
                gap: 2,
                label: {
                    show: true,
                    position: "inside"
                },
                labelLine: {
                    length: 10,
                    lineStyle: {
                        width: 1,
                        type: "solid"
                    }
                },
                itemStyle: {
                    borderColor: "#fff",
                    borderWidth: 1
                },
                emphasis: {
                    label: {
                        fontSize: 20
                    }
                },
                data: dataList
            }
        ]
    };

    funnelChart.setOption(options)
}

showBasicMetrics = (scale, filter) => {
    $("#metrics-container > div").hide()
    $(".navbar-nav > a").removeClass("active")
    $("#basic-metrics-container").show()
    $("#nav-basic-metrics").addClass("active")
    $("#basic-metric-cards > div").remove()

    if (scale === REPORT_OPTIONS.SCALE.CLASS) {
        var snapshotCount = 0
        var timeSpent = 0
        var latestLastCompleted = null
        var earliestLastCompleted = null
        var incompleted = 0

        if (filter === REPORT_OPTIONS.FILTER.ALL_SKILLS) {
            var snapSum = 0
            for (const val of snapshotMap.values()) snapSum += val
            snapshotCount = snapSum / filteredPlayerSet.size

            var timeSum = 0
            var incompleteSum = 0
            var timeCount = 0
            for (const val of timePerPuzzleMap.values()) {
                for (const time of Object.values(val)) {
                    if (time) {
                        if (time != -1) {
                            timeSum += time
                            timeCount += 1
                        }
                    } else {
                        incompleteSum += 1
                    }
                }
            }

            timeSpent = timeSum / timeCount
            incompleted = incompleteSum / filteredPlayerSet.size
            
            var minLevel = [Infinity, Infinity]
            var maxLevel = [-1, -1]
            const levelKeys = Object.keys(LEVELS)
            lastCompletedLevelMap.forEach((level, user, map) => {
                for (var i = 0; i < levelKeys.length; i++) {
                    const j = LEVELS[levelKeys[i]].indexOf(level)
                    if (j != -1) {
                       if (i >= maxLevel[0] && j > maxLevel[1]) {
                           maxLevel = [i, j]
                       } else if (i <= minLevel[0] && j < minLevel[1]) {
                           minLevel = [i, j]
                       }
                       break
                    }
                }
            })

            if (minLevel[0] != Infinity && minLevel[1] != Infinity) {
                earliestLastCompleted = LEVELS[levelKeys[minLevel[0]]][minLevel[1]]
                latestLastCompleted = LEVELS[levelKeys[maxLevel[0]]][maxLevel[1]]
            }
        }

        // incompleted, time spent, snapshot, lastcompleted
        // snapshotMap, lastCompletedLevelMap, timePerPuzzleMap

        const timeStr = timeSpent > 60 ? `${(timeSpent / 60).toFixed()}m` : `${timeSpent.toFixed(1)}s`
        createMetricCard("Average time per level", timeStr)
        createMetricCard("Average snapshots per student", snapshotCount.toFixed(1))
        createMetricCard("Average # of incomplete levels per student", incompleted.toFixed(1))
        createMetricCard("Earliest last level completed", earliestLastCompleted)
        createMetricCard("Latest last level completed", latestLastCompleted)
    }
}

createMetricCard = (name, value) => {
    const card = document.createElement("div")
    card.className = "card text-center bg-light mb-3"
    card.innerHTML = ` <div class="card-body"><h5 class="card-title">${value}</h5><h6 class="card-subtitle mb-2 text-muted">${name}</h6></div>`
    $("#basic-metric-cards").append(card)
}

// collectTypes = () => {
//     types = new Set()
//     eventList.forEach(event => types.add(event.type))
//     return types
// } 

handleTabSwitch = (tab) => {
    activeTab = tab
    if (activeTab === TABS.EVENT_STREAM) {
        showEventStream()
    } else {
        calculateMetrics()
        if (activeTab === TABS.PARTICIPATION_FUNNEL) {
            showFunnel(FUNNEL_SCALE_OPTIONS.SKILL)
        } else if (activeTab === TABS.BASIC_METRICS) {
            showBasicMetrics(REPORT_OPTIONS.SCALE.CLASS, REPORT_OPTIONS.FILTER.ALL_SKILLS)
        }
    }
}

processEvents = () => {
    triggerEventSearch()
        .then(resolved => {
            // console.log("types", collectTypes())
            handleTabSwitch(activeTab)
        })
}
