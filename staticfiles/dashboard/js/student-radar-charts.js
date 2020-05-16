import { showPage, toCamelCase } from './helpers.js'
import { SANDBOX_PUZZLE_NAME } from './constants.js'
// import { output } from './output.js'

var config = null
var vis = null

var playerMap = null
var puzzleData = null

var formattedData = null

var currentDataset = {}
var currentPuzzles = new Set()
var currentStudent = null
var puzzlesToAdd = new Set()

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
function puzzleNameToClassName(puzzle) {
    return puzzle.toLowerCase().replace(/\.|( )/g, "-")
}

function addPuzzleToChart(puzzles) {
    if (currentStudent) {
        for (let puzzle of puzzles) {
            currentDataset[puzzle] = formattedData[puzzle][currentStudent] || defaultMetrics
        }
    }
    currentPuzzles = new Set([...currentPuzzles, ...puzzles])
    
    const puzzleList = Array.from(currentPuzzles)
    d3.select("#radar-puzzles").selectAll(".puzzle-button-radar")
        .data(puzzleList).enter()
        .append("button")
        .attr("id", d => `puzzle-button-radar-${puzzleNameToClassName(d)}`)
        .classed("puzzle-button-radar btn btn-light", true)
        .attr("type", "button")
        .text(d => d)
        .on("mouseover", (d) => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`)
                .classed("btn-light", false)
                .classed("btn-danger", true)
        })
        .on("mouseout", (d) => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`)
                .classed("btn-danger", false)
                .classed("btn-light", true)
        })
        .on("click", d => {
            d3.select(`#puzzle-button-radar-${puzzleNameToClassName(d)}`).remove()
            removePuzzleFromChart(d)
        })
        .append("span")
        .attr("aria-hidden", "true")
        .html("&nbsp;&times;")

    createRadarChart()
}

function removePuzzleFromChart(puzzle) {
    delete currentDataset[puzzle]
    currentPuzzles.delete(puzzle)
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
                    $("#radar-student-option-" + num + "-dropdown-container").remove()
                }

                const closeIcon = document.createElement("i")
                closeIcon.className = "fas fa-times"
                close.appendChild(closeIcon)

                document.getElementById(dropdownLabelId).appendChild(close)
            }

            if ($("#radar-student-option-list").children().length == (num - numRemoved)) {
                const nextNum = num + 1
                const dropdown = document.createElement("div")
                dropdown.className = "dropdown"
                dropdown.id = "radar-student-option-" + nextNum + "-dropdown-container"

                const link = document.createElement("a")
                link.id = "radar-student-option-" + nextNum
                link.className = "student-plus-option-button list-group-item list-group-item-action dropdown-toggle"
                link.role = "button"

                const icon = document.createElement("i")
                icon.className = "fas fa-plus plus-option"
                link.appendChild(icon)
                link.append(" Option")
                dropdown.appendChild(link)

                const menu = document.createElement("div")
                menu.id = "radar-student-option-" + nextNum + "-dropdown"
                menu.className = "dropdown-menu"
                dropdown.appendChild(menu)
                document.getElementById("radar-student-option-list").appendChild(dropdown)

                $("#radar-student-option-" + nextNum).attr("data-toggle", "dropdown")
                createOptionDropdownItems("radar-student-option-" + nextNum + "-dropdown", "radar-student-option-" + nextNum, nextNum)
            }
        }
        document.getElementById(dropdownId).appendChild(item)
    }
}

function buildChartWithNewAxes() {
    var newAxisValues = []
    var newAxisNames = []

    $(".student-plus-option-button").each(function (i, e) {
        if ($(e).text() === " Option") return
        newAxisValues.push($(e).attr("dropdown-value"))
        newAxisNames.push($(e).text())
    })

    axisValues = newAxisValues
    axisNames = newAxisNames
    createRadarChart()
}

function showPuzzleList(puzzleList) {
    for (const puzzle of puzzleList) {
        const button = document.createElement("button")
        const buttonId = puzzleNameToClassName(puzzle)

        button.id = buttonId
        button.className = "puzzle-button list-group-item list-group-item-action btn-secondary"
        button.type = "button"
        button.textContent = puzzle
        document.getElementById("add-puzzle-list").appendChild(button)
        $(`#${buttonId}`).click(function () { handleAddPuzzleButtonClick(puzzle) })
    }
}

$(document).ready(() => {
    createOptionDropdownItems("radar-student-option-1-dropdown", "radar-student-option-1", 1)
    $("#build-student-radar-button").click(buildChartWithNewAxes)

    $("#add-puzzle-button-radar").on("click", () => addPuzzleToChart(puzzlesToAdd))

    $("#add-puzzle-modal-radar").on("show.bs.modal", () => {
        const filteredPuzzleList = Object.values(puzzleData["puzzles"]).reduce((prev, curr) => {
            prev.push(...curr.filter(v => !currentPuzzles.has(v)))
            return prev
        }, [])
            
        $("#add-puzzle-list").empty()
        showPuzzleList(filteredPuzzleList)

        if (currentStudent) {
            for (let puzzle of filteredPuzzleList) {
                if (!formattedData[puzzle][currentStudent] || formattedData[puzzle][currentStudent].event == 0) {
                    const id = puzzleNameToClassName(puzzle)
                    $(`button#${id}`).removeClass("btn-secondary").addClass("btn-danger")
                    $(`button#${id}`).css("background-color", "red")
                }
            }
        }

        handleAddPuzzleButtonClick(null)
    })

    $("#add-puzzle-modal-radar").on("hidden.bs.modal", () => handleAddPuzzleButtonClick(null))
})

function onStudentClick(event, id, name) {
    $("#student-dropdown-button").text(name)
    $(".student-dropdown-option").removeClass("active")
    $(event.target).addClass("active")

    currentStudent = id
    currentDataset = {}

    for (let puzzle of currentPuzzles) {
        currentDataset[puzzle] = formattedData[puzzle][currentStudent] || defaultMetrics
    }
    createRadarChart()
}

function createStudentDropdown() {
    const dropdown = document.getElementById("student-dropdown-options")
    var firstIter = true

    for (let [id, player] of Object.entries(playerMap)) {
        if (firstIter) {
            const link = document.createElement("a")
            link.className = "student-dropdown-option dropdown-item"
            link.textContent = "Class Avg."
            link.onclick = (event) => onStudentClick(event, "avg", "Class Avg.")
            dropdown.appendChild(link)

            const divider = document.createElement("div")
            divider.className = "dropdown-divider"
            dropdown.appendChild(divider)
            firstIter = false
        } else {
            const link = document.createElement("a")
            link.className = "student-dropdown-option dropdown-item"
            link.textContent = player
            link.onclick = (event) => onStudentClick(event, id, player)
            dropdown.appendChild(link)
        }
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
    d3.select('#student-radar-chart').selectAll("svg").remove();
    updateConfig(data);

    if (config.facet) {
        data.forEach(function (d, i) {
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

        config.colors.domain(Array.from(currentPuzzles))

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
    vis.svg = d3.select('#student-radar-chart')
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
function buildLevelsLabels() {
    for (var level = 0; level < config.levels; level++) {
        var levelFactor = vis.radius * ((level + 1) / config.levels);

        // build level-labels
        vis.levels
            .data([1]).enter()
            .append("svg:text").classed("level-labels", true)
            .text(((config.maxValue * (level + 1) / config.levels) - 1).toFixed(2) + "%")
            .attr("x", function (d) { return levelFactor * (1 - Math.sin(0)); })
            .attr("y", function (d) { return levelFactor * (1 - Math.cos(0)); })
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
        .attr("x2", function (d, i) { return config.w / 2 * (1 - Math.sin(i * config.radians / vis.totalAxes)); })
        .attr("y2", function (d, i) { return config.h / 2 * (1 - Math.cos(i * config.radians / vis.totalAxes)); })
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
    Object.entries(data).forEach(function ([player, data]) {
        const axisEntries = Object.entries(data)
        function findAxis(axis) {
            var entry = ["", 0]
            if (axis) {
                entry = axisEntries.find(([metric, value]) => metric === axis) || ["", 0]
            }

            const numEvents = currentDataset[player].event

            return {
                axis: entry[0],
                value: numEvents > 0 ? (entry[1] / numEvents) * 100 + 1 : 1,
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
    Object.entries(data).forEach(function ([player, metrics], g) {
        vis.vertices
            .data(metrics.visibleAxes).enter()
            .append("svg:circle").classed("polygon-vertices", true)
            .attr("r", config.polygonPointSize)
            .attr("cx", function (d, i) { return d.coordinates.x; })
            .attr("cy", function (d, i) { return d.coordinates.y; })
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
function buildLegend() {
    const puzzleList = Array.from(currentPuzzles)
    //Create legend squares
    vis.legend.selectAll(".legend-tiles")
        .data(puzzleList).enter()
        .append("svg:rect").classed("legend-tiles", true)
        .attr("x", config.w - config.paddingX / 2)
        .attr("y", function (d, i) { return i * 2 * config.legendBoxSize; })
        .attr("width", config.legendBoxSize)
        .attr("height", config.legendBoxSize)
        .attr("fill", function (d, g) { return config.colors(g); });

    //Create text next to squares
    vis.legend.selectAll(".legend-labels")
        .data(puzzleList).enter()
        .append("svg:text").classed("legend-labels", true)
        .attr("x", config.w - config.paddingX / 2 + (1.5 * config.legendBoxSize))
        .attr("y", function (d, i) { return i * 2 * config.legendBoxSize; })
        .attr("dy", 0.07 * config.legendBoxSize + "em")
        .attr("font-size", 11 * config.labelScale + "px")
        .attr("fill", d => currentDataset[d].event == 0 ? "red" : "grey")
        .text(function (d) {
            return d
        });
}

// show tooltip of vertices
function verticesTooltipShow(d) {
    vis.verticesTooltip.style("opacity", 0.9)
        .html("<strong>Value</strong>: " + (d.value - 1) + "<br />")
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");
}

// hide tooltip of vertices
function verticesTooltipHide() {
    vis.verticesTooltip.style("opacity", 0);
}

function handleAddPuzzleButtonClick(puzzle) {
    const formatSelectedPuzzles = (puzzles) => {
        return puzzles.size > 0 ? Array.from(puzzles).join(', ') : "None"
    }

    const puzzleId = puzzle ? puzzleNameToClassName(puzzle) : ""
    if (puzzlesToAdd.has(puzzle)) {
        puzzlesToAdd.delete(puzzle)
        $(`#${puzzleId}`).removeClass("active")
    } else if (puzzle === null) {
        puzzlesToAdd = new Set()
    } else {
        puzzlesToAdd.add(puzzle)
        $(`#${puzzleId}`).addClass("active")
    }

    if (puzzlesToAdd.size > 0) {
        $("#add-puzzle-radar").prop("disabled", false)
    } else {
        $("#add-puzzle-radar").prop("disabled", true)
    }

    $("#selected-puzzle-radar").text(formatSelectedPuzzles(puzzlesToAdd))
}

export function showStudentRadarCharts(pMap, puzzData, levelsOfActivity) {
    playerMap = pMap
    puzzleData = puzzData
    formattedData = levelsOfActivity

    showPage("student-radar-container", "nav-radar")

    createStudentDropdown()
}