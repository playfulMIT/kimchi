import { showPage, showPlayerList, formatPlurals, formatTime } from "./helpers.js"
import { colorLegend, swatches } from "./legend.js"

var playerMap = null
var puzzleData = null
var playerSequences = null
var levelsOfActivity = null
var anonymizeNames = true

var activePlayer = null
var activePlayers = new Set()

const playerButtonClass = "puzzle-network-player"

var svg = null

const whiteGreenColorScale = ["#FFFFFF", "#88D969", "#46CB18", "#06A10B", "#1D800E"]
const lineColorScale = d3.scaleOrdinal(d3.schemeCategory10)
const completedColorScale = d3.scaleQuantize().range(whiteGreenColorScale)
const revisitedSizeScale = d3.scaleQuantize().range([13, 19, 26])

function createLegend() {
    const numPlayers = activePlayers.size

    svg.selectAll(".legend").remove()
    d3.select("#sequence-between-puzzles-student-legend").selectAll("*").remove()

    const studentColorLegend = swatches({
        color: lineColorScale,
        columns: "75px",
        title: "Students"
    })

    d3.select("#sequence-between-puzzles-student-legend")
        .html(studentColorLegend)

    const completedColorLegend = colorLegend({
        color: completedColorScale,
        title: "No. students who completed the puzzle",
        width: 200,
        ticks: numPlayers + 1,
        tickFormat: (d) => Math.ceil(d),
        
    })

    svg.append("g")
        .attr("transform", "translate(620,10)")
        .attr('class', 'legend')
        .node()
        .append(completedColorLegend)

    const circleSizes = [0, numPlayers]
    if (numPlayers > 1) {
        const midpoint = numPlayers / 2
        circleSizes.push(numPlayers % 2 === 0 ? midpoint : Math.floor(midpoint))
    }

    const revisitedSizeLegend = svg.append("g")
        .attr("class", "circle-legend legend")
        .attr("fill", "#777")
        .attr("transform", "translate(650,150)")
        .attr("text-anchor", "middle")
        .style("font", "10px sans-serif")
        .selectAll("g")
        .data(circleSizes)
        .join("g")
        .call(g => {
            g.append("text")
                .attr("x", -35)
                .attr("y", -65)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .style("font", "500 10px sans-serif")
                .text('No. students who revisited the puzzle')
        });

    revisitedSizeLegend.append("circle")
        .attr("transform", "translate(50,0)")
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("cy", d => -revisitedSizeScale(d))
        .attr("r", revisitedSizeScale);

    revisitedSizeLegend.append("text")
        .attr("transform", "translate(50,0)")
        .attr("y", d => -2 * revisitedSizeScale(d))
        .attr("dy", "1.3em")
        .text(d => d);

    d3.select('.circle-legend')
        .append("rect")
        .lower()
        .attr("transform", "translate(-41,-80)")
        .attr("height", 85)
        .attr("width", 190)
        .style("fill", "white")
        .style("stroke-width", 1)
        .style("stroke", "lightgrey")
}

// whole class list
function createSequenceData(originalSequence) {
    const nodes = []
    const links = []

    for (const puzzles of Object.values(puzzleData["puzzles"])) {
        nodes.push(...puzzles.map(p => ({id: p})))
    }

    for (const [student, seq] of Object.entries(originalSequence)) {
        for (let i = 1; i < Object.keys(seq).length; i++) {
            if (!seq[i.toString()]) continue
            const puzzle = Object.keys(seq[i.toString()])[0]

            const nextPuzzle = Object.keys(seq[(i+1).toString()])[0]
            links.push({
                source: puzzle,
                target: nextPuzzle,
                student: student
            })
        }
    }
    return {nodes: nodes, links: links}
}

function createSequenceDataPerStudent(originalSequence) {
    const nodes = []
    const links = {}
    const revisited = {}
    const visited = {}
    const completed = {}
    const puzzleAttemptMap = {}

    for (const puzzles of Object.values(puzzleData["puzzles"])) {
        nodes.push(...puzzles.map(p => ({ id: p })))
    }

    for (var i = 0; i < nodes.length; i++) {
        puzzleAttemptMap[nodes[i].id] = 0
    }

    for (const [student, seq] of Object.entries(originalSequence)) {
        completed[student] = new Set()

        for (let i = 1; i < Object.keys(seq).length; i++) {
            if (!seq[i.toString()]) continue
            const puzzle = Object.keys(seq[i.toString()])[0]
            if (i === 1) puzzleAttemptMap[puzzle]++
            if (Object.values(seq[i.toString()])[0] === 'completed') completed[student].add(puzzle)

            const nextPuzzle = Object.keys(seq[(i + 1).toString()])[0]
            if (Object.values(seq[(i+1).toString()])[0] === 'completed') completed[student].add(nextPuzzle)
            puzzleAttemptMap[nextPuzzle]++
            
            if (!(student in links)) {
                links[student] = []
            }

            links[student].push({
                id: student + puzzle + nextPuzzle,
                source: puzzle,
                target: nextPuzzle,
                student: student
            })
        }

        revisited[student] = new Set()
        visited[student] = new Set
        
        Object.keys(puzzleAttemptMap).forEach((key) => {
            if (puzzleAttemptMap[key] > 1) {
                revisited[student].add(key)
                visited[student].add(key)
            } else if (puzzleAttemptMap[key] === 1) {
                visited[student].add(key)
            }
            puzzleAttemptMap[key] = 0
        })
    }
    return { nodes: nodes, links: links, revisited: revisited, visited: visited, completed: completed }
}

function drag(simulation) {
    function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
    }

    function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

function getCompletedColorScaleRange(numPlayers) {
    switch (numPlayers) {
        case 0: 
            return [whiteGreenColorScale[0]]
        case 1:
            return [whiteGreenColorScale[0], whiteGreenColorScale[4]]
        case 2: 
            return [whiteGreenColorScale[0], whiteGreenColorScale[2], whiteGreenColorScale[4]]
        case 3: 
            return [whiteGreenColorScale[0], whiteGreenColorScale[1], whiteGreenColorScale[3], whiteGreenColorScale[4]]
        default: 
            return whiteGreenColorScale
    }
}

function createNetwork(perStudent = true) {
    var height = 650 //$("#puzzle-network-player-container").height()
    var width = $("#sequence-between-puzzles-network").width()
    const radius = 20
    const numPlayers = activePlayers.size
    // console.log(height, width, "test")

    lineColorScale.domain(activePlayers)
    completedColorScale.range(getCompletedColorScaleRange(numPlayers)).domain([0, Math.max(1, numPlayers)])
    revisitedSizeScale.domain([0, Math.max(1, numPlayers)])

    // evenly spaces nodes along arc
    var circleCoord = function (node, index, num_nodes) {
        var circumference = circle.node().getTotalLength();
        var pointAtLength = function (l) { return circle.node().getPointAtLength(l) };
        var sectionLength = (circumference) / num_nodes;
        var position = sectionLength * index + sectionLength / 2;
        return pointAtLength(circumference - position)
    }

    // fades out lines that aren't connected to node d
    var isConnected = function (d, opacity) {
        const connectedNodes = new Set()
        link.transition().style("stroke-opacity", function (o) {
            var opacityToReturn = opacity
            if (o.source === d) {
                connectedNodes.add(o.target.index)
                opacityToReturn = 1
            } else if (o.target === d) {
                connectedNodes.add(o.source.index)
                opacityToReturn = 1
            }
            return opacityToReturn
        })
        gnodes.transition().attr("opacity", function (o) {
            return connectedNodes.has(o.index) || o.index === d.index ? 1 : opacity
        })
    }

    // const links = perStudent ? (activePlayer ? playerSequences.links[activePlayer].map(d => Object.create(d)) : [])
    //     : playerSequences.links.map(d => Object.create(d))
    const links = []
    for (const player of activePlayers) {
        links.push(...playerSequences.links[player].map(d => Object.create(d)))
    }
    const nodes = playerSequences.nodes.map(d => Object.create(d))

    var mLinkNum = {}
    sortLinks()
    setLinkIndexAndNum()

    function sortLinks() {
        links.sort(function (a, b) {
            if (a.source > b.source) {
                return 1;
            }
            else if (a.source < b.source) {
                return -1;
            }
            else {
                if (a.target > b.target) {
                    return 1;
                }
                if (a.target < b.target) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
        });
    }

    //any links with duplicate source and target get an incremented 'linknum'
    function setLinkIndexAndNum() {
        for (var i = 0; i < links.length; i++) {
            if (i != 0 &&
                links[i].source == links[i - 1].source &&
                links[i].target == links[i - 1].target) {
                links[i].linkindex = links[i - 1].linkindex + 1;
            }
            else {
                links[i].linkindex = 1;
            }
            // save the total number of links between two nodes
            if (mLinkNum[links[i].target + "," + links[i].source] !== undefined) {
                mLinkNum[links[i].target + "," + links[i].source] = links[i].linkindex;
            }
            else {
                mLinkNum[links[i].source + "," + links[i].target] = links[i].linkindex;
            }
        }
    }

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(0))
        .force("r", d3.forceRadial(100))
    // .force("charge", d3.forceManyBody())
    // .force("x", d3.forceX())
    // .force("y", d3.forceY())

    d3.select("#sequence-between-puzzles-network").selectAll("svg").remove()
    svg = d3.select("#sequence-between-puzzles-network").append("svg")
        .attr("width", width)
        .attr("height", height)
    // .attr("viewBox", [-width / 2, -height / 2, width, height])

    svg.append('defs').append('marker')
        .attr('id', 'arrowhead')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 13)
        .attr('refY', 0.5)
        .attr('orient', 'auto')
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')

    // invisible circle for placing nodes
    // it's actually two arcs so we can use the getPointAtLength() and getTotalLength() methods
    var dim = height - 100
    var circle = svg.append("path")
        .attr("d", "M 40, " + (dim / 2 + 40) + " a " + dim / 2 + "," + dim / 2 + " 0 1,0 " + dim + ",0 a " + dim / 2 + "," + dim / 2 + " 0 1,0 " + dim * -1 + ",0")
        .style("fill", "white");

    nodes.forEach(function (n, i) {
        var coord = circleCoord(n, i, nodes.length)
        n.x = coord.x
        n.y = coord.y

        var revisitedCount = 0
        var completedCount = 0
        var activeTimeCount = 0
        var totalTimeCount = 0
        var timeStudentCount = 0

        for (const player of activePlayers) {
            if (playerSequences.revisited[player].has(n.id)) revisitedCount++
            if (playerSequences.completed[player].has(n.id)) completedCount++
            if (player in levelsOfActivity[n.id]) {
                activeTimeCount += levelsOfActivity[n.id][player].active_time
                totalTimeCount += levelsOfActivity[n.id][player].timeTotal
                timeStudentCount++
            }
        }

        n.revisitedCount = revisitedCount
        n.completedCount = completedCount
        n.activeTime = timeStudentCount > 0 ? activeTimeCount / timeStudentCount : 0
        n.totalTime = timeStudentCount > 0 ? totalTimeCount / timeStudentCount : 0
    });

    var link = svg.selectAll("path.node-link")
        .data(links).enter().append("path")
        .attr("class", "node-link")
        // .attr("d", function (d) {
        //     var dx = d.target.x - d.source.x,
        //         dy = d.target.y - d.source.y,
        //         dr = Math.sqrt(dx * dx + dy * dy);
        //     return "M" +
        //         d.source.x + "," +
        //         d.source.y + "A" +
        //         dr + "," + dr + " 0 0,1 " +
        //         d.target.x + "," +
        //         d.target.y;
        // })
        .attr("d", function (d) {
            const t_radius = radius / 1.25
            var gamma = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x);

            // Math.atan2 returns the angle in the correct quadrant as opposed to Math.atan
            var tx = d.target.x - (Math.cos(gamma) * t_radius);
            var ty = d.target.y - (Math.sin(gamma) * t_radius);

            var dx = tx - d.source.x,
                dy = ty - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);

            // get the total link numbers between source and target node
            var lTotalLinkNum = mLinkNum[d.source.id + "," + d.target.id] || mLinkNum[d.target.id + "," + d.source.id];
            if (lTotalLinkNum > 1) {
                // if there are multiple links between these two nodes, we need generate different dr for each path
                dr = dr / (1 + (1 / lTotalLinkNum) * (d.linkindex - 1));
            }

            // Self edge.
            if (dx === 0 && dy === 0) {
                // Fiddle with this angle to get loop oriented.
                var xRotation = -45;

                // Needs to be 1.
                var largeArc = 1;

                // Change sweep to change orientation of loop. 
                var sweep = 0;

                const nodeNum = d.target.index
                if (nodeNum < 18) {
                    sweep = 1 
                }

                var drx = 30
                var dry = 20

                if (lTotalLinkNum > 1) {
                    // if there are multiple links between these two nodes, we need generate different dr for each path
                    drx = drx / (1 + (1 / lTotalLinkNum) * (d.linkindex - 1));
                    dry = dry / (1 + (1 / lTotalLinkNum) * (d.linkindex - 1));
                }

                var x1 = d.source.x
                var y1 = d.source.y
                var x2 = tx + 1
                var y2 = ty + 1

                return "M" + x1 + "," + y1 + "A" + drx + "," + dry + " " + xRotation + "," + largeArc + "," + sweep + " " + x2 + "," + y2
            } 
            // generate svg path
            return "M" + d.source.x + "," + d.source.y +
                "A" + dr + "," + dr + " 0 0 1," + tx + "," + ty; // +
                // "A" + dr + "," + dr + " 0 0 0," + d.source.x + "," + d.source.y;
        })
        .attr('marker-end', 'url(#arrowhead)')
        .attr("stroke", (d) => lineColorScale(d.student))
        .attr("stroke-width", 2)
        

    // TODO: fix
    link.append("title")
        .text((d) => anonymizeNames ? d.student : playerMap[d.student])

    var gnodes = svg.selectAll('g.gnode')
        .data(nodes).enter().append('g')
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")"
        })
        .classed('gnode', true);

    var node = gnodes.append("circle")
        .attr("r", (d) => revisitedSizeScale(d.revisitedCount))
        .attr("class", "node")
        .on("mouseenter", function (d) {
            isConnected(d, 0.1)
            node.transition().duration(100).attr("r", (di) => revisitedSizeScale(di.revisitedCount))
            d3.select(this).transition().duration(100).attr("r", revisitedSizeScale(d.revisitedCount) + 5)
        })
        .on("mouseleave", function (d) {
            node.transition().duration(100).attr("r", (di) => revisitedSizeScale(di.revisitedCount))
            isConnected(d, 1)
        })
        .attr("fill", (d) => completedColorScale(d.completedCount))
        .attr("stroke-width", (d, i) => 1) //perStudent && activePlayer && playerSequences.visited[activePlayer].has(d.id) ? 3 : 1)

    var labels = gnodes.append("text")
        .attr("dy", 4)
        .text((d, i) => i + 1)

    gnodes.append("title")
        .attr("dy", 4)
        .attr("data-html", "true")
        .html((d) => `${d.id}, ${numPlayers > 1 ? "avg. " : ""}total time: ${formatTime(d.totalTime)}, ${numPlayers > 1 ? "avg. " : ""}active time: ${formatTime(d.activeTime)}`)

    createLegend()
}

function togglePlayer(pk) {
    $(`#${activePlayer}.${playerButtonClass}`).toggleClass("active")

    if (activePlayer === pk) {
        activePlayer = null
    } else {
        activePlayer = pk
        if (activePlayer) $(`#${activePlayer}.${playerButtonClass}`).toggleClass("active")
    }

    createNetwork()
}

function togglePlayerSelectMultiple(pk) {
    $(`#${pk}.${playerButtonClass}`).toggleClass("active")

    if (activePlayers.has(pk)) {
        activePlayers.delete(pk)
    } else {
        activePlayers.add(pk)
    }

    createNetwork()
}

function generatePlayerList() {
    const numPlayers = Object.keys(playerMap).length
    document.getElementById("puzzle-network-player-count").innerHTML = `${numPlayers} ${formatPlurals("Student", numPlayers)}`
    showPlayerList(playerButtonClass, "puzzle-network-player-list", playerMap, (event) => {togglePlayerSelectMultiple(event.target.id)}, anonymizeNames)
}

export function showSequenceBetweenPuzzlesNetwork(pMap, puzzData, seq, loa, anonymize=true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        playerSequences = createSequenceDataPerStudent(seq)
        anonymizeNames = anonymize
        levelsOfActivity = loa

        generatePlayerList()
        createNetwork()
    }

    showPage("puzzle-network-container", "nav-puzzle-network")
}