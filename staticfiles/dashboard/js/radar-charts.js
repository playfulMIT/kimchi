import { showPage, showPlayerList, toCamelCase } from './helpers.js'
import { SANDBOX_PUZZLE_NAME } from './constants.js'

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
    {
        axis: "Option",
        value: null
    },
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

const axisValues = Array(6).fill(dropdownMembers[0].value)

// TODO: optimize render 

function addStudentToChart(ids) {
    if (currentPuzzle) {
        for (let id of ids) {
            currentDataset[id] = formattedData[currentPuzzle][id] || defaultMetrics
        }
    }
    currentPlayers = new Set([...currentPlayers, ...ids])
    createRadarChart()
}

function removeStudentFromChart(id) {
    delete currentDataset[id]
    currentPlayers.delete(id)
    createRadarChart()
}

$(document).ready(() => {
    $("#add-student-button-radar").on("click", () => addStudentToChart(studentsToAdd))

    $("#add-student-modal-radar").on("show.bs.modal", () => {
        const filteredPlayerMap = Object.assign(...Object.keys(playerMap)
            .filter(key => !currentPlayers.has(key))
            .map(key => ({ [key]: playerMap[key] })))

        $("#add-player-list").empty()
        showPlayerList("add-player-list", filteredPlayerMap, (event) => handleAddStudentButtonClick(event.target.id))
        
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
    d3.select('#radar-chart').selectAll("svg").remove();
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
                if (axisValues.find((v) => v === metric)) {
                    return value
                } else {
                    return 1
                }
            })
        }))
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
    vis.svg = d3.select('#radar-chart')
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
            .text((config.maxValue * (level + 1) / config.levels).toFixed(2))
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
    const options = {
        width: 100,
        members: dropdownMembers,
        fontSize: 11 * config.labelScale,
        color: "#333",
        fontFamily: "Calibri,Candara,Segoe,Segoe UI,Optima,Arial,sans-serif",
        changeHandler: function () { }
    };

    options.optionHeight = options.fontSize * 2;
    options.height = options.fontSize + 8;
    options.padding = 5;
    options.hoverColor = "#0c56f5";
    options.hoverTextColor = "#fff";
    options.bgColor = "#fff";
    options.width = options.width - 2;

    const g = vis.axes
        .data(vis.allAxis).enter()
        .append("svg")
        .attr("x", (d, i) => (config.w / 2 * (1 - 1.3 * Math.sin(i * config.radians / vis.totalAxes)) - options.width / 4))
        .attr("y", (d, i) => (config.h / 2 * (1 - 1.1 * Math.cos(i * config.radians / vis.totalAxes)) - options.height))
        .attr("shape-rendering", "crispEdges")
        .append("g")
        .attr("transform", "translate(1,1)")
        .attr("font-family", options.fontFamily)
        .each(function (d, i) {
            const vertexId = `select-field${i}`
            /** Rendering Select Field */
            const selectField = d3.select(this).append("g")
            var selectedOption = options.members.find((v) => v.value === axisValues[i])

            // background
            selectField
                .append("g")
                // .append("rect")
                // .attr("width", options.width)
                // .attr("height", options.height)
                .attr("id", vertexId)
                .attr("class", "option select-field")
                // .attr("fill", options.bgColor)
                // .style("stroke", "#a0a0a0")
                // .style("stroke-width", "1")

            const plusText = selectField
                .append("text")
                .text("+")
                .attr("x", 0)
                .attr("y", options.height / 2 + (options.fontSize - 2) / 3)
                .attr("font-size", options.fontSize - 2)
                .attr("fill", options.color);

            if (selectedOption.value) {
                plusText.attr("display", "none")
            }

            // text
            const activeText = selectField
                .append("text")
                .text(selectedOption.axis)
                .attr("x", options.padding * 2)
                .attr("y", options.height / 2 + options.fontSize / 3)
                .attr("font-size", options.fontSize)
                .attr("fill", options.color)

            // transparent surface to capture actions
            selectField
                .append("rect")
                .attr("width", options.width)
                .attr("height", options.height)
                .style("fill", "transparent")
                .on("click", handleSelectClick)

            /** rendering options */
            const optionGroup = d3.select(this)
                .append("g")
                .attr("transform", `translate(0, ${options.height})`)
                .attr("opacity", 0); //.attr("display", "none"); Issue in IE/Firefox: Unable to calculate textLength when display is none.

            // Rendering options group
            const optionEnter = optionGroup
                .selectAll("g")
                .data(options.members)
                .enter()
                .append("g")
                .on("click", (d) => handleOptionClick(d, i));

            // Rendering background
            optionEnter
                .append("rect")
                .attr("width", options.width)
                .attr("height", options.optionHeight)
                .attr("y", function (d, i) {
                    return i * options.optionHeight;
                })
                .attr("class", "option")
                .style("stroke", options.hoverColor)
                .style("stroke-dasharray", (d, i) => {
                    let stroke = [
                        0,
                        options.width,
                        options.optionHeight,
                        options.width,
                        options.optionHeight
                    ];
                    if (i === 0) {
                        stroke = [
                            options.width + options.optionHeight,
                            options.width,
                            options.optionHeight
                        ];
                    } else if (i === options.members.length - 1) {
                        stroke = [0, options.width, options.optionHeight * 2 + options.width];
                    }
                    return stroke.join(" ");
                })
                .style("stroke-width", 1)
                .style("fill", options.bgColor);

            // Rendering option text
            optionEnter
                .append("text")
                .attr("x", options.padding)
                .attr("y", function (d, i) {
                    return (
                        i * options.optionHeight +
                        options.optionHeight / 2 +
                        options.fontSize / 3
                    );
                })
                .text(function (d) {
                    return d.axis;
                })
                .attr("font-size", options.fontSize)
                .attr("fill", options.color)
                .each(wrap);

            // Rendering option surface to take care of events
            optionEnter
                .append("rect")
                .attr("width", options.width)
                .attr("height", options.optionHeight)
                .attr("y", function (d, i) {
                    return i * options.optionHeight;
                })
                .style("fill", "transparent")
                .on("mouseover", handleMouseOver)
                .on("mouseout", handleMouseOut);

            //once the textLength gets calculated, change opacity to 1 and display to none
            optionGroup.attr("display", "none").attr("opacity", 1);

            d3.select("body").on("click", function () {
                optionGroup.attr("display", "none");
            });

            function handleMouseOver() {
                d3.select(d3.event.target.parentNode)
                    .select(".option")
                    .style("fill", options.hoverColor);

                d3.select(d3.event.target.parentNode)
                    .select("text")
                    .style("fill", options.hoverTextColor);
            }

            function handleMouseOut() {
                d3.select(d3.event.target.parentNode)
                    .select(".option")
                    .style("fill", options.bgColor);

                d3.select(d3.event.target.parentNode)
                    .select("text")
                    .style("fill", options.color);
            }

            function handleOptionClick(d, i) {
                d3.event.stopPropagation();
                selectedOption = d;
                activeText.text(selectedOption.axis).each(wrap);
                typeof options.changeHandler === 'function' && options.changeHandler.call(this, d);
                optionGroup.attr("display", "none");

                if (d.value) {
                    plusText.attr("display", "none")
                } else {
                    plusText.attr("display", "block")
                }

                if (axisValues[i] !== d.value) {
                    axisValues[i] = d.value
                    createRadarChart()
                }
            }

            function handleSelectClick() {
                d3.event.stopPropagation();
                const visibility = optionGroup.attr("display") === "block" ? "none" : "block";
                optionGroup.attr("display", visibility);
            }
        })

    // Utility Methods
    // wraps words
    function wrap() {
        const width = options.width;
        const padding = options.padding;
        const self = d3.select(this);
        let textLength = self.node().getComputedTextLength();
        let text = self.text();
        const textArr = text.split(/\s+/);
        let lastWord = "";
        while (textLength > width - 2 * padding && text.length > 0) {
            lastWord = textArr.pop();
            text = textArr.join(" ");
            self.text(text);
            textLength = self.node().getComputedTextLength();
        }
        self.text(text + " " + lastWord);

        // providing ellipsis to last word in the text
        if (lastWord) {
            textLength = self.node().getComputedTextLength();
            text = self.text();
            while (textLength > width - 2 * padding && text.length > 0) {
                text = text.slice(0, -1);
                self.text(text + "...");
                textLength = self.node().getComputedTextLength();
            }
        }
    }
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

            return {
                axis: entry[0],
                value: entry[1]
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
        .attr("fill", "gray")
        .text(function(d) {
            return playerMap[d];
        });

    d3.select("#radar-players").selectAll(".player-button-radar")
        .data(playerList).enter()
        .append("button")
        .attr("id", d => d)
        .classed("player-button-radar btn btn-light", true)
        .attr("type", "button")
        .text(d => playerMap[d])
        .on("mouseover", (d) => {
            d3.select(`#${d}.player-button-radar`)
                .classed("btn-light", false)
                .classed("btn-danger", true)
        })
        .on("mouseout", (d) => {
            d3.select(`#${d}.player-button-radar`)
                .classed("btn-danger", false)
                .classed("btn-light", true)
        })
        .on("click", d => {
            d3.select(`#${d}.player-button-radar`).remove()
            removeStudentFromChart(d)
        })
        .append("span")
        .attr("aria-hidden", "true")
        .html("&nbsp;&times;")

}

// show tooltip of vertices
function verticesTooltipShow(d) {
    vis.verticesTooltip.style("opacity", 0.9)
        .html("<strong>Value</strong>: " + d.value + "<br />")
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

export function showRadarCharts(pMap, puzzData, loa) {
    playerMap = pMap
    puzzleData = puzzData
    formattedData = loa
    
    showPage("radar-container", "nav-radar")

    createPuzzleDropdown()
    createRadarChart()
}