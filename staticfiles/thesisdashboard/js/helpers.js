export const PUZZLE_IMAGE_PATHS = {
    "1. One Box": "../../static/thesisdashboard/images/one-box.png",
    "2. Separated Boxes": "../../static/thesisdashboard/images/separated-boxes.png",
    "3. Rotate a Pyramid": "../../static/thesisdashboard/images/rotate-pyramid.png",
    "4. Match Silhouettes": "../../static/thesisdashboard/images/match-silhouettes.png",
    "5. Removing Objects": "../../static/thesisdashboard/images/removing-objects.png",
    "6. Stretch a Ramp": "../../static/thesisdashboard/images/stretch-ramp.png",
    "7. Max 2 Boxes": "../../static/thesisdashboard/images/max-boxes.png",
    "8. Combining 2 Ramps": "../../static/thesisdashboard/images/combine-ramps.png",
    "9. Scaling Round Objects": "../../static/thesisdashboard/images/scaling-round-objects.png",
    "Square Cross-Sections": "../../static/thesisdashboard/images/square-cross-sections.png",
    "Bird Fez": "../../static/thesisdashboard/images/bird-fez.png",
    "Pi Henge": "../../static/thesisdashboard/images/pi-henge.png",
    "45-Degree Rotations": "../../static/thesisdashboard/images/degree-rotations.png",
    "Pyramids are Strange": "../../static/thesisdashboard/images/pyramids-strange.png",
    "Boxes Obscure Spheres": "../../static/thesisdashboard/images/boxes-obscure-spheres.png",
    "Object Limits": "../../static/thesisdashboard/images/object-limits.png",
    "Warm Up": "../../static/thesisdashboard/images/tetromino-warmup.png",
    "Tetromino": "../../static/thesisdashboard/images/tetromino-warmup.png",
    "Angled Silhouette": "../../static/thesisdashboard/images/angled-silhouette.png",
    "Sugar Cones": "../../static/thesisdashboard/images/sugar-cones.png",
    "Stranger Shapes": "../../static/thesisdashboard/images/stranger-shapes.png",
    "Tall and Small": "../../static/thesisdashboard/images/tall-small.png",
    "Ramp It and Can It": "../../static/thesisdashboard/images/ramp-it.png",
    "More Than Meets Your Eye": "../../static/thesisdashboard/images/more-meets-eye.png",
    "Not Bird": "../../static/thesisdashboard/images/not-bird.png",
    "Unnecessary": "../../static/thesisdashboard/images/unnecessary.png",
    "Zzz": "../../static/thesisdashboard/images/zzz.png",
    "Bull Market": "../../static/thesisdashboard/images/bull-market.png",
    "Few Clues": "../../static/thesisdashboard/images/few-clues.png",
    "Orange Dance": "../../static/thesisdashboard/images/orange-dance.png",
    "Bear Market": "../../static/thesisdashboard/images/bear-market.png",
}

export const PUZZLE_TO_KEY = {
    "1. One Box": 345,
    "2. Separated Boxes": 346,
    "3. Rotate a Pyramid": 347,
    "4. Match Silhouettes": 348,
    "5. Removing Objects": 349,
    "6. Stretch a Ramp": 350,
    "7. Max 2 Boxes": 351,
    "8. Combining 2 Ramps": 352,
    "9. Scaling Round Objects": 353,
    "Square Cross-Sections": 287,
    "Bird Fez": 294,
    "Pi Henge": 297,
    "45-Degree Rotations": 299,
    "Pyramids are Strange": 300,
    "Boxes Obscure Spheres": 301,
    "Object Limits": 302,
    "Warm Up": 293,
    "Tetromino": 293,
    "Angled Silhouette": 304,
    "Sugar Cones": 308,
    "Stranger Shapes": 298,
    "Tall and Small": 305,
    "Ramp It and Can It": 292,
    "More Than Meets Your Eye": 306,
    "Not Bird": 303,
    "Unnecessary": 309,
    "Zzz": 310,
    "Bull Market": 311,
    "Few Clues": 312,
    "Orange Dance":  313,
    "Bear Market": 314
}

export function renderList(listDivId, items, listItemRenderFunction, additionalClasses = "", iconType = null, iconTypeFunction = null, iconTooltipFunction = null, clickable = false) {
    const listContainer = document.getElementById(listDivId)
    listContainer.className = "ui relaxed list " + additionalClasses
    listContainer.innerHTML = ""

    for (let item of items) {
        const element = listItemRenderFunction(item)
        if (!element) continue

        const itemContainer = document.createElement("div")
        itemContainer.className = "item list-item"
        if (clickable) {
            itemContainer.onclick = () => {
                $(".list-item").removeClass("active")
                itemContainer.className += " active"
            }
        }
        
        if (iconType) {
            switch (iconType) {
                case "alert":
                    itemContainer.innerHTML = '<i class="large yellow exclamation circle middle aligned icon"></i>'
                    break
                case "filter-type":
                    itemContainer.innerHTML = `<span ${iconTooltipFunction ? `data-tooltip="${iconTooltipFunction(item)}"` : ""}"><i class="large ${iconTypeFunction(item)} middle aligned icon"></i><span>`
                    break
            }
        }
        itemContainer.appendChild(element)
        listContainer.appendChild(itemContainer)
    }
}

export const CONCEPTS = {
    'GMD.4': {},
    'CO.5': {},
    'CO.6': {},
    'MG.1': {}
}

const PUZZLE_BEST_CONCEPT_MAPPING = {
    'Bird Fez': 'MG.1',
    'Pi Henge': 'MG.1',
    'Bull Market': 'MG.1',
    'Angled Silhouettes': 'GMD.4',
    'Not Bird': 'GMD.4',
    'Stranger Shapes': 'GMD.4',
    'Ramp Up and Can It': 'GMD.4',
    'Few Clues': 'GMD.4',
    '45-Degree Rotations': 'CO.5',
    'Boxes Obscure Spheres': 'CO.5',
    'More Than Meets the Eye': 'CO.5',
    'Tall and Small': 'CO.6',
    'Not Bird': 'CO.6',
    'Ramp Up and Can It': 'CO.6',
    'Stretch a Ramp': 'CO.6',
    'Max 2 Boxes': 'CO.6'
}

export const PUZZLE_TO_MAIN_CONCEPTS_TESTED = (puzzle) => puzzle in PUZZLE_BEST_CONCEPT_MAPPING ? PUZZLE_BEST_CONCEPT_MAPPING[puzzle] : "N/A"

export const DEFAULT_FILTERS = {
    "Low participation": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"alert\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"30\" y=\"10\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\")\/vhDb*.Nl58v?Cj,H%E\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">25<\/field><value name=\"variable\"><block type=\"percentile\" id=\"}gfO$=_tIKr%^f-AwwI3\"><value name=\"variable\"><block type=\"mins_played\" id=\"r0G{+CNl#jco*UTza9Ss\"><\/block><\/value><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"9%?JNA7*iGW\/MRKZ_4xm\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">50<\/field><value name=\"variable\"><block type=\"percentile\" id=\"-t5ijNJ8v1gqV|`8q}3I\"><value name=\"variable\"><block type=\"completed_puzzles\" id=\"`8H!ec)VU?FEfhD`;k$I\"><\/block><\/value><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>",
    "High participation": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"filter\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"-50\" y=\"-30\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\")\/vhDb*.Nl58v?Cj,H%E\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">75<\/field><value name=\"variable\"><block type=\"percentile\" id=\"}gfO$=_tIKr%^f-AwwI3\"><value name=\"variable\"><block type=\"mins_played\" id=\"r0G{+CNl#jco*UTza9Ss\"><\/block><\/value><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"9%?JNA7*iGW\/MRKZ_4xm\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">50<\/field><value name=\"variable\"><block type=\"percentile\" id=\"-t5ijNJ8v1gqV|`8q}3I\"><value name=\"variable\"><block type=\"completed_puzzles\" id=\"`8H!ec)VU?FEfhD`;k$I\"><\/block><\/value><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>",
    "Little puzzle progress after 30mins": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"alert\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"-10\" y=\"-30\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\"?;Q6+h(1VK,r!,.O4imx\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">5<\/field><value name=\"variable\"><block type=\"completed_puzzles\" id=\",:;-r6$D,vlhFAc*U`|e\"><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"XBw7wo#ROt4Md@L]=MIm\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">30<\/field><value name=\"variable\"><block type=\"mins_played\" id=\"HW@n11B9z-O:^H`6n9|4\"><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>",
    "Low persistence and little puzzle progress": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"alert\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"-10\" y=\"-30\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\"?;Q6+h(1VK,r!,.O4imx\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">25<\/field><value name=\"variable\"><block type=\"percentile\" id=\"Yj@(cx:2^bu(fO?iEv[L\"><value name=\"variable\"><block type=\"completed_puzzles\" id=\",:;-r6$D,vlhFAc*U`|e\"><\/block><\/value><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"XBw7wo#ROt4Md@L]=MIm\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">25<\/field><value name=\"variable\"><block type=\"percentile\" id=\"f9W*fncRbFPs5ms07%[E\"><value name=\"variable\"><block type=\"persistence\" id=\"esQbmGeA]Z|+IoJ,sGT@\"><\/block><\/value><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>",
    "Low persistence and substantial puzzle progress": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"alert\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"-10\" y=\"-30\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\"?;Q6+h(1VK,r!,.O4imx\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">75<\/field><value name=\"variable\"><block type=\"percentile\" id=\"Yj@(cx:2^bu(fO?iEv[L\"><value name=\"variable\"><block type=\"completed_puzzles\" id=\",:;-r6$D,vlhFAc*U`|e\"><\/block><\/value><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"XBw7wo#ROt4Md@L]=MIm\"><field name=\"operator\">&lt;<\/field><field name=\"comp_val\">25<\/field><value name=\"variable\"><block type=\"percentile\" id=\"f9W*fncRbFPs5ms07%[E\"><value name=\"variable\"><block type=\"persistence\" id=\"esQbmGeA]Z|+IoJ,sGT@\"><\/block><\/value><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>",
    "High persistence and substantial puzzle progress": "<xml xmlns=\"https:\/\/developers.google.com\/blockly\/xml\"><block type=\"filter\" id=\"wCp^O~:q6HGY=KOLa|YL\" x=\"-10\" y=\"-30\"><statement name=\"conditions\"><block type=\"and_condition\" id=\"tkMLsiPZ#M[OQH-;IuI1\"><statement name=\"condition1\"><block type=\"condition\" id=\"?;Q6+h(1VK,r!,.O4imx\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">75<\/field><value name=\"variable\"><block type=\"percentile\" id=\"Yj@(cx:2^bu(fO?iEv[L\"><value name=\"variable\"><block type=\"completed_puzzles\" id=\",:;-r6$D,vlhFAc*U`|e\"><\/block><\/value><\/block><\/value><\/block><\/statement><statement name=\"condition2\"><block type=\"condition\" id=\"XBw7wo#ROt4Md@L]=MIm\"><field name=\"operator\">&gt;<\/field><field name=\"comp_val\">25<\/field><value name=\"variable\"><block type=\"percentile\" id=\"f9W*fncRbFPs5ms07%[E\"><value name=\"variable\"><block type=\"persistence\" id=\"esQbmGeA]Z|+IoJ,sGT@\"><\/block><\/value><\/block><\/value><\/block><\/statement><\/block><\/statement><\/block><\/xml>"
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

const RADIO_TO_STAT = {
    '# students completed': 'completed',
    '# students attempted': 'attempted',
    '% completed/attemped': 'completed_v_attempted' 
}

export function renderMockMisconceptionsGraph(divId) {
    const data = [
        {
            name: "None",
            value: 40,
            tooltip: "No misconception shown"
        },
        {
            name: "s7a",
            value: 20,
            tooltip: "An incorrect solution with the shapes <1 pyramid, 1 ramp, 1 sphere>"
        },
        {
            name: "s8b",
            value: 35,
            tooltip: "An incorrect solution with the shapes <1 pyramid, 1 ramp, 1 cone>"
        }
    ]

    const divIdIdentifier = "#" + divId
    var margin = { top: 10, right: 10, bottom: 20, left: 60 },
        width = document.getElementById(divId).clientWidth - margin.left - margin.right,
        height = document.getElementById(divId).clientHeight - margin.top - margin.bottom;

    d3.select(divIdIdentifier).selectAll("*").remove()

    const svg = d3.select(divIdIdentifier)
        .append('svg')
        .attr('class', 'chart-svg')
        .attr('width', width)
        .attr('height', height);

    const tooltip = d3.select("#root")
        .append("div")
        .style("opacity", 0)
        .style("position", "absolute")
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("display", "none")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        tooltip
            .style("display", "block")
            .style("opacity", 1)
            .style("pointer-events", "auto")
        d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1)
    }

    var mousemove = function (d) {
        tooltip
            .html(d.data.tooltip + "<br>" + d.data.value + "%")
            .style("left", (d3.event.pageX + 15) + "px")
            .style("top", (d3.event.pageY - 10) + "px")
    }

    var mouseout = function (d) {
        tooltip
            .style("opacity", 0)
            .style("display", "none")
            .style("pointer-events", "none")
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }

    const color = d3.scaleOrdinal(d3.schemeCategory10)

    const r = Math.min(width, height) / 2
    const arc = d3.arc().innerRadius(r * 0.67).outerRadius(r - 1)

    const pie = d3.pie().padAngle(0.005).value(d => d.value)

    const g = svg.append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`)

    g.selectAll('.chart-arc')
        .data(pie(data))
        .enter()
        .append('path')
        .attr('class', 'chart-arc')
        .attr('d', arc)
        .style('fill', d => color(d.data.name))
        .on('mouseover', d => mouseover(d))
        .on('mousemove', d => mousemove(d))
        .on('mouseout', d => mouseout(d))
        .append("title")
        .text(d => `${d.data.name}`)
}

export function renderMockCompetencyGraph(divId) {
    const divIdIdentifier = "#" + divId
    var margin = { top: 10, right: 10, bottom: 20, left: 60 },
        width = document.getElementById(divId).clientWidth - margin.left - margin.right,
        height = document.getElementById(divId).clientHeight - margin.top - margin.bottom;

    // set the ranges
    var y = d3.scaleBand()
        .range([height, 0])
        .padding(0.1);

    var x = d3.scaleLinear()
        .range([0, width]);

    d3.select(divIdIdentifier).selectAll("*").remove()

    var svg = d3.select(divIdIdentifier)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    const data = [
        {
            name: 'GMD.4',
            value: Math.random()
        },
        {
            name: 'CO.5',
            value: Math.random()
        },
        {
            name: 'CO.6',
            value: Math.random()
        },
        {
            name: 'MG.1',
            value: Math.random()
        }
    ]

    console.log(data)

    // Scale the range of the data in the domains
    x.domain([0, 1])
    y.domain(data.map(function (d) { return d.name }))
    //y.domain([0, d3.max(data, function(d) { return d.sales; })]);

    // append the rectangles for the bar chart
    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(0) })
        .attr("width", function (d) { return x(d.value) })
        .attr("y", function (d) { return y(d.name) })
        .attr("height", y.bandwidth())
        .attr("fill", "#69b3a2")

    // add the x Axis
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))

    // add the y Axis
    svg.append("g")
        .call(d3.axisLeft(y))
}

export function renderPuzzleHeatmap(divId, allPuzzlesList, puzzleStats, puzzleOnClick, numStudents, student = null) {
    const divIdIdentifier = "#" + divId
    var margin = { top: 10, right: 10, bottom: 10, left: 10},
        width = document.getElementById(divId).clientWidth - margin.left - margin.right,
        height = document.getElementById(divId).clientHeight - margin.top - margin.bottom;

    d3.select(divIdIdentifier).selectAll("*").remove()

    const radioContainer = document.createElement("div")
    radioContainer.id = divId + "radio"
    document.getElementById(divId).appendChild(radioContainer)

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
    var tooltip = d3.select("#root")
        .append("div")
        .style("opacity", 0)
        .style("position", "absolute")
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("display", "none")

    // Three function that change the tooltip when user hover / move / leave a cell
    var mouseover = function (d) {
        tooltip
            .style("display", "block")
            .style("opacity", 1)
            .style("pointer-events", "auto")
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
            .style("display", "none")
            .style("pointer-events", "none")
        d3.select(this)
            .style("stroke", "none")
            .style("opacity", 0.8)
    }

    // add the squares
    svg.selectAll(".puzzle-rect")
        .data(allPuzzlesList)
        .enter()
        .append("rect")
        .attr("class", "puzzle-rect")
        .attr("x", function (d, i) { return x(puzzleToColumnValue(i)) })
        .attr("y", function (d, i) { return y(puzzleToRowValue(i)) })
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", function (d) { 
            if (student && getValueForPuzzle(d, "attempted") && !getValueForPuzzle(d, "completed")) {
                return "#ffae42"
            }
            return colorScale(getValueForPuzzle(d))
        })
        .style("stroke-width", 4)
        .style("stroke", "none")
        .style("opacity", 0.8)
        .on("mouseover", mouseover)
        .on("mousemove", mousemove)
        .on("mouseleave", mouseleave)
        .on("click", (d) => puzzleOnClick(d))

    if (!student) {
        renderRadioButtons(radioContainer.id, "Color by", radioContainer.id + "puzzle-heatmap-radio", Object.keys(RADIO_TO_STAT), true, (radio) => {
            statToShow = RADIO_TO_STAT[radio]
            colorScale = d3.scaleSequential()
                .interpolator(STAT_TO_COLOR_INTERPOLATOR[statToShow])
                .domain(STAT_TO_DOMAIN[statToShow] || [0, numStudents])
            svg.selectAll(".puzzle-rect")
                .style("fill", function (d) { return colorScale(getValueForPuzzle(d)) })
        })
    }
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

export const ALL_STUDENT_TABLE_COLUMNS = ["Student", "% Active Time", "Total Time", "Persistence Score", "Total Active Time", "# Attempted", "# Completed", "% Attempted", "% Completed", "% Completed/Attempted"]

export const ALL_PUZZLE_TABLE_COLUMNS = ["Puzzle", "Category", "Main Concept Tested", "# Students Completed", "# Students Attempted", "% Students Completed", "% Students Attempted", "Median Total Time", "Median Active Time", "Difficulty (out of 100)", "Avg % Active Time", "% Completed/Attempted"]

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
    tableContainer.innerHTML = '<span style="float: right;" data-tooltip="Click on the column headers to sort the rows."><i class="big blue question circle outline icon"></i></span>'

    const table = document.createElement("table")
    table.id = tableDivId + "table"
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

    fixTableColumns(tableDivId, columns.length)
    reinitializeTableSort()
}

export function reinitializeTableSort() {
    $('table').tablesort()
    // Sort by dates in YYYY-MM-DD format
    for (let column of Object.keys(COLUMN_SORTBY)) {
        $('thead th.' + column).data('sortBy', COLUMN_SORTBY[column])
    }
}

export function renderRadioButtons(radioDivId, radioGroupLabel, radioGroupName, items, isInline, onRadioChange, additionalClasses = "") {
    const form = document.getElementById(radioDivId)
    form.className = "ui form"
    form.innerHTML = ""

    const group = document.createElement("div")
    group.className = isInline ? "inline fields" : "grouped fields"
    group.innerHTML = `<label>${radioGroupLabel}</label>`
    form.appendChild(group) 

    for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const field = document.createElement("div")
        field.className = "field"
        group.appendChild(field)

        const radio = document.createElement("div")
        radio.className = "ui radio checkbox"

        const input = document.createElement("input")
        input.type = "radio"
        input.name = radioGroupName
        input.value = item
        if (!i) input.checked = true
        input.onchange = () => onRadioChange(item)
        radio.appendChild(input)

        const label = document.createElement("label")
        label.textContent = item
        radio.appendChild(label)
        field.appendChild(radio)
    }
}

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

export function renderGraphPopout(containerDivId, title, graphRenderFunction, tooltip = null, subtitle = null, center = true) {
    const container = document.getElementById(containerDivId)
    container.className = "ui card full-width"
    container.innerHTML = ""

    const content = document.createElement("div")
    content.className = "content"
    content.innerHTML = `<div class="header" style="margin-bottom: 5px" ${tooltip ? `data-tooltip="${tooltip}"` : ""}>${title} ${tooltip ? '<i class="question circle outline icon"></i>' : ""}${subtitle ? '<div style="font-weight: normal">' + subtitle + '</div>' : ''}</div>`
    container.appendChild(content)

    const graph = document.createElement("div")
    graph.id = containerDivId + "graph"
    graph.style.height = '200px'
    graph.style.width = '80%'
    if (center) graph.style.textAlign = "center"
    content.appendChild(graph)

    graphRenderFunction(graph.id)
    graph.style.height = 'fit-content'
    graph.style.width = 'fit-content'
    container.style.height = "fit-content"

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

export function renderPuzzleSilhouette(containerDivId, puzzle) {
    const container = document.getElementById(containerDivId)
    container.className = "ui card full-width"
    container.innerHTML = ""

    const content = document.createElement("div")
    content.className = "content"
    content.innerHTML = `<div class="header" style="margin-bottom: 5px;">Puzzle Silhouettes</div>`
    container.appendChild(content)

    const image = document.createElement("img")
    image.className = "puzzle-image"
    image.src = PUZZLE_IMAGE_PATHS[puzzle]
    image.style.height = '200px'
    // image.style.width = '80%'
    image.style.textAlign = "center"
    content.appendChild(image)

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

export function renderAlertsPanel(divId, items, itemTransformFunction = null, onClickFunction = null, subheader = null) {
    const container = document.getElementById(divId)

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

    renderList(listContainer.id, items, listRenderFunction, additionalClasses, "alert")
}

export function fixTableColumns(tableId, numCols) {
    var table = $("#" + tableId)
    var colWidth = table.width() / numCols

    // Set the width of thead columns
    table.find('thead tr').children().each(function (i, v) {
        $(v).width(colWidth)
    })
    table.find('tbody tr').children().each(function (i, v) {
        $(v).width(colWidth)
    })
}