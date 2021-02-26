import * as portal from './portal.js'

var workspace = null
var previousLoadedFilter = null

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
}

function clearWorkspace() {
    workspace.clear()
    $("#create-filter-name").val("")
}

function createNewFilter(filterName) {
    workspace.clear()
    previousLoadedFilter = filterName
    $("#create-filter-name").val(filterName)
}

function checkWorkspaceValidity() {
    if (!workspace.allInputsFilled()) {
        alert("bad")
        return null
    }
    const code = Blockly.JavaScript.workspaceToCode(workspace)

    try {
        const parsedCode = JSON.parse(code)
        if (parsedCode instanceof Array) {
            alert("You need a header!")
            return null
        }
        const xml = Blockly.Xml.workspaceToDom(workspace)
        const xmlString = Blockly.Xml.domToText(xml)
        console.log(xmlString)
        return parsedCode
    } catch (err) {
        if (err instanceof SyntaxError) {
            alert("Incomplete filter!")
            return null
        }
    }
}

function showMetricRanges() {
    const attemptedCountList = portal.getAttemptedPuzzleRange()
    console.log(attemptedCountList)
    const rangeDict = {"# of puzzles attempted": [0, 30, attemptedCountList[0], attemptedCountList[attemptedCountList.length-1]]}
    
    const listItem = d3.select("#metric-ranges-container")
        .append("ul")
        .selectAll("li")
        .data(Object.keys(rangeDict))
        .enter()
        .append("li")
        
    listItem.append("div")
        .text(d => d)

    listItem.append("svg")
        .each(function (d) {
            d3.select(this).call(showSingleMetricRange, ...rangeDict[d])
        })
}

function showSingleMetricRange(container, min, max, val1, val2) {
    const x = d3.scaleLinear().domain([min, max]).range([0, 250])
    const lineHeight = 18
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
        .text(min)
        .attr("x", x(min))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(max)
        .text(max)
        .attr("x", x(max))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(val1)
        .text(val1)
        .attr("x", x(val1))
        .attr("y", lineHeight * 1.8)
        .attr("fill", "black")
        .attr("text-anchor", "middle")
    svg.append("text")
        .text(val2)
        .text(val2)
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
        showMetricRanges()
    }
    renderAlertBoxes()
}