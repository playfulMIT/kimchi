import * as dashboard from './thesis_dashboard.js'
import * as studentTab from './students.js'
import * as util from './helpers.js'

var playerMap = null

var renderListByAlert = true
// var selected = null

// TODO: show selected in list
function renderAlertView(selected) {
    if (renderListByAlert) {
        const alertsByAlert = dashboard.getAlertsByAlert()
        util.renderAlertsPanel("alert-view", selected, alertsByAlert[selected], (v) => playerMap[v], (student) => {
            $("#students-tab").click()
            studentTab.showSingleStudentView(student)
        })
        return
    }

    const alertsByStudent = dashboard.getAlertsByStudent()
    util.renderAlertsPanel("alert-view", playerMap[selected], alertsByStudent[selected], null, (alert) => {
        $("#students-tab").click()
        studentTab.showSingleStudentView(selected)
    })
}

function renderAlertList() {
    if (renderListByAlert) {
        const alertsByAlert = dashboard.getAlertsByAlert()
        util.renderList("alert-list", Object.keys(alertsByAlert), (alert) => {
            const content = document.createElement("div")
            content.className = "content"
            content.textContent = alert
            content.onclick = () => renderAlertView(alert)
            return content
        }, "selection celled")
        return
    }

    const alertsByStudent = dashboard.getAlertsByStudent()
    util.renderList("alert-list", Object.keys(alertsByStudent), (student) => {
        const content = document.createElement("div")
        content.className = "content"
        content.textContent = playerMap[student]
        content.onclick = () => renderAlertView(student)
        return content
    }, "selection celled")
}

function handleViewByStudentCheckbox() {
    renderListByAlert = !$("#alerts-view-by-student-toggle").is(":checked")
    const alerts = renderListByAlert ? dashboard.getAlertsByAlert() : dashboard.getAlertsByStudent()
    renderAlertList()
    renderAlertView(Object.keys(alerts)[0])
}

export function initializeTab(players) {
    playerMap = players
    
    $("#alerts-view-by-student-toggle").change(handleViewByStudentCheckbox)
    $("#alert-list-customize-btn").click(() => $("#filter-settings-tab").click())
    handleViewByStudentCheckbox()
}