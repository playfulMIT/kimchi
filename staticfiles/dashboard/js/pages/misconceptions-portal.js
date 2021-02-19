import { MISCONCEPTION_LABEL_MAP, PUZZLE_TO_KEY, MISCONCEPTION_TO_RECOMMENDATION } from '../util/constants.js'
import { formatPlurals } from '../util/helpers.js';

const barColorScale = d3.scaleOrdinal()
    .domain(["Misc A", "Misc B", "Misc C", "Misc D", "Misc E"])
    .range(["#FDCC35", "#1573C7", "#C91453", "#1A3B05", "#A960AD"])

var svg = null
var width = 0
var height = 0
var miniWidth = 0
var miniHeight = 0
var bottomPadding = 0
var mbar = null

// TODO: replace misc names
// TODO: check attempt numbers
const miscList = ["Misc A", "Misc B", "Misc C", "Misc D", "Misc E"]
const miscDict = {
    "Misc A": 0,
    "Misc B": 1,
    "Misc C": 2,
    "Misc D": 3,
    "Misc E": 4
}
const puzzleList = d3.range(10, 31)

var allStudentList = []

const graphLocations = []
var misconceptionsData = null
var puzzleMap = {}
var misconceptionMap = {}

var misconceptionPuzzles = []

var maxMiscCount = 0
var maxStudentCount = 0
var maxStudentMiscCount = 0

var showMiscCount = true

var selectedStudent = null
var selectedStudentData = null
var selectedMisconception = "All"


function addToMisconceptionMap(misc, student, puzzle) {
    misconceptionMap[misc].miscCount += 1

    if (!(student in misconceptionMap[misc].students)) {
        misconceptionMap[misc].students[student] = [puzzle]
    } else {
        misconceptionMap[misc].students[student].push(puzzle)
    }

    if (!(puzzle in misconceptionMap[misc].puzzles)) {
        misconceptionMap[misc].puzzles[puzzle] = [student]
    } else {
        misconceptionMap[misc].puzzles[puzzle].push(student)
    }
}

function parseMisconceptionMap() {
    for (let misc of Object.keys(misconceptionMap)) {
        misconceptionMap[misc].studentCount = Object.keys(misconceptionMap[misc].students).length
        misconceptionMap[misc].studentList = []
        misconceptionMap[misc].puzzleList = []

        const values = []
        for (let student of Object.keys(misconceptionMap[misc].students)) {
            const list = misconceptionMap[misc].students[student]
            const obj = { student: student, miscCount: list.length, puzzles: [...new Set(list)] }
            misconceptionMap[misc].studentList.push(obj)
            values.push(list.length)
        }
        misconceptionMap[misc].studentList.sort((a, b) => b.miscCount - a.miscCount)

        for (let puzzle of Object.keys(misconceptionMap[misc].puzzles)) {
            const list = misconceptionMap[misc].puzzles[puzzle]
            const obj = { puzzle: puzzle, miscCount: list.length, students: [...new Set(list)] }
            misconceptionMap[misc].puzzleList.push(obj)
        }
        misconceptionMap[misc].puzzleList.sort((a, b) => b.miscCount - a.miscCount)

        misconceptionMap[misc].min = values.length ? Math.min(...values) : 0
        misconceptionMap[misc].avg = (values.reduce((a, x) => a + x, 0) / values.length) || 0
        misconceptionMap[misc].max = Math.max(0, ...values)

        maxStudentMiscCount = Math.max(maxStudentMiscCount, misconceptionMap[misc].max)

        delete misconceptionMap[misc]["students"]
        delete misconceptionMap[misc]["puzzles"]
    }
}

function parseMisconceptionsData() {
    misconceptionMap["All"] = {
        studentCount: 0,
        miscCount: 0, 
        students: {},
        puzzles: {}
    }
    for (let misc of miscList) {
        misconceptionMap[misc] = {
            studentCount: 0,
            miscCount: 0,
            students: {},
            puzzles: {}
        }
    }

    var puzzleIndex = 10
    for (let puzzle of misconceptionPuzzles) {
        puzzleMap[`${puzzleIndex}`] = {}
        puzzleMap[`${puzzleIndex}`].miscCount = [
            { category: "Misc A", value: 0 },
            { category: "Misc B", value: 0 },
            { category: "Misc C", value: 0 },
            { category: "Misc D", value: 0 },
            { category: "Misc E", value: 0 }
        ]
        puzzleMap[`${puzzleIndex}`].studentCount = [
            { category: "Misc A", value: new Set() },
            { category: "Misc B", value: new Set() },
            { category: "Misc C", value: new Set() },
            { category: "Misc D", value: new Set() },
            { category: "Misc E", value: new Set() }
        ]
        puzzleIndex += 1
    }

    for (let student of Object.keys(misconceptionsData)) {
        for (let puzzle of Object.keys(misconceptionsData[student])) {
            const pIndex = misconceptionPuzzles.findIndex(p => p === puzzle) + 10
            for (let attempt of misconceptionsData[student][puzzle]) {
                for (let label of attempt["labels"]) {
                    if (!(label in MISCONCEPTION_LABEL_MAP)) continue
                    const miscCategory = MISCONCEPTION_LABEL_MAP[label]
                    const miscIndex = miscDict[miscCategory]
                    puzzleMap[pIndex].miscCount[miscIndex].value += 1
                    puzzleMap[pIndex].studentCount[miscIndex].value.add(student)
                    addToMisconceptionMap(miscCategory, student, puzzle)
                    addToMisconceptionMap("All", student, puzzle)
                }
            }
        }
    }

    for (let puzzle of Object.keys(puzzleMap)) {
        maxMiscCount = Math.max(maxMiscCount, Math.max(...puzzleMap[puzzle].miscCount.map(v => v.value)))
        maxStudentCount = Math.max(maxStudentCount, Math.max(...puzzleMap[puzzle].studentCount.map(v => v.value.size)))

        for (let miscIndex = 0; miscIndex < 5; miscIndex++) {
            puzzleMap[puzzle].studentCount[miscIndex].value = puzzleMap[puzzle].studentCount[miscIndex].value.size
        }
    }

    parseMisconceptionMap()
}

function buildGraphLocations() {
    for (let row of d3.range(3)) {
        for (let col of d3.range(7)) {
            graphLocations.push([miniWidth * col, miniHeight * row])
        }
    }
}

function createMisconceptionsClassChart() {
    mbar = svg.selectAll(".mbar")
        .data(puzzleList)
        .enter()
        .append("g")
        .attr("class", "mbar")
        .attr("transform", (d, i) => `translate(${graphLocations[i][0]},${graphLocations[i][1]})`)

    createClassChart()

    mbar.selectAll(".portal-border")
        .data([0])
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", miniHeight)
        .attr("width", miniWidth)
        .attr("class", "portal-border")
        .style("stroke", "black")
        .style("fill", "none")
        .style("stroke-width", 1)

    // TODO: change to rect with centered text and test with inspect on
    mbar.selectAll(".portal-title-border")
        .data([0])
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("y1", miniHeight - bottomPadding)
        .attr("x2", miniWidth)
        .attr("y2", miniHeight - bottomPadding)
        .attr("class", "portal-title-border")
        .style("stroke", "black")

    mbar.selectAll(".portal-title")
        .data((d, i) => [i + 10])
        .enter()
        .append("text")
        .attr("x", miniWidth / 2)
        .attr("y", miniHeight - 3)
        .style("font-size", "1em")
        .style("text-anchor", "middle")
        .text(d => d)
        .attr("class", "portal-title")
        .style("fill", "black")
}

function createMisconceptionsCountChart() {
    var x = d3.scaleBand()
        .domain(d3.range(miscList.length))
        .range([0, miniWidth])

    var y = d3.scaleLinear()
        .domain([0, (showMiscCount ? maxMiscCount : maxStudentCount)])
        .range([miniHeight - bottomPadding, 0])

    mbar.selectAll(".bar")
        .data(d => (showMiscCount ? puzzleMap[`${d}`].miscCount : puzzleMap[`${d}`].studentCount))
        .enter()
        .append("rect")
        .attr("x", (d, i) => x(i))
        .attr("y", d => y(d.value))
        .attr("class", "bar")
        .attr("height", d => y(0) - y(d.value))
        .attr("width", x.bandwidth())
        .attr("fill", d => barColorScale(d.category))
}

function createSingleMisconceptionCountChart() {
    var y = d3.scaleLinear()
        .domain([0, showMiscCount ? maxMiscCount : maxStudentCount])
        .range([miniHeight - bottomPadding, 0])
    
    mbar.selectAll(".bar")
        .data(d => [(showMiscCount ? puzzleMap[`${d}`].miscCount : puzzleMap[`${d}`].studentCount).find(v => v.category === selectedMisconception)])
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => y(d.value))
        .attr("class", "bar")
        .attr("height", d => y(0) - y(d.value))
        .attr("width", miniWidth)
        .attr("fill", d => barColorScale(d.category))
}

function createStudentMisconceptionsSummaryChart() {
    const keys = ["student", "class"]

    // The scale spacing the groups:
    var x0 = d3.scaleBand()
        .domain(miscList)
        .rangeRound([0, width])
        .paddingInner(0.3)

    // The scale for spacing each group's bar:
    var x1 = d3.scaleBand()
        .domain(keys).rangeRound([0, x0.bandwidth()])
        .padding(0.05)

    var y = d3.scaleLinear()
        .domain([0, maxStudentMiscCount])
        .range([height, 0])

    var barGroup = svg.append("g")
        .selectAll("g")
        .data(miscList)
        .enter()
        .append("g")
        .attr("class", "bar")
        .attr("transform", function (d) { return "translate(" + x0(d) + ",0)"; })
        
    var studentBarGroup = barGroup.selectAll(".student-bar")
        .data(d => [{ misconception: d, value: selectedStudentData[d].miscCount }])
        .enter().append("g")
        .attr("class", "student-bar")

    studentBarGroup.append("rect")
        .attr("x", d => x1(keys[0]))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", function (d) { return height - y(d.value) })
        .style("fill", "black")

    studentBarGroup.append("text")
        .text(d => d.value)
        .attr("x", d => x1(keys[0]) + x1.bandwidth()/2)
        .attr("y", d => y(d.value) - 5)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("text-anchor", "middle")

    var classBarGroup = barGroup.selectAll(".class-bar-group")
        .data(d => [{ misconception: d, x: x1(keys[1]) + x1.bandwidth() / 2, maxY: y(misconceptionMap[d].max), avgY: y(misconceptionMap[d].avg), minY: y(misconceptionMap[d].min) }])
        .enter().append("g")
        .attr("class", "class-bar-group")
        
    classBarGroup.append("line")
        .attr("class", "class-bar")
        .attr("x1", d => d.x)
        .attr("x2", d => d.x)
        .attr("y1", d => d.maxY)
        .attr("y2", y(0))
        .style("stroke-width", 1)
        .style("stroke", "black")
        
    const symbolSize = 32
    classBarGroup.append("path")
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(symbolSize))
        .attr("transform", d => `translate(${d.x},${d.maxY}) rotate(180)`)
    classBarGroup.append("text")
        .text(d => misconceptionMap[d.misconception].max)
        .attr("x", d => d.x + 13)
        .attr("y", d => misconceptionMap[d.misconception].max > 0 ? d.maxY + 2 : d.maxY)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("text-anchor", "middle")

    classBarGroup.append("path")
        .attr("d", d3.symbol().type(d3.symbolDiamond).size(symbolSize))
        .attr("transform", d => `translate(${d.x},${d.avgY})`)
    classBarGroup.append("text")
        .text(d => misconceptionMap[d.misconception].avg.toFixed(1))
        .attr("x", d => d.x + 13)
        .attr("y", d => misconceptionMap[d.misconception].avg > 0 ? d.avgY + 2 : d.avgY)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("text-anchor", "middle")

    classBarGroup.append("path")
        .attr("d", d3.symbol().type(d3.symbolTriangle).size(symbolSize))
        .attr("transform", d => `translate(${d.x},${d.minY})`)
    classBarGroup.append("text")
        .text(d => misconceptionMap[d.misconception].min)
        .attr("x", d => d.x + 13)
        .attr("y", d => misconceptionMap[d.misconception].min > 0 ? d.minY + 2 : d.minY)
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("text-anchor", "middle")

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x0))

    var legend = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end")
        .selectAll("g")
        .data([
            { label: `${selectedStudent}'s misconceptions`, symbolType: d3.symbolSquare },
            { label: "class max", symbolType: d3.symbolTriangle },
            { label: "class min", symbolType: d3.symbolTriangle },
            { label: "class avg", symbolType: d3.symbolDiamond },
        ])
        .enter().append("g")
        .attr("transform", function (d, i) { return "translate(0," + i * 20 + ")" });

    var path = d3.symbol().type(d => d.symbolType).size(symbolSize)
    legend.append("path")
        .attr("d", path)
        .attr("transform", (d, i) => `translate(${width - 17},10) ${d.label === "class max" ? "rotate(180)" : ""}`)

    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9.5)
        .attr("dy", "0.32em")
        .text(d => d.label)
}

function handleMisconceptionsRadioChange() {
    $('#portal-misc-btn-group input').on('change', function () {
        const value = $('input[name=portal-misc-btn]:checked', '#portal-misc-btn-group').val()
        mbar.selectAll(".bar").remove()
        switch (value) {
            case "student-count":
                showMiscCount = false
                break
            case "misc-count":
                showMiscCount = true
                break
        }  
        createClassChart()
    })
}

function populateStudentSearchBar() {
    const list = document.getElementById("student-search-options")
    for (let student of allStudentList) {
        const option = document.createElement("option")
        option.innerText = student
        list.appendChild(option)
    }

    document.querySelector('input[list="student-search-options"]').addEventListener('input', (e) => {
        var input = e.target
        var val = input.value
        var list = input.getAttribute('list')
        var options = document.getElementById(list).childNodes

        for (var i = 0; i < options.length; i++) {
            if (options[i].innerText === val) {
                buildStudentMisconceptionsPage(val)
                break
            }
        }
    })
}

function displayClassMisconceptionStats() {
    const studentCount = misconceptionMap[selectedMisconception].studentCount
    const miscCount = misconceptionMap[selectedMisconception].miscCount
    const studentList = misconceptionMap[selectedMisconception].studentList
    const puzzleList = misconceptionMap[selectedMisconception].puzzleList
    const miscLabel = selectedMisconception
    // TODO: fix this

    const summaryText = `${studentCount} students have made ${miscLabel} a total of ${miscCount} times:`
    const moreText = `Student's who've made the most ${miscLabel}`
    const studentDisplayList = document.createElement("div")
    studentDisplayList.innerHTML = `<ol> ${studentList.map(entry => `<li>${entry.student} - ${entry.miscCount} times in ${entry.puzzles.length} ${formatPlurals("puzzle", entry.puzzles.length)}</li>`).join('')} </ol>`
    studentDisplayList.style.height = "10vh"
    studentDisplayList.style.overflowY = "auto"

    const moremoreText = `Puzzles with the most ${miscLabel}`
    const puzzleDisplayList = document.createElement("div")
    puzzleDisplayList.innerHTML = `<ol> ${puzzleList.map(entry => `<li>${entry.puzzle} - ${entry.miscCount} times by ${entry.students.length} ${formatPlurals("student", entry.students.length)}</li>`).join('')} </ol>`
    puzzleDisplayList.style.height = "10vh"
    puzzleDisplayList.style.overflowY = "auto"

    const container = document.getElementById("portal-misconceptions-stats-container")
    container.innerHTML = ""
    container.append(summaryText, document.createElement("br"), moreText, studentDisplayList, moremoreText, puzzleDisplayList)
}

function displayStudentMisconceptionStats() {
    const stats = selectedStudentData[selectedMisconception]

    const container = document.getElementById("portal-misconceptions-stats-container")
    container.innerHTML = `${selectedStudent} has made a total of ${stats.miscCount} ${selectedMisconception} misconceptions across ${stats.puzzles.length} ${formatPlurals("puzzle", stats.puzzles.length)}.`

    const showAllMisconceptions = selectedMisconception === "All"

    const labelList = new Array(MISCONCEPTION_TO_RECOMMENDATION.length)
    for (let i = 0; i < labelList.length; i++) {
        labelList[i] = 0
    }

    const isSetsEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value))
    const getRecommendationIndex = (puzzle, labels) => {
        const match = MISCONCEPTION_TO_RECOMMENDATION.findIndex(entry => {
            return entry.puzzle === puzzle && isSetsEqual(new Set(entry.criteria), new Set(labels))
        })
        return match
    }


    for (let puzzle of stats.puzzles) {
        container.append(document.createElement("br"))
        container.append("Puzzle " + (misconceptionPuzzles.findIndex(v => v === puzzle) + 10))
        const list = document.createElement("ul")
        for (let attempt of misconceptionsData[selectedStudent][puzzle]) {
            if (!showAllMisconceptions && !attempt.labels.map(l => MISCONCEPTION_LABEL_MAP[l] || "").find(v => v === selectedMisconception)) {
                continue
            }
            for (let label of attempt.labels) {
                if (label.startsWith("s")) {
                    const recIndex = getRecommendationIndex(puzzle, attempt.labels)
                    if (recIndex >= 0) {
                        labelList[recIndex] += 1
                    }
                    break
                }
            }
            const item = document.createElement("li")
            item.innerHTML = `Attempt ${attempt.n_attempt}: `
            const link = document.createElement("a")
            link.textContent = "Show Full Replay"
            link.className = "alert-link"
            link.onclick = () => generateStudentReplay(selectedStudent, puzzle, parseInt(attempt.n_attempt)-1)

            item.appendChild(link)
            list.appendChild(item)
        }
        container.append(list)
    }

    // TODO: add tooltip

    // TODO: puzzle to name
    container.append("Next Steps:")
    const list = document.createElement("ul")
    container.append(list)
    if (selectedMisconception === "Misc A" && labelList.length) {

        list.innerHTML = labelList.filter(v => v).map((v, i) => `<li>${MISCONCEPTION_TO_RECOMMENDATION[i].recommendation} (x${v})</li>`).join('')
        return
    }
    
    list.innerHTML = "<li>Next steps not available yet for this misconception...</li>"
}

function getReplayURL(student, puzzle, attemptIndex) {
    return `/${GROUP}/players/${student}/${PUZZLE_TO_KEY[puzzle]}/${attemptIndex}`
}

function generateStudentReplay(student, puzzle, attemptIndex) {
    $("#portal-view-area-svg").hide()
    const container = document.getElementById("portal-view-area")
    const iframe = document.createElement("iframe")
    iframe.className = "portal-student-replay"
    iframe.src = getReplayURL(student, puzzle, attemptIndex)
    iframe.height = height
    iframe.width = width
    $(".portal-student-replay").remove()
    container.appendChild(iframe)
}

function showStudentReplayPlaceholder() {
    const container = document.createElement("div")
    container.textContent = "Select a replay to view here."
    container.className = "portal-student-replay"
    $(".portal-student-replay").remove()
    document.getElementById("portal-view-area").appendChild(container)
}

function createMisconceptionCategoryButtons() {
    const buttonGroup = document.getElementById("portal-misconceptions-btn-container")
    
    var i = 0
    for (let category of Object.keys(misconceptionMap)) {
        const container = document.createElement("div")
        container.className = "misconception-btn-group"

        const button = document.createElement("button")
        button.className = `btn misc-btn ${!i ? "active" : ""}`
        button.textContent = category
        button.onclick = (event) => {
            updateSelectedMisconception(category)
            $('.misc-btn').removeClass("active")
            $(event.target).addClass("active")
        }
        container.appendChild(button)

        const label = document.createElement("div")
        label.innerHTML = `<span id="misconception-btn-label${i}" style="font-weight: bold;">${misconceptionMap[category].miscCount}</span> miscs`
        i += 1
        label.style.textAlign = "center"
        container.appendChild(label)

        buttonGroup.appendChild(container)
    }
}

function updateMisconceptionCategoryButtons() {
    var i = 0
    for (let category of Object.keys(misconceptionMap)) {
        const text = `${(selectedStudentData ? selectedStudentData[category] : misconceptionMap[category]).miscCount}`
        document.getElementById("misconception-btn-label" + i).textContent = text
        i += 1
    }
}

function clearPortalViewArea() {
    svg.selectAll("*").remove()
}

function createStudentChart() {
    $("#portal-misc-back-btn").show()
    if (selectedMisconception === "All") {
        $("#portal-view-area-svg").show()
        createStudentMisconceptionsSummaryChart()
    } else {
        $("#portal-view-area-svg").hide()
        $(".portal-student-replay").remove()
        showStudentReplayPlaceholder()
    }
}

function createClassChart() {
    $("#portal-misc-back-btn").hide()
    mbar.selectAll(".bar").remove()
    $("#portal-view-area-svg").show()
    if (selectedMisconception === "All") {
        createMisconceptionsCountChart()
    } else {
        createSingleMisconceptionCountChart()
    }
}

function updateSelectedMisconception(newMisc) {
    selectedMisconception = newMisc
    if (selectedMisconception === "All") {
        $("#portal-misconceptions-title").text("All Misconceptions:")
    } else {
        $("#portal-misconceptions-title").text(selectedMisconception + ":")
    }

    if (selectedStudent) {
        createStudentChart()
        displayStudentMisconceptionStats()
    } else {
        createClassChart()
        displayClassMisconceptionStats()
    }
}

function buildClassMisconceptionsPage() {
    clearPortalViewArea()
    document.querySelector('input[list="student-search-options"]').value = ""
    $(".portal-student-replay").remove()
    selectedStudent = null
    selectedStudentData = null
    
    $("#portal-misc-btn-group").show()

    updateMisconceptionCategoryButtons()
    createMisconceptionsClassChart()
    displayClassMisconceptionStats()
}

function buildStudentMisconceptionsPage(student) {
    clearPortalViewArea()
    selectedStudent = student

    $("#portal-misc-btn-group").hide()
    
    selectedStudentData = {}
    for (let misc of Object.keys(misconceptionMap)) {
        selectedStudentData[misc] = misconceptionMap[misc].studentList.find(v => v.student === selectedStudent) || { student: selectedStudent, miscCount: 0, puzzles: [] }
    }
    updateMisconceptionCategoryButtons()
    createStudentChart()
    displayStudentMisconceptionStats()
}

export function buildMisconceptionsPage() {
    updateMisconceptionCategoryButtons()
    selectedMisconception = "All"
    buildClassMisconceptionsPage()
}

export function initializeMisconceptionsPage(students, misconceptions, puzzles, svgId, w, h) {
    allStudentList = Object.keys(students)
    misconceptionsData = misconceptions
    misconceptionPuzzles = puzzles
    svg = d3.select("#" + svgId)

    width = w
    height = h
    miniWidth = Math.floor(w / 7)
    miniHeight = Math.floor(h / 3)
    bottomPadding = miniWidth * .15

    parseMisconceptionsData()
    buildGraphLocations()

    createMisconceptionCategoryButtons()
    populateStudentSearchBar()
    handleMisconceptionsRadioChange()

    $("#portal-misc-back-btn").click(() => {
        document.querySelector('input[list="student-search-options"]').value = ""
        buildClassMisconceptionsPage()
    })
}