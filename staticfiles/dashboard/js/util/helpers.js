import { LEVELS_OF_ACTIVITY_DROPDOWN, NORMALIZATION_OPTIONS } from './constants.js'
import { renderRadar } from './radar.js';

export function showPage(pageId, navId = null) {
    $("#page-container > .page").hide()
    $(".nav-link-item").removeClass("active disabled")
    $(`#${pageId}`).show()
    if (navId) {
        $(`#${navId}`).addClass("active")
    }
}

export function callAPI(url, method="GET") {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: method,
            credentials: "same-origin"
        }).then(response => { resolve(response.json()) })
    })
}

export function fetchPage(url, shouldFetchAll = false, pagesToFetch = 1) {
    return new Promise((resolve, reject) => {
        if (!url) resolve([])

        callAPI(url)
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
}

export function toEchartsData(data, keyNameMap = {}) {
    const formattedData = []
    for (let [key, value] of Object.entries(data)) {
        formattedData.push({name: keyNameMap[key] || key, value: value})
    }
    return formattedData
}

export function createBarChart(data, divId, title = null, xAxisData = null, showLegend = false) {
    const barChart = echarts.init(document.getElementById(divId))
    const options = {
        tooltip: {},
        calculable: true,
        xAxis: {
            data: xAxisData ? xAxisData : [...Array(data.length).keys()].map(i => i + 1)
        },
        yAxis: {},
        series: {
            name: title,
            type: "bar",
            height: '80%',
            width: '80%',
            top: '10%',
            left: '10%',
            label: { show: true, position: "inside" },
            data: data
        }
    }

    if (title) {
        options.title = {
            textStyle: {
                fontSize: 14
            },
            text: title,
            left: "center",
            triggerEvent: true
        }
    }

    if (showLegend) {
        options.legend = {
            data: Object.values(keyNameMap)
        }
    }

    barChart.setOption(options)
}


export function formatPlurals(text, value) {
    return text + `${value == 1 ? "" : "s"}`
}

export function formatTime(timeInSeconds) {
    if (timeInSeconds > 60*60) {
        return `${Math.floor(timeInSeconds / 3600)}h ${Math.floor((timeInSeconds % 3600) / 60)}m ${((timeInSeconds % 300)% 60).toFixed()}s`
    }
    if (timeInSeconds > 60) {
        return `${Math.floor(timeInSeconds / 60)}m ${(timeInSeconds % 60).toFixed()}s`
    }
    return `${timeInSeconds.toFixed()}s`
}

export function createMetricCard(name, value) {
    const card = document.createElement("div")
    card.className = "card text-center bg-light mb-3 border-secondary metric-card"
    card.innerHTML = ` <div class="card-body"><h5 class="card-title">${value}</h5><h6 class="card-subtitle mb-2 text-muted">${name}</h6></div>`
    return card
}

export function createGraphCard(graph, id) {
    const card = document.createElement("div")
    card.id = id
    card.className = "card text-center bg-light mb-3 border-secondary"
    const cardBody = document.createElement("div")
    cardBody.className = "card-body"
    cardBody.appendChild(graph)
    card.appendChild(cardBody)
    return card
}

export function showPlayerList(buttonClass, divId, playerMap, onClick) {
    const entries = Object.entries(playerMap)
    const sortedEntries = isNaN(entries[0])
        ? entries.sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()))
        : entries.sort((a, b) => parseInt(a[1]) - parseInt(b[1]))
        

    for (let [pk, player] of sortedEntries) {
        const button = document.createElement("button")
        button.id = pk
        button.className = "player-button list-group-item list-group-item-action btn-secondary " + buttonClass
        button.type = "button"
        button.textContent = player
        document.getElementById(divId).appendChild(button)
        $(`#${pk}.${buttonClass}`).click(onClick)
    }

    const searchBarDiv = document.createElement("div")
    searchBarDiv.className = "input-group md-form form-sm form-2 pl-0"

    const searchBarInput = document.createElement("input")
    searchBarInput.className = "form-control my-0 py-1 amber-border"
    searchBarInput.type = "text"
    searchBarInput.placeholder = "Search"
    searchBarInput.oninput = function(e) {
        const searchString = e.target.value
        const shouldShowAll = searchString === ""
        $(`.${buttonClass}`).each(function() {
            if (shouldShowAll || $(this).attr("id").startsWith(searchString)) {
                $(this).show()
            } else {
                $(this).hide()
            }
        })
    }

    searchBarDiv.appendChild(searchBarInput)

    const searchBarInputGroup = document.createElement("div")
    searchBarInputGroup.className = "input-group-append"
    searchBarInputGroup.innerHTML = '<span class="input-group-text amber lighten-3"><i class="fas fa-search text-grey"'
        + ' aria-hidden="true"></i></span>'
    searchBarDiv.appendChild(searchBarInputGroup)

    $(searchBarDiv).insertBefore($(`#${divId}`))
}

export function toCamelCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function puzzleNameToClassName(puzzle) {
    return puzzle.toLowerCase().replace(/[0-9]. /g, "begin-").replace(/\.|( )/g, "-")
}

export function createNormalizationToggle(configParentId, onChangeCallback) {
//     <div class="form-check form-check-inline">
//         <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="option1">
//             <label class="form-check-label" for="inlineRadio1">1</label>
// </div>
    const form = document.createElement("form")
    form.innerHTML = "Normalization<br>"
    $(`#${configParentId} > .radar-config`).append(form)

    for (let key of Object.keys(NORMALIZATION_OPTIONS)) {
        const formCheck = document.createElement("div")
        formCheck.className = "form-check form-check-inline"

        const input = document.createElement("input")
        input.type = "radio"
        input.className = "form-check-input"
        input.id = configParentId + "-norm-" + key
        input.name = configParentId + "-norm"
        input.onchange = onChangeCallback
        input.value = key
        input.checked = key === "NONE"

        const label = document.createElement("label")
        label.className = "form-check-label"
        label.htmlFor = configParentId + "-norm-" + key
        label.textContent = key
        formCheck.appendChild(input)
        formCheck.appendChild(label)
        form.appendChild(formCheck)
    }
}

const numRemoved = {}

export function createOptionDropdownItems(dropdownId, dropdownLabelId, prefix, linkClass, num) {
    if (!(prefix in numRemoved)) {
        numRemoved[prefix] = 0
    }

    for (let member of LEVELS_OF_ACTIVITY_DROPDOWN) {
        const item = document.createElement("a")
        item.className = "dropdown-item"
        item.text = member.axis
        item.onclick = function (event) {
            $(`#${dropdownLabelId}`).text(member.axis)
            $(`#${dropdownLabelId}`).attr("dropdown-value", member.value)

            if (num !== 1) {
                const close = document.createElement("span")
                close.className = "remove-radar-option"
                close.onclick = function (event) {
                    numRemoved[prefix] += 1
                    $("#" + prefix + "option-" + num + "-dropdown-container").remove()
                }

                const closeIcon = document.createElement("i")
                closeIcon.className = "fas fa-times"
                close.appendChild(closeIcon)

                document.getElementById(dropdownLabelId).appendChild(close)
            }
            
            if ($("#" + prefix + "option-list").children().length == (num - numRemoved[prefix])) {
                const nextNum = num + 1
                const dropdown = document.createElement("div")
                dropdown.className = "dropdown"
                dropdown.id = prefix + "option-" + nextNum + "-dropdown-container"

                const link = document.createElement("a")
                link.id = prefix + "option-" + nextNum
                link.className = linkClass + " list-group-item list-group-item-action dropdown-toggle"
                link.role = "button"

                const icon = document.createElement("i")
                icon.className = "fas fa-plus plus-option"
                link.appendChild(icon)
                link.append(" Option")
                dropdown.appendChild(link)

                const menu = document.createElement("div")
                menu.id = prefix + "option-" + nextNum + "-dropdown"
                menu.className = "dropdown-menu"
                dropdown.appendChild(menu)
                document.getElementById(prefix + "option-list").appendChild(dropdown)

                $("#" + prefix + "option-" + nextNum).attr("data-toggle", "dropdown")
                createOptionDropdownItems(prefix + "option-" + nextNum + "-dropdown", prefix + "option-" + nextNum, prefix, linkClass, nextNum)
            }
        }
        document.getElementById(dropdownId).appendChild(item)
    }
}

export function buildRadarChart(currentDataset, axisValues, svgId, legendList) {
    if (axisValues.length === 0) return

    var w = 350;
    var h = 350;
    var config = {
        w: w,
        h: h,
        facet: false,
        levels: 5,
        levelScale: 0.85,
        labelScale: 1.0,
        facetPaddingScale: 2.5,
        maxValue: 0,
        radians: 2 * Math.PI,
        polygonAreaOpacity: 0.3,
        polygonStrokeOpacity: 1,
        polygonPointSize: 4,
        legendBoxSize: 10,
        translateX: w / 4,
        translateY: h / 4,
        paddingX: w,
        paddingY: h,
        colors: d3.scaleOrdinal(d3.schemeCategory10),
        showLevels: true,
        showLevelsLabels: true,
        showAxesLabels: true,
        showAxes: true,
        showLegend: true,
        showVertices: true,
        showPolygons: true,
        svgId: svgId,
        data: currentDataset,
        legendList: legendList,
        playerMap: playerMap
    };

    // initiate main vis component
    var vis = {
        svg: null,
        tooltip: null,
        levels: null,
        axis: null,
        vertices: null,
        legend: null,
        allAxis: axisValues,
        total: null,
        radius: null
    };

    renderRadar(config, vis); // render the visualization
}

export function getClassAverage(stats) {
    const avg = {}
    for (let [metric, values] of Object.entries(stats)) {
        avg[metric] = values["mean"]
    }
    return avg
}