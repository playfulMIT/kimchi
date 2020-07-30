import { showPage, showPlayerList, formatPlurals } from "./helpers.js";

var playerMap = null
var puzzleData = null
var playerSequences = null
var anonymizeNames = true

var activePlayer = null

const playerButtonClass = "puzzle-network-player"

var color = () => {
    const scale = d3.scaleOrdinal(d3.schemeCategory10);
    return d => scale(d.student);
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
    const puzzleAttemptMap = {}

    for (const puzzles of Object.values(puzzleData["puzzles"])) {
        nodes.push(...puzzles.map(p => ({ id: p })))
    }

    for (var i = 0; i < nodes.length; i++) {
        puzzleAttemptMap[nodes[i].id] = 0
    }

    for (const [student, seq] of Object.entries(originalSequence)) {
        for (let i = 1; i < Object.keys(seq).length; i++) {
            if (!seq[i.toString()]) continue
            const puzzle = Object.keys(seq[i.toString()])[0]
            if (i === 1) puzzleAttemptMap[puzzle]++

            const nextPuzzle = Object.keys(seq[(i + 1).toString()])[0]
            puzzleAttemptMap[nextPuzzle]++
            
            if (!(student in links)) {
                links[student] = []
            }

            links[student].push({
                source: puzzle,
                target: nextPuzzle,
                student: student
            })
        }

        revisited[student] = []
        visited[student] = []
        Object.keys(puzzleAttemptMap).forEach((key) => {
            if (puzzleAttemptMap[key] > 1) {
                revisited[student].push(key)
                visited[student].push(key)
            } else if (puzzleAttemptMap[key] === 1) {
                visited[student].push(key)
            }
            puzzleAttemptMap[key] = 0
        })
    }
    return { nodes: nodes, links: links, revisited: revisited, visited: visited }
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

function createNetwork(perStudent = true) {
    var height = 650 //$("#puzzle-network-player-container").height()
    var width = $("#sequence-between-puzzles-network").width()

    // console.log(height, width, "test")

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

    const links = perStudent ? (activePlayer ? playerSequences.links[activePlayer].map(d => Object.create(d)) : [])
        : playerSequences.links.map(d => Object.create(d))
    const nodes = playerSequences.nodes.map(d => Object.create(d))

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).strength(0))
        .force("r", d3.forceRadial(100))
    // .force("charge", d3.forceManyBody())
    // .force("x", d3.forceX())
    // .force("y", d3.forceY())

    d3.select("#sequence-between-puzzles-network").selectAll("svg").remove()
    const svg = d3.select("#sequence-between-puzzles-network").append("svg")
        .attr("width", width)
        .attr("height", height)
        // .attr("viewBox", [-width / 2, -height / 2, width, height])

    // invisible circle for placing nodes
    // it's actually two arcs so we can use the getPointAtLength() and getTotalLength() methods
    var dim = height - 80
    var circle = svg.append("path")
        .attr("d", "M 40, " + (dim / 2 + 40) + " a " + dim / 2 + "," + dim / 2 + " 0 1,0 " + dim + ",0 a " + dim / 2 + "," + dim / 2 + " 0 1,0 " + dim * -1 + ",0")
        .style("fill", "white");

    nodes.forEach(function (n, i) {
        var coord = circleCoord(n, i, nodes.length)
        n.x = coord.x
        n.y = coord.y
    });

    var link = svg.selectAll("path.node-link")
        .data(links).enter().append("path")
        .attr("class", "node-link")
        .attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" +
                d.source.x + "," +
                d.source.y + "A" +
                dr + "," + dr + " 0 0,1 " +
                d.target.x + "," +
                d.target.y;
        });

    var gnodes = svg.selectAll('g.gnode')
        .data(nodes).enter().append('g')
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")"
        })
        .classed('gnode', true);

    const radius = 20
    var node = gnodes.append("circle")
        .attr("r", radius)
        .attr("class", "node")
        .on("mouseenter", function (d) {
            isConnected(d, 0.1)
            node.transition().duration(100).attr("r", radius)
            d3.select(this).transition().duration(100).attr("r", radius+5)
        })
        .on("mouseleave", function (d) {
            node.transition().duration(100).attr("r", radius);
            isConnected(d, 1);
        })
        .attr("fill", (d, i) => perStudent && activePlayer && playerSequences.revisited[activePlayer].includes(d.id) ? "#29b6f6" : "white")
        .attr("stroke-width", (d, i) => perStudent && activePlayer && playerSequences.visited[activePlayer].includes(d.id) ? 3 : 1)

    var labels = gnodes.append("text")
        .attr("dy", 4)
        .text((d, i) => i + 1)

    gnodes.append("title")
        .attr("dy", 4)
        .text((d) => d.id)
    

    // const link = svg.append("g")
    //     .attr("stroke", "#999")
    //     .attr("stroke-opacity", 0.6)
    //     .selectAll("line")
    //     .data(links)
    //     .join("line")
    //     .attr("fill", color)
    //     .attr("stroke-width", 1)

    // const node = svg.append("g")
    //     .attr("stroke", "#fff")
    //     .attr("stroke-width", 1.5)
    //     .on("drag", null)

    // const circle = node.selectAll("circle")
    //     .data(nodes)
    //     .join("circle")
    //     .attr("r", 5)
    //     .attr("fill", (d, i) => perStudent && activePlayer && playerSequences.revisited[activePlayer].includes(d.id) ? "#00FFFF" : "#ddd")
    //     // .call(drag(simulation))

    // const text = node.selectAll("text")
    //     .data(nodes)
    //     .join("text")
    //     .text((d, i) => i + 1)
    //     .attr("font-size", "0.4em")
    //     .attr("stroke-width", 0.5)
    //     .attr("stroke", "black")
        
    // circle.append("title")
    //     .text(d => d.id);

    // simulation.on("tick", () => { //"end"
    //     link
    //         .attr("x1", d => d.source.x)
    //         .attr("y1", d => d.source.y)
    //         .attr("x2", d => d.target.x)
    //         .attr("y2", d => d.target.y);

    //     text
    //         .attr("dx", d => d.x - 3)
    //         .attr("dy", d => d.y + 3)
    //     circle
    //         .attr("cx", d => d.x)
    //         .attr("cy", d => d.y);
    // });

    // invalidation.then(() => simulation.stop());
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

function generatePlayerList() {
    const numPlayers = Object.keys(playerMap).length
    document.getElementById("puzzle-network-player-count").innerHTML = `${numPlayers} ${formatPlurals("Student", numPlayers)}`
    showPlayerList(playerButtonClass, "puzzle-network-player-list", playerMap, (event) => {togglePlayer(event.target.id)}, anonymizeNames)
}

export function showSequenceBetweenPuzzlesNetwork(pMap, puzzData, seq, anonymize=true) {
    if (!playerMap) {
        playerMap = pMap
        puzzleData = puzzData
        playerSequences = createSequenceDataPerStudent(seq)
        anonymizeNames = anonymize

        generatePlayerList()
        createNetwork()
    }

    showPage("puzzle-network-container", "nav-puzzle-network")
}