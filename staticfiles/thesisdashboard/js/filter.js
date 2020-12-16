var levelsOfActivityData = {}
var persistenceData = {}
var completedPuzzleData = {}
var attemptedPuzzleData = {}
var attemptsPerPuzzleData = {}
var activeFilterData = {}

var timeSpentList = []
var persistenceList = []
var attemptsPerPuzzleList = []
var completedCountList = []
var attemptedCountList = []

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

// TODO: levels of activity consolidation, new persistence data
function handlePersistence(student, condition, comparisonValue) {
    if (student in persistenceData) {
        const value = persistenceData[student][persistenceData[student].length - 1].percentileCompositeAcrossAttempts
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return (condition == "<" || condition == "<=")
}

function handleTimeSpent(student, condition, comparisonValue) {
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
            const valueInSeconds = value * 60
            return handleTimeSpent(student, operator, valueInSeconds)
        case "attempts_per_puzzle":
            return handleAttemptsPerPuzzle(student, operator, value)
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
            return handlePercentile(student, operator, value, timeSpentList, handleTimeSpent)
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
    return selectedStudents
}

// returns filter keys
function setActiveFilterData(activeFilters) {
    activeFilterData = activeFilters
    return Object.keys(activeFilters)
}

function median(values) {
    if (values.length === 0) return 0;

    var half = Math.floor(values.length / 2);
    values.sort((a, b) => a - b)
    if (values.length % 2)
        return values[half];

    return (values[half - 1] + values[half]) / 2.0;
}

export function setFilterModuleData(levelsOfActivity, persistence, completedPuzzles, attemptedPuzzles, persistenceByPuzzle) {
    levelsOfActivityData = levelsOfActivity
    persistenceData = persistence
    completedPuzzleData = completedPuzzles
    attemptedPuzzleData = attemptedPuzzles

    timeSpentList = []
    persistenceList = []
    attemptsPerPuzzleList = []
    completedCountList = []
    attemptedCountList = []

    // create list for calculating percentiles
    for (const student of Object.keys(levelsOfActivityData["all"]["no_normalization"])) {
        // TODO: make this less bad 
        if (student !== "all_stats" && student !== "completed_stats") {
            timeSpentList.push(levelsOfActivityData["all"]["no_normalization"][student]["active_time"])
        }
    }
    timeSpentList.sort((a,b) => a-b)

    for (const student of Object.keys(persistenceData)) {
        persistenceList.push(persistenceData[student][persistenceData[student].length - 1].percentileCompositeAcrossAttempts)
    }
    persistenceList.sort((a, b) => a - b)

    for (const student of Object.keys(persistenceByPuzzle)) {
        var attempts = []
        for (const puzzle of Object.keys(persistenceByPuzzle[student])) {
            attempts.push(persistenceByPuzzle[student][puzzle].n_attempts)
        }
        const median_attempts = median(attempts)
        attemptsPerPuzzleData[student] = median_attempts
        attemptsPerPuzzleList.push(median_attempts)
    }
    attemptsPerPuzzleList.sort((a, b) => a - b)

    for (const student of Object.keys(completedPuzzleData)) {
        completedCountList.push(completedPuzzleData[student].size)
    }
    completedCountList.sort((a, b) => a - b)

    for (const student of Object.keys(attemptedPuzzleData)) {
        attemptedCountList.push(attemptedPuzzleData[student].size)
    }
    attemptedCountList.sort((a, b) => a - b)
}
