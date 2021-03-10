var funnelData = {}
var levelsOfActivityData = {}
var persistenceData = {}
var completedPuzzleData = {}
var attemptedPuzzleData = {}
var attemptsPerPuzzleData = {}
var activeFilterData = {}

var activeTimeList = []
var persistenceList = []
var attemptsPerPuzzleList = []
var completedCountList = []
var attemptedCountList = []
var totalTimeList = []
var snapshotList = []
var rotateList = []
var percentIncompleteList = []
var percentIncorrectList = []

function handleEqualityOperator(operator, delta) {
    switch (operator) {
        case '<':
            return (delta < 0)
        case '>':
            return (delta > 0)
        case '=':
            return (delta == 0)
        case '>=':
            return (delta >= 0)
        case '<=':
            return (delta <= 0)
    }
    return false
}

// TODO: levels of activity consolidation
function handlePersistence(student, condition, comparisonValue) {
    if (student in persistenceData) {
        const value = persistenceData[student].cumulative.score
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleActiveTime(student, condition, comparisonValue) {
    if (student in levelsOfActivityData["all"]["no_normalization"]) {
        const value = levelsOfActivityData["all"]["no_normalization"][student].active_time
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleAttemptsPerPuzzle(student, condition, comparisonValue) {
    if (student in attemptsPerPuzzleData) {
        const value = attemptsPerPuzzleData[student]
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleTotalTime(student, condition, comparisonValue) {
    if (student in levelsOfActivityData["all"]["no_normalization"]) {
        const value = levelsOfActivityData["all"]["no_normalization"][student].timeTotal 
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleRotations(student, condition, comparisonValue) {
    if (student in levelsOfActivityData["all"]["no_normalization"]) {
        const value = levelsOfActivityData["all"]["no_normalization"][student]["ws-rotate_shape"]
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleSnapshots(student, condition, comparisonValue) {
    if (student in levelsOfActivityData["all"]["no_normalization"]) {
        const value = levelsOfActivityData["all"]["no_normalization"][student]["ws-snapshot"]
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handlePercentIncorrect(student, condition, comparisonValue) {
    if (student in funnelData) {
        var incorrectCount = 0
        for (let puzzle of Object.keys(funnelData[student])) {
            if (funnelData[student][puzzle].completed) continue
            const difference = funnelData[student][puzzle].submitted - funnelData[student][puzzle].completed
            incorrectCount += Math.min(1, difference)
        }
        const value = incorrectCount * 100 / 30
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handlePercentIncomplete(student, condition, comparisonValue) {
    if (student in funnelData) {
        var incompleteCount = 0
        for (let puzzle of Object.keys(funnelData[student])) {
            if (funnelData[student][puzzle].submitted === 0) {
                incompleteCount += Math.min(1, funnelData[student][puzzle].create_shape)
            }
        }
        const value = incompleteCount * 100 / 30
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleAttemptedCount(student, condition, comparisonValue) {
    if (student in attemptedPuzzleData) {
        const value = attemptedPuzzleData[student].size
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=") 
}

function handleCompletedCount(student, condition, comparisonValue) {
    if (student in completedPuzzleData) {
        const value = completedPuzzleData[student].size
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleAttemptedPuzzleList(student, puzzleList) {
    if (student in attemptedPuzzleData) {
        for (let puzzle of puzzleList) {
            if (!attemptedPuzzleData[student].has(puzzle)) {
                return false
            }
        }
        return true
    }
    return false
}

function handleCompletedPuzzleList(student, puzzleList) {
    if (student in completedPuzzleData) {
        for (let puzzle of puzzleList) {
            if (!completedPuzzleData[student].has(puzzle)) {
                return false
            }
        }
        return true
    }
    return false
}

function handleAndCondition(student, conditionsList) {
    for (let condition of conditionsList) {
        if (!handleCondition(student, condition)) {
            return false
        }
    }
    return true
}

function handleOrCondition(student, conditionsList) {
    for (let condition of conditionsList) {
        if (handleCondition(student, condition)) {
            return true
        }
    }
    return false
}

function handleNotCondition(student, conditionsList) {
    for (let condition of conditionsList) {
        if (handleCondition(student, condition)) {
            return false
        }
    }
    return true
}

function handleMultipleConditions(student, conditionsObj) {
    const conditions = Object.values(conditionsObj)[0]

    switch (Object.keys(conditionsObj)[0]) {
        case 'and':
            return handleAndCondition(student, conditions)
        case 'or':
            return handleOrCondition(student, conditions)
        case 'not':
            return handleNotCondition(student, conditions)
    }

    return false
}

function handlePercentile(student, operator, percentile, percentileList, metricHandler) {
    if (percentile >= 100 || percentile <= 0) return false

    const index = Math.ceil(percentile * percentileList.length / 100) - 1
    const percentileVal = percentileList[index]
    return metricHandler(student, operator, percentileVal)
}

function handleSingleCondition(student, condition) {
    switch (condition[0]) {
        case "attempted":
            return handleAttemptedPuzzleList(student, condition[1])
        case "completed":
            return handleCompletedPuzzleList(student, condition[1])
        default:
            break
    }

    const operator = condition[1]
    const value = condition[2]

    switch (condition[0]) {
        case 'persistence':
            return handlePersistence(student, operator, value)
        case 'mins_played': 
            return handleActiveTime(student, operator, value * 60)
        case "attempts_per_puzzle":
            return handleAttemptsPerPuzzle(student, operator, value)
        case "total_time":
            return handleTotalTime(student, operator, value * 60)
        case "snapshots":
            return handleSnapshots(student, operator, value)
        case "rotate":
            return handleRotations(student, operator, value)
        case "percent_incorrect":
            return handlePercentIncorrect(student, operator, value)
        case "percent_incomplete":
            return handlePercentIncomplete(student, operator, value)
        case "completed_count":
            return handleCompletedCount(student, operator, value)
        case "attempted_count":
            return handleAttemptedCount(student, operator, value)
        case "attempts_per_puzzle_percentile":
            return handlePercentile(student, operator, value, attemptsPerPuzzleList, handleAttemptsPerPuzzle)
        case "completed_count_percentile":
            return handlePercentile(student, operator, value, completedCountList, handleCompletedCount)
        case "attempted_count_percentile":
            return handlePercentile(student, operator, value, attemptedCountList, handleAttemptedCount)
        case 'persistence_percentile':
            return handlePercentile(student, operator, value, persistenceList, handlePersistence)
        case 'mins_played_percentile':
            return handlePercentile(student, operator, value, activeTimeList, handleActiveTime)
        case "total_time_percentile":
            return handleTotalTime(student, operator, value, totalTimeList, handleTotalTime)
        case "snapshots_percentile":
            return handleSnapshots(student, operator, value, snapshotList, handleSnapshots)
        case "rotate_percentile":
            return handleRotations(student, operator, value, rotateList, handleRotations)
        case "percent_incorrect_percentile":
            return handlePercentIncorrect(student, operator, value, percentIncorrectList, handlePercentIncorrect)
        case "percent_incomplete_percentile":
            return handlePercentIncomplete(student, operator, value, percentIncompleteList, handlePercentIncomplete)
    }
    return false
}

function handleCondition(student, filter) {
    if (filter instanceof Array) {
        return handleSingleCondition(student, filter)
    }

    return handleMultipleConditions(student, filter)
}

function shouldIncludeStudent(student, filterName) {
    const filter = activeFilterData[filterName].filter
    return handleCondition(student, filter)
}

// NOTE: filtering function for thesis dashboard
// TODO: what to color when you have multiple alerts, fix parameters
export function retrieveSelectedStudents(studentList, activeFilters) {
    const selectedStudents = {}
    const activeFilterKeys = setActiveFilterData(activeFilters)

    for (let student of studentList) {
        var filterNames = []
        for (let filterName of activeFilterKeys) {
            if (shouldIncludeStudent(student, filterName)) {
                filterNames.push(filterName)
            }
        }
        if (filterNames.length > 0) {
            selectedStudents[student] = filterNames
        }
    }
    console.log(selectedStudents)
    return selectedStudents
}

//NOTE: filtering function for PJL dashboard
export function retrieveAlertedAndFilteredStudents(studentList, activeFilters) {
    setActiveFilterData(activeFilters)
    const filters = setActiveFilterSpecificData()
    const alerts = setActiveAlertSpecificData()
    return {filters: retrieveFilteredStudents(studentList, filters), alerts: retrieveAlertedStudents(studentList, alerts)}
}

//NOTE: filtering function for PJL dashboard
// Filters are ANDed
function retrieveFilteredStudents(studentList, filterKeys) {
    const selectedStudents = {}
    
    for (let student of studentList) {
        var shouldNotInclude = false
        var filterNames = []
        for (let filterName of filterKeys) {
            if (!shouldIncludeStudent(student, filterName)) {
                shouldNotInclude = true
                break
            }
            filterNames.push(filterName)
        }
        if (!shouldNotInclude) {
            selectedStudents[student] = filterNames
        }
    }
    console.log("filters", selectedStudents)
    return selectedStudents
}

//NOTE: filtering function for PJL dashboard
// Alerts are ORed
function retrieveAlertedStudents(studentList, alertKeys) {
    const selectedStudents = {}

    for (let student of studentList) {
        var filterNames = []
        for (let filterName of alertKeys) {
            if (shouldIncludeStudent(student, filterName)) {
                filterNames.push(filterName)
            }
        }
        if (filterNames.length > 0) {
            selectedStudents[student] = filterNames
        }
    }
    console.log("alerts", selectedStudents)
    return selectedStudents
}

// returns filter keys
function setActiveFilterData(activeFilters) {
    activeFilterData = activeFilters
    return Object.keys(activeFilters)
}

function setActiveFilterSpecificData() {
    return Object.keys(activeFilterData).filter(k => activeFilterData[k].type === "filter")
}

function setActiveAlertSpecificData() {
    return Object.keys(activeFilterData).filter(k => activeFilterData[k].type === "alert")
}

function median(values) {
    if (values.length === 0) return 0;

    var half = Math.floor(values.length / 2);
    values.sort((a, b) => a - b)
    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

export function getAttemptedPuzzleRange() {
    return getListRange(attemptedCountList)
}

export function getCompletedPuzzleRange() {
    return getListRange(completedCountList)
}

export function getActiveTimeRange() {
    return getListRange(activeTimeList, v => v / 60)
}

export function getPersistenceRange() {
    return getListRange(persistenceList)
}

export function getAttemptsPerPuzzleRange() {
    return getListRange(attemptsPerPuzzleList)
}

export function getTotalTimeRange() {
    return getListRange(totalTimeList, v => v / 60)
}

export function getSnapshotRange() {
    return getListRange(snapshotList)
}

export function getRotateRange() {
    return getListRange(rotateList)
}

export function getPercentIncompleteRange() {
    return getListRange(percentIncompleteList)
}

export function getPercentIncorrectRange() {
    return getListRange(percentIncorrectList)
}

function getListRange(arr, accessorFunction = null) {
    const newArr = [arr[0], arr[arr.length - 1]]
    return accessorFunction ? newArr.map(accessorFunction) : newArr
}

export function setFilterModuleData(funnel, levelsOfActivity, persistence, completedPuzzles, attemptedPuzzles, persistenceByPuzzle) {
    funnelData = funnel
    levelsOfActivityData = levelsOfActivity
    persistenceData = persistenceByPuzzle
    completedPuzzleData = completedPuzzles
    attemptedPuzzleData = attemptedPuzzles

    activeTimeList = []
    persistenceList = []
    attemptsPerPuzzleList = []
    completedCountList = []
    attemptedCountList = []
    totalTimeList = []
    snapshotList = []
    rotateList = []
    percentIncompleteList = []
    percentIncorrectList = []


    // create list for calculating percentiles
    for (const student of Object.keys(levelsOfActivityData["all"]["no_normalization"])) {
        // TODO: make this less bad 
        if (student !== "all_stats" && student !== "completed_stats") {
            activeTimeList.push(levelsOfActivityData["all"]["no_normalization"][student]["active_time"])
            totalTimeList.push(levelsOfActivityData["all"]["no_normalization"][student]["timeTotal"])
            snapshotList.push(levelsOfActivityData["all"]["no_normalization"][student]["ws-snapshot"])
            rotateList.push(levelsOfActivityData["all"]["no_normalization"][student]["ws-rotate_shape"])
        }
    }
    activeTimeList.sort((a,b) => a-b)
    totalTimeList.sort((a, b) => a-b)
    snapshotList.sort((a, b) => a-b)
    rotateList.sort((a,b) => a-b)

    for (const student of Object.keys(persistenceByPuzzle)) {
        var attempts = []
        for (const puzzle of Object.keys(persistenceByPuzzle[student])) {
            if (puzzle == "cumulative") continue
            attempts.push(persistenceByPuzzle[student][puzzle].n_attempts)
        }
        const median_attempts = median(attempts)
        attemptsPerPuzzleData[student] = median_attempts
        attemptsPerPuzzleList.push(median_attempts)

        persistenceList.push(persistenceByPuzzle[student].cumulative.score)
    }
    persistenceList.sort((a, b) => a - b)
    attemptsPerPuzzleList.sort((a, b) => a - b)

    for (const student of Object.keys(funnelData)) {
        var incompleteCount = 0
        var incorrectCount = 0
        for (let puzzle of Object.keys(funnelData[student])) {
            if (funnelData[student][puzzle].submitted === 0) {
                incompleteCount += Math.min(1, funnelData[student][puzzle].create_shape)
            } else {
                incorrectCount += funnelData[student][puzzle].completed ? 0 : Math.min(1, funnelData[student][puzzle].submitted - funnelData[student][puzzle].completed)
            }
        }
        percentIncompleteList.push(incompleteCount * 100 / 30)
        percentIncorrectList.push(incorrectCount * 100 / 30)
    }
    percentIncompleteList.sort((a, b) => a - b)
    percentIncorrectList.sort((a, b) => a - b)

    for (const student of Object.keys(completedPuzzleData)) {
        completedCountList.push(completedPuzzleData[student].size)
    }
    completedCountList.sort((a, b) => a - b)

    for (const student of Object.keys(attemptedPuzzleData)) {
        attemptedCountList.push(attemptedPuzzleData[student].size)
    }
    attemptedCountList.sort((a, b) => a - b)
}
