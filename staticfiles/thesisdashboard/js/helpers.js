export function renderList(listDivId, items, listItemRenderFunction, additionalClasses = "") {
    const listContainer = document.getElementById(listDivId)
    listContainer.className = "ui relaxed list " + additionalClasses
    listContainer.innerHTML = ""

    for (let item of items) {
        const element = listItemRenderFunction(item)
        if (!element) continue

        const itemContainer = document.createElement("div")
        itemContainer.className = "item"
        itemContainer.appendChild(element)
        listContainer.appendChild(itemContainer)
    }
}

const STAT_TO_COLOR_INTERPOLATOR = {
    'completed': d3.interpolateBlues,
    'attempted': d3.interpolateOranges,
    'completed_v_attempted': d3.interpolateGreens
} 

const STAT_TO_DOMAIN = {
    'completed': null,
    'attempted': null,
    'completed_v_attempted': [0,1]
} 

// TODO: fix attempted pattern not loading
export function renderPuzzleHeatmap(divId, allPuzzlesList, puzzleStats, puzzleOnClick, numStudents, student = null) {
    const divIdIdentifier = "#" + divId
    var margin = { top: 10, right: 10, bottom: 10, left: 10},
        width = document.getElementById(divId).clientWidth - margin.left - margin.right,
        height = document.getElementById(divId).clientHeight - margin.top - margin.bottom;

    d3.select(divIdIdentifier).selectAll("*").remove()

    // append the svg object to the body of the page
    var svg = d3.select(divIdIdentifier)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")")
    
    svg.append("defs")
        .append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
        .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', '#111111')
        .attr('stroke-width', 1);

    const numPuzzles = allPuzzlesList.length
    const numRows = 3
    const numColumns = Math.ceil(numPuzzles / 3)

    var rows = d3.range(numRows)
    var columns = d3.range(numColumns)

    var statToShow = "completed"
    const puzzleToRowValue = (puzzleIndex) => Math.floor(puzzleIndex / numColumns)
    const puzzleToColumnValue = (puzzleIndex) => puzzleIndex - puzzleToRowValue(puzzleIndex)*numColumns
    const STAT_TO_STUDENT_VALUE = {
        'completed': (puzzle, student) => puzzleStats[puzzle]["completed"].has(student) ? 1 : 0,
        'attempted': (puzzle, student) => puzzleStats[puzzle]["attempted"].has(student) ? 1 : 0,
        'completed_v_attempted': null
    }

    const STAT_TO_VALUE = {
        'completed': (puzzle) => puzzleStats[puzzle]["completed"].size,
        'attempted': (puzzle) => puzzleStats[puzzle]["attempted"].size,
        'completed_v_attempted': (puzzle) => puzzleStats[puzzle]["completed_v_attempted"]
    }

    const getValueForPuzzle = (puzzleName, stat = statToShow) => {
        if (student) {
            return STAT_TO_STUDENT_VALUE[stat](puzzleName, student)
        }

        return STAT_TO_VALUE[stat](puzzleName)
    }

    const STAT_TO_TOOLTIP = {
        'completed': (puzzleName, value) => {
            if (student) {
                return `${puzzleName}<br>${getValueForPuzzle(puzzleName, "attempted") ? "Attempted" : "Not attempted"}<br>${value ? "Completed" : "Not completed"}`
            }
            return `${puzzleName}<br>${value} students completed this (${(value * 100 / numStudents).toFixed(1)}%)`
        },
        'attempted': (puzzleName, value) => {
            if (student) {
                return `${puzzleName}<br>${value ? "Attempted" : "Not attempted"}`
            }
            return `${puzzleName}<br>${value} students attempted this (${(value * 100 / numStudents).toFixed(1)}%)`
        },
        'completed_v_attempted': (puzzleName, value) => {
            return `${puzzleName}<br>${(value * 100).toFixed(1)}% of students who attempted this were successful`
        }
    }

    // Labels of row and columns -> unique identifier of the column called 'group' and 'variable'

    // Build X scales and axis:
    var x = d3.scaleBand()
        .range([0, width])
        .domain(columns)
        .padding(0.05)

    // Build Y scales and axis:
    var y = d3.scaleBand()
        .range([0, height])
        .domain(rows)
        .padding(0.05)

    // Build color scale
    var colorScale = d3.scaleSequential()
        .interpolator(STAT_TO_COLOR_INTERPOLATOR[statToShow])
        .domain(STAT_TO_DOMAIN[statToShow] || [0, numStudents])

    // create a tooltip
    var tooltip = d3.select(divIdIdentifier)
        .append("div")
        .style("opacity", 0)
        .style("position", "absolute")
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        tooltip
            .style("opacity", 1)
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }

    var mousemove = function (d) {
        tooltip
            .html(STAT_TO_TOOLTIP[statToShow](d, getValueForPuzzle(d)))
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY- 10) + "px")
    }

    var mouseleave = function (d) {
        tooltip
            .style("opacity", 0)
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }

    // add the squares
    svg.selectAll()
        .data(allPuzzlesList)
        .enter()
        .append("rect")
        .attr("x", function (d, i) { return x(puzzleToColumnValue(i)) })
        .attr("y", function (d, i) { return y(puzzleToRowValue(i)) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) { return colorScale(getValueForPuzzle(d)) })
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
        .each(function (d, i) {
            if (student && getValueForPuzzle(d, "attempted")) {
                svg.append("rect")
                    .attr("x", x(puzzleToColumnValue(i)))
                    .attr("y", y(puzzleToRowValue(i)))
                    .attr("rx", 4)
                    .attr("ry", 4)
                    .attr("width", x.bandwidth())
                    .attr("height", y.bandwidth())
                    .style("fill", "url(#diagonalHatch)")
                    .style("opacity", 0.8)
            }
        })
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on("click", (d) => puzzleOnClick(d))
}

export const COLUMN_CLASSES = {
    "Student": "col-student",
    "% Active Time": "col-percent_active",
    "Total Time": "col-total_time",
    "Persistence Score": "col-persistence",
    "# Completed": "col-completed_count",
    "# Attempted": "col-attempted_count",
    "% Completed": "col-completed_percent",
    "% Attempted": "col-attempted_percent",
    "Total Active Time": "col-active_time",
    "Puzzle": "col-puzzle", 
    "Category": "col-puzzle_category",
    "# Students Completed": "col-completed_student_count", 
    "# Students Attempted": "col-attempted_student_count", 
    "% Students Completed": "col-completed_student_percent",
    "% Students Attempted": "col-attempted_student_percent", 
    "% Completed/Attempted": "col-completed_v_attempted_percent",
    "Median Total Time": "col-median_total_time", 
    "Median Active Time": "col-median_active_time", 
    "Difficulty (out of 100)": "col-puzzle_difficulty", 
    "Avg % Active Time": "col-avg_active_time_percent",
    "#": "col-attempt_num", 
    "Attempt Date": "col-attempt_date", 
    "Active Time": "col-atttempt_active_time", 
    "# Submissions": "col-attempt_submission_count", 
    "Completed?": "col-attempt_completed", 
    "View Replay": "col-view_replay",
    "Percentile Active Time": "col-active_time_percentile",
    "Events": "col-event_count",
    "Percentile Events": "col-event_percentile",
    "# Breaks": "col-break_count",
    "Avg. Time Btwn Submissions": "col-avg_time_btwn_sub",
    "Time from Fail to Exit": "col-time_to_exit"
}

function parseTimeToSeconds(timeString) {
    const hours = timeString.match(/(\d+)\s*h/)
    const minutes = timeString.match(/(\d+)\s*m/)
    const seconds = timeString.match(/(\d+)\s*s/)

    var time = 0
    if (hours) { 
        time += parseInt(hours[1]) * 3600
    }
    if (minutes) { 
        time += parseInt(minutes[1]) * 60
    }
    if (seconds) {
        time += parseInt(seconds[1])
    }
    return time
}

const handleTimeField = (th, td, tablesort) => parseTimeToSeconds(td.text())
const handleNumberField = (th, td, tablesort) => parseFloat(td.text())
const handleStringField = (th, td, tablesort) => td.text().toLowerCase()
const handlePercentField = (th, td, tablesort) => parseFloat(td.text().substring(0, td.text().length - 1))
const handleDateField = (th, td, tablesort) => new Date(td.text())

export const ALL_STUDENT_TABLE_COLUMNS = ["Student", "% Active Time", "Total Time", "Persistence Score", "Total Active Time", "# Attempted", "# Completed", "% Attempted", "% Completed"]

export const ALL_PUZZLE_TABLE_COLUMNS = ["Puzzle", "Category", "# Students Completed", "# Students Attempted", "% Students Completed", "% Students Attempted", "Median Total Time", "Median Active Time", "Difficulty (out of 100)", "Avg % Active Time", "% Completed/Attempted"]

export const SINGLE_STUDENT_PUZZLE_TABLE_COLUMNS = ["#", "Attempt Date", "Active Time", "# Submissions", "Completed?", "View Replay", "Percentile Active Time", "Events", "Percentile Events", "# Breaks", "Avg. Time Btwn Submissions", "Time from Fail to Exit"]

export const COLUMN_SORTBY = {
    "col-student": handleStringField,
    "col-percent_active": handleNumberField,
    "col-total_time": handleTimeField,
    "col-persistence": handleNumberField,
    "col-active_time": handleTimeField,
    "col-attempted_count": handleNumberField,
    "col-completed_count": handleNumberField,
    "col-attempted_percent": handleNumberField,
    "col-completed_percent": handleNumberField,
    "col-puzzle": handleStringField,
    "col-puzzle_category": handleStringField,
    "col-completed_student_count": handleNumberField,
    "col-attempted_student_count": handleNumberField,
    "col-completed_student_percent": handleNumberField,
    "col-attempted_student_percent": handleNumberField,
    "col-median_total_time": handleTimeField,
    "col-median_active_time": handleTimeField,
    "col-puzzle_difficulty": handleNumberField,
    "col-avg_active_time_percent": handleNumberField,
    "col-completed_v_attempted_percent": handleNumberField,
    "col-attempt_num": handleNumberField,
    "col-attempt_date": handleDateField,
    "col-atttempt_active_time": handleTimeField,
    "col-attempt_submission_count": handleNumberField,
    "col-attempt_completed": handleStringField,
    "col-view_replay": handleStringField,
    "col-active_time_percentile": handleNumberField,
    "col-event_count": handleNumberField,
    "col-event_percentile": handleNumberField,
    "col-break_count": handleNumberField,
    "col-avg_time_btwn_sub": handleTimeField,
    "col-time_to_exit": handleTimeField
}

function renderTableRow(item, columns, columnRenderFunctionMap, rowOnClick = null) {
    const row = document.createElement("tr")
    for (let column of columns) {
        const cell = document.createElement("td")
        cell.innerHTML = columnRenderFunctionMap[column](item)
        row.appendChild(cell)
    }
    if (rowOnClick) row.onclick = () => rowOnClick(item)
    return row
}

export function renderTable(tableDivId, columns, items, tableRowRenderFunctionMap, rowOnClick = null, additionalClasses = "") {
    const tableContainer = document.getElementById(tableDivId)
    tableContainer.innerHTML = '<span data-tooltip="Click on the column headers to sort the rows."><i class="question circle outline icon"></i></span>'

    const table = document.createElement("table")
    table.innerHTML = `<thead><tr>${columns.map((v, i) => `<th class="${COLUMN_CLASSES[v]}" ${i == 0 ? "sorted ascending" : ""}>${v}</th>`).join("")}</tr></thead>`
    table.className = "ui table " + additionalClasses
    tableContainer.appendChild(table)

    const tableBody = document.createElement("tbody")
    table.appendChild(tableBody)
    
    for (let item of items) {
        const element = renderTableRow(item, columns, tableRowRenderFunctionMap, rowOnClick)
        if (!element) continue

        tableBody.appendChild(element)
    }
}

export function renderRadioButtons(radioDivId, radioGroupName, items, additionalClasses = "") {}

export function renderCheckboxes(checkboxDivId, items, checkedItems, onCheckboxChange) {
    const checkboxDiv = document.getElementById(checkboxDivId)
    $(`#${checkboxDivId} > .field`).remove()

    for (let item of items) {
        const field = document.createElement("div")
        field.className = "field"
        checkboxDiv.appendChild(field)

        const checkbox = document.createElement("div")
        checkbox.className = "ui checkbox"

        const input = document.createElement("input")
        input.type = "checkbox"
        if (checkedItems.find(element => element === item)) input.checked = true
        input.onchange = (event) => onCheckboxChange(item, $(event.target).is(":checked"))
        checkbox.appendChild(input)

        const label = document.createElement("label")
        label.textContent = item
        checkbox.appendChild(label)
        field.appendChild(checkbox)
    }
}

export function renderGraphPopout(containerDivId, title, graphRenderFunction) {
    const container = document.getElementById(containerDivId)
    container.textContent = title

    const graph = document.createElement("div")
    graph.id = containerDivId + "graph"
    graph.style.height = '250px'
    graph.style.width = '400px'
    container.appendChild(graph)

    graphRenderFunction(graph.id)

    // TODO: can't see tooltip
    // const modalId = containerDivId + "modal"
    // const modal = document.createElement("div")
    // modal.id = modalId
    // modal.className = "ui modal"
    // modal.innerHTML = `<div class="header">${title}</div>`

    // const modalGraph = document.createElement("div")
    // modalGraph.id = containerDivId + "modal-graph"
    // modalGraph.style.height = '400px'
    // modalGraph.style.width = '800px'
    // modal.appendChild(modalGraph)
    // document.body.appendChild(modal)

    // container.onclick = () => $("#" + modalId).modal({ onVisible: () => graphRenderFunction(modalGraph.id) }).modal("show")
}

export function createActiveBreadcrumb(text) {
    const breadcrumb = document.createElement("div")
    breadcrumb.className = "active section"
    breadcrumb.textContent = text
    return breadcrumb
}

export function createInactiveBreadcrumb(text, clickFunction) {
    const breadcrumb = document.createElement("a")
    breadcrumb.className = "section"
    breadcrumb.textContent = text
    breadcrumb.onclick = clickFunction
    return breadcrumb
}

export function createBreadcrumbDivider() {
    const icon = document.createElement("i")
    icon.className = "right angle icon divider"
    return icon
}

export function renderStatistics(divId, statsMap) {
    const container = document.getElementById(divId)
    container.innerHTML = ''

    for (let statDesc of Object.keys(statsMap)) {
        const statistic = document.createElement("div")
        statistic.className = "statistic"

        const value = document.createElement("div")
        value.className = "value"
        value.textContent = statsMap[statDesc]
        statistic.appendChild(value)

        const label = document.createElement("div")
        label.className = "label"
        label.textContent = statDesc
        statistic.appendChild(label)
        container.appendChild(statistic)
    }
}

export function renderAlertsPanel(divId, title, items, itemTransformFunction = null, onClickFunction = null, subheader = null) {
    const container = document.getElementById(divId)
    container.textContent = title 
    // TODO: add subheader

    const listContainer = document.createElement("div")
    listContainer.id = divId + "list"
    container.appendChild(listContainer)

    var additionalClasses = "celled"
    if (onClickFunction) {
        additionalClasses += " selection"
    }

    const listRenderFunction = (item) => {
        const content = document.createElement("div")
        content.className = "content"
        content.textContent = itemTransformFunction ? itemTransformFunction(item) : item
        if (onClickFunction) content.onclick = () => onClickFunction(item)
        return content
    }

    renderList(listContainer.id, items, listRenderFunction, additionalClasses)
}