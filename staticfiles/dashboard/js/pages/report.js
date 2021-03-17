import { callAPI } from "../util/helpers.js"
import { API } from "../util/constants.js"

var playerMap = null
var reportData = null

function checkDate() {
    startDate = new Date(inputDate.value)
    endDate = new Date(inputDate.value)

    if (endDate < startDate) {
        alert("Please input a valid date range!")
        return false
    }

    return true
}

async function loadReport() {
    // if (!checkDate()) return 

    const url = `${API}/report/`
    callAPI(url).then(result => {
        reportData = result
        displayReport()
    })
}

function displayReport() {
    console.log(reportData)
}

export function initializeTab(pMap) {
    playerMap = pMap
    loadReport()
}


export function showReportTab() {

}