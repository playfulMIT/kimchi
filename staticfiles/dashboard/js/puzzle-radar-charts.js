import { showPage, showPlayerList, toCamelCase } from './helpers.js'
import { SANDBOX_PUZZLE_NAME } from './constants.js'
// import { output } from './output.js'

var config = null
var vis = null

var playerMap = null
var puzzleData = null

var formattedData = null

var currentDataset = {}
var currentPlayers = new Set()
var currentPuzzle = null
var studentsToAdd = new Set()

var firstRender = true

// TODO: stop legend from changing color
// TODO: change avg to median
// TODO: make option things more salient 

const defaultMetrics = {
    active_time: 0,
    create_shape: 0,
    delete_shape: 0,
    different_events: 0,
    event: 0,
    move_shape: 0,
    paint: 0,
    redo_action: 0,
    rotate_view: 0,
    scale_shape: 0,
    snapshot: 0,
    undo_action: 0
}

const dropdownMembers = [
    // {
    //     axis: "Option",
    //     value: null
    // },
    // {
    //     axis: "Active Time",
    //     value: "active_time"
    // },
    {
        axis: "Create Shape",
        value: "create_shape"
    },
    {
        axis: "Move Shape",
        value: "move_shape"
    },
    {
        axis: "Scale Shape",
        value: "scale_shape"
    },
    {
        axis: "Delete Shape",
        value: "delete_shape"
    },
    {
        axis: "Paint",
        value: "paint"
    },
    {
        axis: "Undo Action",
        value: "undo_action"
    },
    {
        axis: "Redo Action",
        value: "redo_action"
    },
    {
        axis: "Rotate View",
        value: "rotate_view"
    },
    {
        axis: "Snapshot",
        value: "snapshot"
    }
]

var axisValues = []
var axisNames = []
var numRemoved = 0

// TODO: optimize render 

function addStudentToChart(ids) {
    if (currentPuzzle) {
        for (let id of ids) {
            currentDataset[id] = formattedData[currentPuzzle][id] || defaultMetrics
        }
    }
    currentPlayers = new Set([...currentPlayers, ...ids])

    const playerList = Array.from(currentPlayers)
    d3.select("#radar-players").selectAll(".player-button-radar")
        .data(playerList).enter()
        .append("button")
        .attr("id", d => `player-button-radar-${d}`)
        .classed("player-button-radar btn btn-light", true)
        .attr("type", "button")
        .text(d => d === "avg" ? "Class Avg." : playerMap[d])
        .on("mouseover", (d) => {
            d3.select(`#player-button-radar-${d}`)
                .classed("btn-light", false)
                .classed("btn-danger", true)
        })
        .on("mouseout", (d) => {
            d3.select(`#player-button-radar-${d}`)
                .classed("btn-danger", false)
                .classed("btn-light", true)
        })
        .on("click", d => {
            d3.select(`#player-button-radar-${d}`).remove()
            removeStudentFromChart(d)
        })
        .append("span")
        .attr("aria-hidden", "true")
        .html("&nbsp;&times;")

    createRadarChart()
}

function removeStudentFromChart(id) {
    delete currentDataset[id]
    currentPlayers.delete(id)
    createRadarChart()
}

function createOptionDropdownItems(dropdownId, dropdownLabelId, num) {
    for (let member of dropdownMembers) {
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
                    numRemoved += 1
                    $("#radar-puzzle-option-" + num + "-dropdown-container").remove()
                }

                const closeIcon = document.createElement("i")
                closeIcon.className = "fas fa-times"
                close.appendChild(closeIcon)

                document.getElementById(dropdownLabelId).appendChild(close)
            }

            if ($("#radar-puzzle-option-list").children().length == (num - numRemoved)) {
                const nextNum = num + 1
                const dropdown = document.createElement("div")
                dropdown.className = "dropdown"
                dropdown.id = "radar-puzzle-option-" + nextNum + "-dropdown-container"

                const link = document.createElement("a")
                link.id = "radar-puzzle-option-" + nextNum
                link.className = "puzzle-plus-option-button list-group-item list-group-item-action dropdown-toggle"
                link.role = "button"
                
                const icon = document.createElement("i")
                icon.className = "fas fa-plus plus-option"
                link.appendChild(icon)
                link.append(" Option")
                dropdown.appendChild(link)
                
                const menu = document.createElement("div")
                menu.id = "radar-puzzle-option-" + nextNum + "-dropdown"
                menu.className = "dropdown-menu"
                dropdown.appendChild(menu)
                document.getElementById("radar-puzzle-option-list").appendChild(dropdown)

                $("#radar-puzzle-option-" + nextNum).attr("data-toggle", "dropdown")
                createOptionDropdownItems("radar-puzzle-option-" + nextNum + "-dropdown", "radar-puzzle-option-" + nextNum, nextNum)
            }
        }
        document.getElementById(dropdownId).appendChild(item)
    }
}

function buildChartWithNewAxes() {
    var newAxisValues = []
    var newAxisNames = []

    $(".puzzle-plus-option-button").each(function(i, e) {
        if ($(e).text() === " Option") return
        newAxisValues.push($(e).attr("dropdown-value"))
        newAxisNames.push($(e).text())
    })

    axisValues = newAxisValues
    axisNames = newAxisNames
    createRadarChart()
}

$(document).ready(() => {
    createOptionDropdownItems("radar-puzzle-option-1-dropdown", "radar-puzzle-option-1", 1)
    $("#build-puzzle-radar-button").click(buildChartWithNewAxes)

    $("#add-class-average-button").on("click", () => addStudentToChart(new Set(["avg"])))
    $("#add-student-button-radar").on("click", () => addStudentToChart(studentsToAdd))

    $("#add-student-modal-radar").on("show.bs.modal", () => {
        const filteredPlayerMap = Object.assign(...Object.keys(playerMap)
            .filter(key => !currentPlayers.has(key))
            .map(key => ({ [key]: playerMap[key] })))

        $("#add-player-list").empty()
        showPlayerList("add-player-list", filteredPlayerMap, (event) => handleAddStudentButtonClick(event.target.id))

        if (currentPuzzle) {
            for (let key of Object.keys(filteredPlayerMap)) {
                if (!formattedData[currentPuzzle][key] || formattedData[currentPuzzle][key].event == 0) {
                    $(`button#${key}`).removeClass("btn-secondary").addClass("btn-danger")
                    $(`button#${key}`).css("background-color", "red")
                }
            }
        }

        handleAddStudentButtonClick(null)
    })

    $("#add-student-modal-radar").on("hidden.bs.modal", () => handleAddStudentButtonClick(null))
})

function onPuzzleClick(event, puzzle) {
    $("#puzzle-dropdown-button").text(puzzle)
    $(".puzzle-dropdown-option").removeClass("active")
    $(event.target).addClass("active")

    currentPuzzle = puzzle
    currentDataset = {}

    for (let player of currentPlayers) {
        currentDataset[player] = formattedData[currentPuzzle][player] || defaultMetrics
    }
    createRadarChart()
} 

function createPuzzleDropdown() {
    const dropdown = document.getElementById("puzzle-dropdown-options")
    var firstIter = true

    for (let [difficulty, puzzles] of Object.entries(puzzleData["puzzles"])) {
        if (!firstIter) {
            const divider = document.createElement("div")
            divider.className = "dropdown-divider"
            dropdown.appendChild(divider)
        }
        firstIter = false

        const header = document.createElement("h6")
        header.className = "dropdown-header"
        header.textContent = toCamelCase(difficulty)
        dropdown.appendChild(header)

        for (let puzzle of puzzles) {
            const link = document.createElement("a")
            link.className = "puzzle-dropdown-option dropdown-item"
            link.href = "#"
            link.textContent = puzzle
            link.onclick = (event) => onPuzzleClick(event, puzzle)
            dropdown.appendChild(link)
        }
    }

    if (puzzleData["canUseSandbox"]) {
        if (!firstIter) {
            const divider = document.createElement("div")
            divider.className = "dropdown-divider"
            dropdown.appendChild(divider)
        }

        const link = document.createElement("a")
        link.className = "puzzle-dropdown-option dropdown-item"
        link.href = "#"
        link.textContent = SANDBOX_PUZZLE_NAME
        link.onclick = (event) => onPuzzleClick(event, SANDBOX_PUZZLE_NAME)
        dropdown.appendChild(link)
    }
}   

function createRadarChart() {
    if (axisValues.length === 0) return

    var w = 500;
    var h = 500;
    config = {
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
      showPolygons: true
    };

    // initiate main vis component
    vis = {
      svg: null,
      tooltip: null,
      levels: null,
      axis: null,
      vertices: null,
      legend: null,
      allAxis: null,
      total: null,
      radius: null
    };

    render(currentDataset); // render the visualization
    firstRender = false
}

// render the visualization
function render(data) {
    // remove existing svg if exists
    d3.select('#puzzle-radar-chart').selectAll("svg").remove();
    updateConfig(data);
    
    if (config.facet) {
        data.forEach(function(d, i) {
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
        buildVis(data); // build svg
    }
}

// update configuration parameters
function updateConfig(data) {
    const dataLength = Object.keys(data).length
    if (dataLength > 0) {
        // adjust config parameters
        config.maxValue = Math.max(config.maxValue, d3.max(Object.values(data), function (v) {
            return d3.max(Object.entries(v), function ([metric, value]) {
                if (axisValues.find((av) => av === metric)) {
                    return v.event == 0 ? 1 : (value / v.event) * 100
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

        config.colors.domain(Array.from(currentPlayers))

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
function buildVis(data) {
    buildVisComponents();
    buildCoordinates(data);
    if (config.showLevels) buildLevels();
    if (config.showLevelsLabels) buildLevelsLabels();
    if (config.showAxes) buildAxes();
    if (config.showLegend) buildLegend();
    if (config.showPolygons) buildPolygons(data);
    if (config.showVertices) buildVertices(data);
    if (config.showAxesLabels) buildAxesLabels();
}

// build main vis components
function buildVisComponents() {
    // update vis parameters
    vis.allAxis = axisValues
    vis.totalAxes = vis.allAxis.length
    vis.radius = Math.min(config.w / 2, config.h / 2);

    // create main vis svg
    vis.svg = d3.select('#puzzle-radar-chart')
        .append("svg").classed("svg-vis", true)
        .attr("width", config.w + config.paddingX)
        .attr("height", config.h + config.paddingY)
        .append("svg:g")
        .attr("transform", "translate(" + config.translateX + "," + config.translateY + ")");;

    // create verticesTooltip
    vis.verticesTooltip = d3.select("body")
        .append("div").classed("verticesTooltip", true)
        .attr("opacity", 0)
        .attr("style", {
            "position": "absolute",
            "color": "black",
            "font-size": "10px",
            "width": "100px",
            "height": "auto",
            "padding": "5px",
            "border": "2px solid gray",
            "border-radius": "5px",
            "pointer-events": "none",
            "opacity": "0",
            "background": "#f4f4f4"
        });

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
function buildLevels() {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-lines
        vis.levels
            .data(vis.allAxis).enter()
            .append("svg:line").classed("level-lines", true)
            .attr("x1", function(d, i) { return levelFactor * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
            .attr("y1", function(d, i) { return levelFactor * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
            .attr("x2", function(d, i) { return levelFactor * (1 - Math.sin((i + 1) * config.radians / vis.totalAxes)); })
            .attr("y2", function(d, i) { return levelFactor * (1 - Math.cos((i + 1) * config.radians / vis.totalAxes)); })
            .attr("transform", "translate(" + (config.w / 2 - levelFactor) + ", " + (config.h / 2 - levelFactor) + ")")
            .attr("stroke", "gray")
            .attr("stroke-width", "0.5px");
    }
}

// builds out the levels labels
function buildLevelsLabels() {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-labels
        vis.levels
            .data([1]).enter()
            .append("svg:text").classed("level-labels", true)
            .text(((config.maxValue * (level + 1) / config.levels)-1).toFixed(2) + "%")
            .attr("x", function(d) { return levelFactor * (1 - Math.sin(0)); })
            .attr("y", function(d) { return levelFactor * (1 - Math.cos(0)); })
            .attr("transform", "translate(" + (config.w / 2 - levelFactor + 5) + ", " + (config.h / 2 - levelFactor) + ")")
            .attr("fill", "gray")
            .attr("font-family", "sans-serif")
            .attr("font-size", 10 * config.labelScale + "px");
    }
}

// builds out the axes
function buildAxes() {
    vis.axes
        .data(vis.allAxis).enter()
        .append("svg:line").classed("axis-lines", true)
        .attr("x1", config.w / 2)
        .attr("y1", config.h / 2)
        .attr("x2", function(d, i) { return config.w / 2 * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y2", function(d, i) { return config.h / 2 * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
        .attr("stroke", "grey")
        .attr("stroke-width", "1px");
}

// builds out the axes labels
function buildAxesLabels() {
    vis.axes
        .data(vis.allAxis).enter()
        .append("svg:text").classed("axis-labels", true)
        .text(function (d, i) { return axisNames[i] })
        .attr("text-anchor", "middle")
        .attr("x", function (d, i) { return config.w / 2 * (1 - 1.3 * Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y", function (d, i) { return config.h / 2 * (1 - 1.1 * Math.cos(i * config.radians / vis.totalAxes)); })
        .attr("font-family", "sans-serif")
        .attr("font-size", 11 * config.labelScale + "px");
}


// builds [x, y] coordinates of polygon vertices.
function buildCoordinates(data) {
    Object.entries(data).forEach(function([player, data]) {
        const axisEntries = Object.entries(data)
        function findAxis(axis) {
            var entry = ["", 0]
            if (axis) {
                entry = axisEntries.find(([metric, value]) => metric === axis) || ["", 0]
            }

            const numEvents = currentDataset[player].event

            return {
                axis: entry[0],
                value: numEvents > 0 ? (entry[1] / numEvents) * 100 + 1: 1,
            }
        }

        data.visibleAxes = axisValues.map((axisLabel, i) => {
            const axis = findAxis(axisLabel)
            return {
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
function buildVertices(data) {
    Object.entries(data).forEach(function([player, metrics], g) {
        vis.vertices
            .data(metrics.visibleAxes).enter()
            .append("svg:circle").classed("polygon-vertices", true)
            .attr("r", config.polygonPointSize)
            .attr("cx", function(d, i) { return d.coordinates.x; })
            .attr("cy", function(d, i) { return d.coordinates.y; })
            .attr("fill", config.colors(g))
            .on('mouseover', verticesTooltipShow)
            .on('mouseout', verticesTooltipHide);
    });
}


// builds out the polygon areas of the dataset
function buildPolygons(data) {
    vis.vertices
        .data(Object.entries(data)).enter()
        .append("svg:polygon").classed("polygon-areas", true)
        .attr("points", function(d) { // build verticesString for each group
            var verticesString = "";
            d[1].visibleAxes.forEach(function(d) { verticesString += d.coordinates.x + "," + d.coordinates.y + " "; });
            return verticesString;
        })
        .attr("stroke-width", "2px")
        .attr("stroke", function (d, i) { return config.colors(i) })
        .attr("fill", function (d, i) { return config.colors(i) })
        .attr("fill-opacity", config.polygonAreaOpacity)
        .attr("stroke-opacity", config.polygonStrokeOpacity)
        .on('mouseover', function(d) {
            vis.svg.selectAll(".polygon-areas") // fade all other polygons out
                .transition(250)
                .attr("fill-opacity", 0.1)
                .attr("stroke-opacity", 0.1);
            d3.select(this) // focus on active polygon
                .transition(250)
                .attr("fill-opacity", 0.7)
                .attr("stroke-opacity", config.polygonStrokeOpacity);
        })
        .on('mouseout', function() {
            d3.selectAll(".polygon-areas")
                .transition(250)
                .attr("fill-opacity", config.polygonAreaOpacity)
                .attr("stroke-opacity", 1);
        });
}

// builds out the legend
function buildLegend() {
    const playerList = Array.from(currentPlayers)
    //Create legend squares
    vis.legend.selectAll(".legend-tiles")
        .data(playerList).enter()
        .append("svg:rect").classed("legend-tiles", true)
        .attr("x", config.w - config.paddingX / 2)
        .attr("y", function(d, i) { return i * 2 * config.legendBoxSize; })
        .attr("width", config.legendBoxSize)
        .attr("height", config.legendBoxSize)
        .attr("fill", function(d, g) { return config.colors(g); });

    //Create text next to squares
    vis.legend.selectAll(".legend-labels")
        .data(playerList).enter()
        .append("svg:text").classed("legend-labels", true)
        .attr("x", config.w - config.paddingX / 2 + (1.5 * config.legendBoxSize))
        .attr("y", function(d, i) { return i * 2 * config.legendBoxSize; })
        .attr("dy", 0.07 * config.legendBoxSize + "em")
        .attr("font-size", 11 * config.labelScale + "px")
        .attr("fill", d => currentDataset[d].event == 0 ? "red" : "grey")
        .text(function(d) {
            return d === "avg" ? "Class Avg." : playerMap[d];
        });
}

// show tooltip of vertices
function verticesTooltipShow(d) {
    vis.verticesTooltip.style("opacity", 0.9)
        .html("<strong>Value</strong>: " + (d.value -1) + "<br />")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");
}

// hide tooltip of vertices
function verticesTooltipHide() {
    vis.verticesTooltip.style("opacity", 0);
}

function handleAddStudentButtonClick(pk) {
    const formatSelectedPlayers = (players) => {
        return players.size > 0 ? [...players].map(p => playerMap[p]).join(', ') : "None"
    }

    if (studentsToAdd.has(pk)) {
        studentsToAdd.delete(pk)
        $(`#${pk}`).removeClass("active")
    } else if (pk === null) {
        studentsToAdd = new Set()
    } else {
        studentsToAdd.add(pk)
        $(`#${pk}`).addClass("active")
    }

    if (studentsToAdd.size > 0) {
        $("#add-student-radar").prop("disabled", false)
    } else {
        $("#add-student-radar").prop("disabled", true)
    }

    $("#selected-player-radar").text(formatSelectedPlayers(studentsToAdd))
}

export function showPuzzleRadarCharts(pMap, puzzData, levelsOfActivity) {
    playerMap = pMap
    puzzleData = puzzData
    formattedData = levelsOfActivity
    
    showPage("puzzle-radar-container", "nav-radar")

    createPuzzleDropdown()
}