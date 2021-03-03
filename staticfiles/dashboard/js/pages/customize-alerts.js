import * as portal from './portal.js'

const lineHeight = 18

var workspace = null
var previousLoadedFilter = null
var rangeDict = {}
var typeMapping = {}
var metricVariablesToDisplay = new Set()

function handleWorkspaceVariableChange(event) {
    if (event.type == Blockly.Events.BLOCK_CREATE) {
        for (let blockId of event.ids) {
            const blockType = workspace.getBlockById(blockId).type
            if (!metricVariablesToDisplay.has(blockType) && (blockType in rangeDict)) {
                metricVariablesToDisplay.add(blockType)
                typeMapping[blockId] = blockType
            }
        }
        showMetricRanges()
        return
    }

    if (event.type == Blockly.Events.BLOCK_DELETE) {
        for (let blockId of event.ids) {
            if (!(blockId in typeMapping)) continue
            const blockType = typeMapping[blockId]
            delete typeMapping[blockId]
            if (!Object.values(typeMapping).includes(blockType) && metricVariablesToDisplay.has(blockType)) {
                metricVariablesToDisplay.delete(blockType)
            }
        }
        showMetricRanges()
        return
    }
}

function initializeBlocklyWorkspace() {
    workspace = Blockly.inject('blockly-container', {
        toolbox: document.getElementById('toolbox'),
        grid: {
            spacing: 20,
            length: 20,
            colour: '#ccc',
            snap: true
        },
        theme: {
            'startHats': true
        },
        renderer: 'thrasos'
    })
    workspace.addChangeListener(handleWorkspaceVariableChange)
}

// TODO: fix layout
// TODO: change persistence code
function clearWorkspace() {
    workspace.clear()
    previousLoadedFilter = null
    $("#create-filter-name").val("")
}

function createNewFilter(filterName) {
    workspace.clear()
    previousLoadedFilter = filterName
    $("#create-filter-name").val(filterName)
}

function checkWorkspaceValidity() {
    if (!workspace.allInputsFilled()) {
        alert("Please fill all inputs and ensure that all blocks in the workspace are being used.")
        return null
    }
    const code = Blockly.JavaScript.workspaceToCode(workspace)

    try {
        const parsedCode = JSON.parse(code)
        if (parsedCode instanceof Array) {
            alert("You need a filter header! Please select a header from the 'Filter Types' category.")
            return null
        }
        const xml = Blockly.Xml.workspaceToDom(workspace)
        const xmlString = Blockly.Xml.domToText(xml)
        console.log(xmlString)
        return parsedCode
    } catch (err) {
        if (err instanceof SyntaxError) {
            alert("Incomplete filter! Please check your filter for incomplete fields.")
            return null
        }
    }
}

function showMetricRanges() {
    document.getElementById("metric-ranges-container").innerHTML = ''

    const listItem = d3.select("#metric-ranges-container")
        .append("ul")
        .selectAll("li")
        .data(Array.from(metricVariablesToDisplay))
        .enter()
        .append("li")
        
    listItem.append("div")
        .text(d => rangeDict[d].label)

    listItem.append("svg")
        .attr("height", lineHeight * 2.1)
        .each(function (d) {
            d3.select(this).call(showSingleMetricRange, ...rangeDict[d].values)
        })
}

function showSingleMetricRange(container, min, max, val1, val2) {
    const x = d3.scaleLinear().domain([min, max]).range([0, 275])
    
    const halfLineHeight = lineHeight / 2

    const svg = container
        .append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", "11px")
        .attr("transform", "translate(7,0)")

    svg.append("rect")
        .attr("x", x(val1))
        .attr("y", 0)
        .attr("height", lineHeight)
        .attr("width", x(val2) - x(val1))
        .style("fill-opacity", 0.7)
        .style("fill", "grey")
    svg.append("line")
        .attr("x1", x(min))
        .attr("y1", halfLineHeight)
        .attr("x2", x(max))
        .attr("y2", halfLineHeight)
        .style("stroke", "black")
        .style("stroke-width", 1.5)
    svg.append("line")
        .attr("x1", x(min))
        .attr("y1", 0)
        .attr("x2", x(min))
        .attr("y2", lineHeight)
        .style("stroke", "black")
        .style("stroke-width", 1.5)
    svg.append("line")
        .attr("x1", x(max))
        .attr("y1", 0)
        .attr("x2", x(max))
        .attr("y2", lineHeight)
        .style("stroke", "black")
        .style("stroke-width", 1.5)
    svg.append("line")
        .attr("x1", x(val1))
        .attr("y1", 0)
        .attr("x2", x(val1))
        .attr("y2", lineHeight)
        .style("stroke", "lightgrey")
        .style("stroke-width", 2)
    svg.append("line")
        .attr("x1", x(val2))
        .attr("y1", 0)
        .attr("x2", x(val2))
        .attr("y2", lineHeight)
        .style("stroke", "lightgrey")
        .style("stroke-width", 2)
    svg.append("text")
        .text(min.toFixed(0))
        .attr("x", x(min))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(max.toFixed(0))
        .attr("x", x(max))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(val1.toFixed(0))
        .attr("x", x(val1))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(val2.toFixed(0))
        .attr("x", x(val2))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
}


function loadFilterToWorkspace(filterName) {
    previousLoadedFilter = filterName
    clearWorkspace()
    const xmlString = window.localStorage.getItem(filterName)
    const xml = Blockly.Xml.textToDom(xmlString)
    Blockly.Xml.domToWorkspace(xml, workspace)
    $("#create-filter-name").val(filterName)
}

function renameFilter(filterName, newFilterName) {
    const filterData = window.localStorage.getItem(filterName)
    window.localStorage.removeItem(filterName)
    window.localStorage.setItem(newFilterName, filterData)
    portal.setFilter(newFilterName, portal.getFilter(filterName))
    portal.removeFilter(filterName)
}

function saveFilter(filterName) {
    if (previousLoadedFilter && filterName !== previousLoadedFilter) {
        renameFilter(previousLoadedFilter, filterName)
    }

    const filter = checkWorkspaceValidity()
    if (!filter) return

    const xml = Blockly.Xml.workspaceToDom(workspace)
    const xmlString = Blockly.Xml.domToText(xml)
    window.localStorage.setItem(filterName, xmlString)

    portal.setFilter(filterName, filter)
    renderAlertBoxes()
    updateAlerts()
    clearWorkspace()
}

function deleteFilter(filterName) {
    clearWorkspace()
    window.localStorage.removeItem(filterName)
    portal.removeFilter(filterName)
    renderAlertBoxes()
    updateAlerts()
}

function renderAlertBoxes() {
    const alertList = document.getElementById("customize-alerts-list")
    alertList.innerHTML = ""

    const alerts = portal.getFilterKeys()
    for (let alert of alerts) {
        const alertBox = document.createElement("div")
        alertBox.className = "customize-alert-box"
        alertBox.style.borderColor = portal.getColorForFilter(alert)
        alertList.appendChild(alertBox)

        const alertBoxOptions = document.createElement("div")
        alertBoxOptions.className = "customize-alert-box-options"
        alertBox.appendChild(alertBoxOptions)

        const editLink = document.createElement("a")
        editLink.textContent = "Edit"
        editLink.className = "customize-alert-edit-link"
        editLink.onclick = function() {
            loadFilterToWorkspace(alert)
        }
        alertBoxOptions.appendChild(editLink)

        const deleteButton = document.createElement("button")
        deleteButton.className = "close"
        deleteButton.type = "button"
        deleteButton.innerHTML = '<span aria-hidden="true">&times;</span>'
        deleteButton.onclick = function() {
            deleteFilter(alert)
        }
        alertBoxOptions.appendChild(deleteButton)

        const alertBoxLabel = document.createElement("span")
        alertBoxLabel.style.fontStyle = "italic"
        alertBoxLabel.textContent = `"${alert}"`
        alertBox.appendChild(alertBoxLabel)
    }
}

function updateAlerts() {
    portal.renderAlertsDisplay()
}

function initializeRangeDictionary() {
    const entries = [
        {
            key: "attempted_puzzles",
            label: "# of puzzles attempted",
            limits: [0, 30],
            range: portal.getFilterObject().getAttemptedPuzzleRange()
        }, 
        {
            key: "completed_puzzles",
            label: "# of puzzles completed",
            limits: [0, 30],
            range: portal.getFilterObject().getCompletedPuzzleRange()
        },
        {
            key: "persistence",
            label: "persistence score",
            limits: [0, 100],
            range: portal.getFilterObject().getPersistenceRange()
        },
        {
            key: "attempts_per_puzzle",
            label: "median # of attempts per puzzle",
            limits: [0, null],
            range: portal.getFilterObject().getAttemptsPerPuzzleRange()
        },
        {
            key: "mins_played",
            label: "active time spent (mins)",
            limits: [0, null],
            range: portal.getFilterObject().getActiveTimeRange()
        },
        {
            key: "total_time",
            label: "total time spent (mins)",
            limits: [0, null],
            range: portal.getFilterObject().getTotalTimeRange()
        },
        {
            key: "snapshots",
            label: "# of snapshots",
            limits: [0, null],
            range: portal.getFilterObject().getSnapshotRange()
        },
        {
            key: "rotate",
            label: "# of rotations",
            limits: [0, null],
            range: portal.getFilterObject().getRotateRange()
        },
        {
            key: "percent_incomplete",
            label: "% of puzzles incomplete",
            limits: [0, 100],
            range: portal.getFilterObject().getPercentIncompleteRange()
        },
        {
            key: "percent_incorrect",
            label: "% of puzzles incorrect",
            limits: [0, 100],
            range: portal.getFilterObject().getPercentIncorrectRange()
        }
    ]

    for (let entry of entries) {
        rangeDict[entry.key] = {
            label: entry.label,
            values: [entry.limits[0], entry.limits[1] || entry.range[1], entry.range[0], entry.range[1]]
        }
    }
}

export function showCustomizeTab() {
    if (!workspace) {
        initializeBlocklyWorkspace()

        $("#create-filter-btn").click(function() {
            if (!$("#create-filter-name").val()) {
                alert("Please input filter name!")
                return
            }
            createNewFilter($("#create-filter-name").val())
        })

        $("#save-edits-btn").click(function() {
            saveFilter($("#create-filter-name").val())
        })
        
        initializeRangeDictionary()
    }
    renderAlertBoxes()
}