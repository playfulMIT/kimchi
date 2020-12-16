import * as dashboard from './thesis_dashboard.js'
import * as studentTab from './students.js'
import * as util from './helpers.js'

var playerMap = null

var renderListByAlert = true

export function handleFilterChange() {
    handleViewByStudentCheckbox()
}

function renderAlertView(selected) {
    if (renderListByAlert) {
        const alertsByAlert = dashboard.getAlertsByAlert()
        $("#alert-view-header").text(selected)
        util.renderAlertsPanel("alert-view-container", alertsByAlert[selected], (v) => playerMap[v], (student) => {
            $("#students-tab").click()
            studentTab.showSingleStudentView(student)
        })
        return
    }

    const alertsByStudent = dashboard.getAlertsByStudent()
    $("#alert-view-header").text(playerMap[selected])
    util.renderAlertsPanel("alert-view-container", alertsByStudent[selected], null, (alert) => {
        $("#students-tab").click()
        studentTab.showSingleStudentView(selected)
    })
}

function renderAlertList() {
    if (renderListByAlert) {
        const alertsByAlert = dashboard.getAlertsByAlert()
        util.renderList("alert-list", Object.keys(alertsByAlert).sort((a, b) => alertsByAlert[b].length - alertsByAlert[a].length), (alert) => {
            const content = document.createElement("div")
            content.className = "content"
            content.style.display = "flex"
            content.style.alignItems = "center"
            content.innerHTML = `<div class="ui orange circular label" style="align-self: center;">${alertsByAlert[alert].length}</div><div class="alert-list-item">${alert}</div>`
            content.onclick = () => renderAlertView(alert)
            return content
        }, "selection divided", null, null, null, true)
        return
    }

    const alertsByStudent = dashboard.getAlertsByStudent()
    util.renderList("alert-list", Object.keys(alertsByStudent).sort((a, b) => alertsByStudent[b].length - alertsByStudent[a].length), (student) => {
        const content = document.createElement("div")
        content.className = "content"
        content.style.display = "flex"
        content.style.alignItems = "center"
        content.innerHTML = `<div class="ui orange circular label" style="align-self: center;">${alertsByStudent[student].length}</div><div class="alert-list-item">${playerMap[student]}</div>`
        content.onclick = () => renderAlertView(student)
        return content
    }, "selection divided", null, null, null, true)
}

function handleViewByStudentCheckbox() {
    renderListByAlert = !$("#alerts-view-by-student-toggle").is(":checked")
    const alerts = renderListByAlert ? dashboard.getAlertsByAlert() : dashboard.getAlertsByStudent()
    renderAlertList()
    renderAlertView(Object.keys(alerts).sort((a, b) => alerts[b].length - alerts[a].length)[0])
    $("#alert-list > .list-item:first-child").addClass("active")
}

export function initializeTab(players) {
    playerMap = players
    
    $("#alerts-view-by-student-toggle").change(handleViewByStudentCheckbox)
    $("#alert-list-customize-btn").click(() => $("#filter-settings-tab").click())
    handleViewByStudentCheckbox()
}