var levelsOfActivityData = {}
var persistenceData = {}
var activeFilterData = {}

var timeSpentList = []

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
    return false
}

function handleTimeSpent(student, condition, comparisonValue) {
    if (student in levelsOfActivityData["all"]["no_normalization"]) {
        const value = levelsOfActivityData["all"]["no_normalization"][student].timeTotal
        const delta = value - comparisonValue
        return handleEqualityOperator(condition, delta)
    }
    return false
}

// function shouldFilterStudentCompletedPuzzle(student, condition, puzzleNum) {
//     const puzzleName = puzzleList[puzzleNum - 1]
//     if (student in completedPuzzleData) {
//         switch (condition) {
//             case "has":
//                 return !completedPuzzleData[student].has(puzzleName)
//             default:
//                 return completedPuzzleData[student].has(puzzleName)
//         }
//     }

//     return condition === "has" ? true : false
// }

function handleAndCondition(student, conditionsList) {
    for (let condition of conditionsList) {
        if (!handleSingleCondition(student, condition)) {
            return false
        }
    }
    return true
}

function handleOrCondition(student, conditionsList) {
    for (let condition of conditionsList) {
        if (handleSingleCondition(student, condition)) {
            return true
        }
    }
    return false
}

function handleMultipleConditions(student, conditionsObj) {
    const conditions = Object.values(conditionsObj)[0]

    switch (Object.keys(conditionsObj)[0]) {
        case 'and':
            return handleAndCondition(student, conditions)
        case 'or':
            return handleOrCondition(student, conditions)
    }

    return false
}

function handleSingleCondition(student, condition) {
    const operator = condition[1]
    const value = condition[2]

    switch (condition[0]) {
        case 'persistence':
            return handlePersistence(student, operator, value)
        case 'mins_played': 
            const valueInSeconds = value * 60
            return handleTimeSpent(student, operator, valueInSeconds)
        case 'persistence_percentile':
            return handlePersistence(student, operator, value)
        case 'mins_played_percentile':
            if (value >= 100 || value <= 0) return false
            
            const index = Math.ceil(value * timeSpentList.length / 100) - 1
            const percentileVal = timeSpentList[index]
            return handleTimeSpent(student, operator, percentileVal)
    }
    return false
}

function shouldIncludeStudent(student, filterName) {
    const filter = activeFilterData[filterName].filter
    if (filter instanceof Array) {
        return handleSingleCondition(student, filter)
    }

    return handleMultipleConditions(student, filter)
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

export function setFilterModuleData(levelsOfActivity, persistence) {
    levelsOfActivityData = levelsOfActivity
    persistenceData = persistence
    timeSpentList = []

    // create list for calculating percentiles
    for (const student of Object.keys(levelsOfActivityData["all"]["no_normalization"])) {
        // TODO: make this less bad 
        if (student !== "all_stats" && student !== "completed_stats") {
            timeSpentList.push(levelsOfActivityData["all"]["no_normalization"][student]["timeTotal"])
        }
    }
    timeSpentList.sort((a,b) => a-b)
}
