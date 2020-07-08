import { METRIC_TO_METRIC_NAME, NORMALIZATION_OPTIONS } from './constants.js'

// render the visualization
export function renderRadar(config, vis) {
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
        if (config.normalize === NORMALIZATION_OPTIONS.MINMAX) {
            config.maxValue = 1
        } else if (config.normalize === NORMALIZATION_OPTIONS.STANDARD) {
            config.maxValue = 5
        } else {
            config.maxValue = Math.max(config.maxValue, d3.max(Object.values(config.data), function (v) {
                return d3.max(Object.entries(v), function ([metric, value]) {
                    if (vis.allAxis.find((av) => av === metric)) {
                        return v.event == 0 ? 1 : value
                    } else {
                        return 1
                    }
                })
            }))
        }
        
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

            if (config.normalize === NORMALIZATION_OPTIONS.MINMAX) {
                const min = config.statistics[key][result.axis].min
                const max = config.statistics[key][result.axis].max
                result.norm_value = ((result.value - min) / (max - min)) + 1 || 1
            } else if (config.normalize === NORMALIZATION_OPTIONS.STANDARD) {
                const mean = config.statistics[key][result.axis].mean
                const stdev = config.statistics[key][result.axis].stdev
                result.norm_value = ((result.value - mean) / stdev) + 1 || 1
            } else {
                result.value += 1
            }

            console.log(config.statistics, result)
            return result
        }

        data.visibleAxes = vis.allAxis.map((axisLabel, i) => {
            const axis = findAxis(axisLabel)
            return config.normalize !== NORMALIZATION_OPTIONS.NONE ? {
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
            return d === "avg" ? "Class Avg." : (config.playerMap ? config.playerMap[d] : d)
        });
}

// show tooltip of vertices
function verticesTooltipShow(config, vis, d) {
    if (config.normalize !== NORMALIZATION_OPTIONS.NONE) {
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

function verticesTooltipHide(vis) {
    vis.verticesTooltip.style("opacity", 0);
}