import { LEVELS_OF_ACTIVITY_DROPDOWN, METRIC_TO_METRIC_NAME } from './constants.js'

export function showPage(pageId, navId = null) {
    $("#page-container > .page").hide()
    $(".navbar-nav > a").removeClass("active disabled")
    $(`#${pageId}`).show()
    if (navId) {
        $(`#${navId}`).addClass("active")
    }
}

export function callAPI(url) {
    return new Promise((resolve, reject) => {
        fetch(url, { credentials: "same-origin" })
            .then(response => {
                resolve(response.json())
            })
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
    return timeInSeconds > 60 ? `${Math.floor(timeInSeconds / 60)}m ${(timeInSeconds % 60).toFixed()}s` : `${timeInSeconds.toFixed()}s`
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

export function showPlayerList(divId, playerMap, onClick) {
    const sortedEntries = Object.entries(playerMap).sort((a, b) => a[1].toLowerCase().localeCompare(b[1].toLowerCase()))

    for (let [pk, player] of sortedEntries) {
        const button = document.createElement("button")
        button.id = pk
        button.className = "player-button list-group-item list-group-item-action btn-secondary"
        button.type = "button"
        button.textContent = player
        document.getElementById(divId).appendChild(button)
        $(`#${pk}`).click(onClick)
    }
}

export function toCamelCase(text) {
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function puzzleNameToClassName(puzzle) {
    return puzzle.toLowerCase().replace(/[0-9]. /g, "begin-").replace(/\.|( )/g, "-")
}

export function createNormalizationToggle(configParentId, onChangeCallback) {
    const ccDiv = document.createElement("div")
    ccDiv.className = "custom-control custom-switch"

    const input = document.createElement("input")
    input.type = "checkbox"
    input.className = "custom-control-input"
    input.id = configParentId + "-norm-toggle"
    input.onchange = onChangeCallback
    input.value = false

    const label = document.createElement("label")
    label.className = "custom-control-label"
    label.htmlFor = configParentId + "-norm-toggle"
    label.textContent = "Normalize Radar Chart"
    ccDiv.appendChild(input)
    ccDiv.appendChild(label)
    $(`#${configParentId} > .radar-config`).append(ccDiv)
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

export function buildRadarChart(currentDataset, axisValues, svgId, legendList, playerMap = null, normalize = false, statistics = null) {
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
        playerMap: playerMap,
        normalize: normalize,
        statistics: statistics
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

    render(config, vis); // render the visualization
}

// render the visualization
function render(config, vis) {
    // remove existing svg if exists
    d3.select(config.svgId).selectAll("svg").remove();
    updateConfig(config, vis);

    if (config.facet) {
        config.data.forEach(function (d, i) {
            buildVis([d]); // build svg for each data group

            // override colors
            vis.svg.selectAll(".polygon-areas")
                .attr("stroke", config.colors(i))
                .attr("fill", config.colors(i));
            vis.svg.selectAll(".polygon-vertices")
                .attr("fill", config.colors(i));
            vis.svg.selectAll(".legend-tiles")
                .attr("fill", config.colors(i));
        });
    } else {
        buildVis(config, vis); // build svg
    }
}

// update configuration parameters
function updateConfig(config, vis) {
    const dataLength = Object.keys(config.data).length
    if (dataLength > 0) {
        // adjust config parameters
        config.maxValue = config.normalize ? 1 : Math.max(config.maxValue, d3.max(Object.values(config.data), function (v) {
            return d3.max(Object.entries(v), function ([metric, value]) {
                if (vis.allAxis.find((av) => av === metric)) {
                    return v.event == 0 ? 1 : value
                } else {
                    return 1
                }
            })
        }))
        config.maxValue += 1

        config.w *= config.levelScale;
        config.h *= config.levelScale;
        config.paddingX = config.w * config.levelScale;
        config.paddingY = config.h * config.levelScale;

        config.colors.domain(Array.from(config.legendList))

        // if facet required:
        if (config.facet) {
            config.w /= dataLength;
            config.h /= dataLength;
            config.paddingX /= (dataLength / config.facetPaddingScale);
            config.paddingY /= (dataLength / config.facetPaddingScale);
            config.polygonPointSize *= Math.pow(0.9, dataLength);
        }
    }
}

//build visualization using the other build helper functions
function buildVis(config, vis) {
    buildVisComponents(config, vis);
    buildCoordinates(config, vis);
    if (config.showLevels) buildLevels(config, vis)
    if (config.showLevelsLabels) buildLevelsLabels(config, vis)
    if (config.showAxes) buildAxes(config, vis)
    if (config.showLegend) buildLegend(config, vis)
    if (config.showPolygons) buildPolygons(config, vis)
    if (config.showVertices) buildVertices(config, vis)
    if (config.showAxesLabels) buildAxesLabels(config, vis)
}

// build main vis components
function buildVisComponents(config, vis) {
    // update vis parameters
    vis.totalAxes = vis.allAxis.length
    vis.radius = Math.min(config.w / 2, config.h / 2);

    // create main vis svg
    vis.svg = d3.select(config.svgId)
        .append("svg").classed("svg-vis", true)
        .attr("width", config.w + config.paddingX)
        .attr("height", config.h + config.paddingY)
        .append("svg:g")
        .attr("transform", "translate(" + config.translateX + "," + config.translateY + ")");;

    // create verticesTooltip
    vis.verticesTooltip = d3.select("body")
        .append("div").classed("verticesTooltip", true)
        .attr("opacity", 0)

    // create levels
    vis.levels = vis.svg.selectAll(".levels")
        .append("svg:g").classed("levels", true);

    // create axes
    vis.axes = vis.svg.selectAll(".axes")
        .append("svg:g").classed("axes", true);

    // create vertices
    vis.vertices = vis.svg.selectAll(".vertices");

    //Initiate Legend	
    vis.legend = vis.svg.append("svg:g").classed("legend", true)
        .attr("height", config.h / 2)
        .attr("width", config.w / 2)
        .attr("transform", "translate(" + 0 + ", " + 1.1 * config.h + ")");
}

// builds out the levels of the spiderweb
function buildLevels(config, vis) {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-lines
        vis.levels
            .data(vis.allAxis).enter()
            .append("svg:line").classed("level-lines", true)
            .attr("x1", function (d, i) { return levelFactor * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
            .attr("y1", function (d, i) { return levelFactor * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
            .attr("x2", function (d, i) { return levelFactor * (1 - Math.sin((i + 1) * config.radians / vis.totalAxes)); })
            .attr("y2", function (d, i) { return levelFactor * (1 - Math.cos((i + 1) * config.radians / vis.totalAxes)); })
            .attr("transform", "translate(" + (config.w / 2 - levelFactor) + ", " + (config.h / 2 - levelFactor) + ")")
            .attr("stroke", "gray")
            .attr("stroke-width", "0.5px");
    }
}

// builds out the levels labels
function buildLevelsLabels(config, vis) {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-labels
        vis.levels
            .data([1]).enter()
            .append("svg:text").classed("level-labels", true)
            .text(((config.maxValue * (level + 1) / config.levels) - 1).toFixed(2))
            .attr("x", function (d) { return levelFactor * (1 - Math.sin(0)); })
            .attr("y", function (d) { return levelFactor * (1 - Math.cos(0)); })
            .attr("transform", "translate(" + (config.w / 2 - levelFactor + 5) + ", " + (config.h / 2 - levelFactor) + ")")
            .attr("fill", "gray")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10 * config.labelScale + "px");
    }
}

// builds out the axes
function buildAxes(config, vis) {
    vis.axes
        .data(vis.allAxis).enter()
        .append("svg:line").classed("axis-lines", true)
        .attr("x1", config.w / 2)
        .attr("y1", config.h / 2)
        .attr("x2", function (d, i) { return config.w / 2 * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y2", function (d, i) { return config.h / 2 * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
        .attr("stroke", "grey")
        .attr("stroke-width", "1px");
}

// builds out the axes labels
function buildAxesLabels(config, vis) {
    vis.axes
        .data(vis.allAxis).enter()
        .append("svg:text").classed("axis-labels", true)
        .text(function (d, i) { return METRIC_TO_METRIC_NAME[d] })
        .attr("text-anchor", "middle")
        .attr("x", function (d, i) { return config.w / 2 * (1 - 1.3 * Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y", function (d, i) { return config.h / 2 * (1 - 1.1 * Math.cos(i * config.radians / vis.totalAxes)); })
        .attr("font-family", "sans-serif")
        .attr("font-size", 11 * config.labelScale + "px");
}


// builds [x, y] coordinates of polygon vertices.
function buildCoordinates(config, vis) {
    console.log(config.data)
    Object.entries(config.data).forEach(function ([key, data]) {
        const axisEntries = Object.entries(data)
        function findAxis(axis) {
            var entry = ["", 0]
            if (axis) {
                entry = axisEntries.find(([metric, value]) => metric === axis) || ["", 0]
            }

            const numEvents = config.data[key].event

            const result = {
                axis: entry[0],
                value: numEvents > 0 ? entry[1] : 0
            }

            if (config.normalize) {
                const min = config.statistics[key][result.axis].min
                const max = config.statistics[key][result.axis].max
                result.norm_value = ((result.value - min) / (max - min)) + 1 || 1
            } else {
                result.value += 1
            }

            console.log(config.statistics, result)
            return result
        }

        data.visibleAxes = vis.allAxis.map((axisLabel, i) => {
            const axis = findAxis(axisLabel)
            return config.normalize ? {
                ...axis,
                coordinates: { // [x, y] coordinates
                    x: config.w / 2 * (1 - (parseFloat(Math.max(axis.norm_value, 0)) / config.maxValue) * Math.sin(i * config.radians / vis.totalAxes)),
                    y: config.h / 2 * (1 - (parseFloat(Math.max(axis.norm_value, 0)) / config.maxValue) * Math.cos(i * config.radians / vis.totalAxes))
                }
            } : {
                ...axis,
                coordinates: { // [x, y] coordinates
                    x: config.w / 2 * (1 - (parseFloat(Math.max(axis.value, 0)) / config.maxValue) * Math.sin(i * config.radians / vis.totalAxes)),
                    y: config.h / 2 * (1 - (parseFloat(Math.max(axis.value, 0)) / config.maxValue) * Math.cos(i * config.radians / vis.totalAxes))
                }
            }
        })
    });
}


// builds out the polygon vertices of the dataset
function buildVertices(config, vis) {
    Object.entries(config.data).forEach(function ([player, metrics], g) {
        vis.vertices
            .data(metrics.visibleAxes).enter()
            .append("svg:circle").classed("polygon-vertices", true)
            .attr("r", config.polygonPointSize)
            .attr("cx", function (d, i) { return d.coordinates.x; })
            .attr("cy", function (d, i) { return d.coordinates.y; })
            .attr("fill", config.colors(g))
            .on('mouseover', (d) => verticesTooltipShow(config, vis, d))
            .on('mouseout', (d) => verticesTooltipHide(vis));
    });
}


// builds out the polygon areas of the dataset
function buildPolygons(config, vis) {
    vis.vertices
        .data(Object.entries(config.data)).enter()
        .append("svg:polygon").classed("polygon-areas", true)
        .attr("points", function (d) { // build verticesString for each group
            var verticesString = "";
            d[1].visibleAxes.forEach(function (d) { verticesString += d.coordinates.x + "," + d.coordinates.y + " "; });
            return verticesString;
        })
        .attr("stroke-width", "2px")
        .attr("stroke", function (d, i) { return config.colors(i) })
        .attr("fill", function (d, i) { return config.colors(i) })
        .attr("fill-opacity", config.polygonAreaOpacity)
        .attr("stroke-opacity", config.polygonStrokeOpacity)
        .on('mouseover', function (d) {
            vis.svg.selectAll(".polygon-areas") // fade all other polygons out
                .transition(250)
                .attr("fill-opacity", 0.1)
                .attr("stroke-opacity", 0.1);
            d3.select(this) // focus on active polygon
                .transition(250)
                .attr("fill-opacity", 0.7)
                .attr("stroke-opacity", config.polygonStrokeOpacity);
        })
        .on('mouseout', function () {
            d3.selectAll(".polygon-areas")
                .transition(250)
                .attr("fill-opacity", config.polygonAreaOpacity)
                .attr("stroke-opacity", 1);
        });
}

// builds out the legend
function buildLegend(config, vis) {
    const legendList = Array.from(config.legendList)
    //Create legend squares
    vis.legend.selectAll(".legend-tiles")
        .data(legendList).enter()
        .append("svg:rect").classed("legend-tiles", true)
        .attr("x", config.w - config.paddingX / 2)
        .attr("y", function (d, i) { return i * 2 * config.legendBoxSize; })
        .attr("width", config.legendBoxSize)
        .attr("height", config.legendBoxSize)
        .attr("fill", function (d, g) { return config.colors(g); });

    //Create text next to squares
    vis.legend.selectAll(".legend-labels")
        .data(legendList).enter()
        .append("svg:text").classed("legend-labels", true)
        .attr("x", config.w - config.paddingX / 2 + (1.5 * config.legendBoxSize))
        .attr("y", function (d, i) { return i * 2 * config.legendBoxSize; })
        .attr("dy", 0.07 * config.legendBoxSize + "em")
        .attr("font-size", 11 * config.labelScale + "px")
        .attr("fill", d => config.data[d].event == 0 ? "red" : "grey")
        .text(function (d) {
            return config.playerMap ? (d === "avg" ? "Class Avg." : config.playerMap[d]) : d;
        });
}

// show tooltip of vertices
function verticesTooltipShow(config, vis, d) {
    if (config.normalize) {
        vis.verticesTooltip.style("opacity", 0.9)
            .html("<strong>Value</strong>: " + (d.value).toFixed(2) + "<br /><strong>Normalized value</strong>: " + (d.norm_value - 1).toFixed(2) + "<br />")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY) + "px");
    } else {
        vis.verticesTooltip.style("opacity", 0.9)
            .html("<strong>Value</strong>: " + (d.value - 1).toFixed(2) + "<br />")
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY) + "px");
    }
}

// hide tooltip of vertices
function verticesTooltipHide(vis) {
    vis.verticesTooltip.style("opacity", 0);
}

// TODO: fix tooltip value