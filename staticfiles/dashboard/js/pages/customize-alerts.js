import * as portal from './portal.js'

var workspace = null
var previousLoadedFilter = null

function initializeBlocklyWorkspace() {
    workspace = Blockly.inject('blockly-container', {
        toolbox: document.getElementById('toolbox'),
        grid: {
            spacing: 20,
            length: 20,
            colour: '#ccc',
            snap: true
        },
        theme: {
            'startHats': true
        },
        renderer: 'thrasos'
    })
}

function clearWorkspace() {
    workspace.clear()
    $("#create-filter-name").val("")
}

function checkWorkspaceValidity() {
    if (!workspace.allInputsFilled()) {
        alert("bad")
        return null
    }
    const code = Blockly.JavaScript.workspaceToCode(workspace)

    try {
        const parsedCode = JSON.parse(code)
        if (parsedCode instanceof Array) {
            alert("You need a header!")
            return null
        }
        const xml = Blockly.Xml.workspaceToDom(workspace)
        const xmlString = Blockly.Xml.domToText(xml)
        console.log(xmlString)
        return parsedCode
    } catch (err) {
        if (err instanceof SyntaxError) {
            alert("Incomplete filter!")
            return null
        }
    }
}


function loadFilterToWorkspace(filterName) {
    previousLoadedFilter = filterName
    clearWorkspace()
    const xmlString = window.localStorage.getItem(filterName)
    const xml = Blockly.Xml.textToDom(xmlString)
    Blockly.Xml.domToWorkspace(xml, workspace)
    $("#create-filter-name").val(filterName)
}

function renameFilter(filterName, newFilterName) {
    const filterData = window.localStorage.getItem(filterName)
    window.localStorage.removeItem(filterName)
    window.localStorage.setItem(newFilterName, filterData)
    portal.setFilter(newFilterName, portal.getFilter(filterName))
    portal.removeFilter(filterName)
}

function saveFilter(filterName) {
    if (previousLoadedFilter && filterName !== previousLoadedFilter) {
        renameFilter(previousLoadedFilter, filterName)
    }

    const filter = checkWorkspaceValidity()
    if (!filter) return

    const xml = Blockly.Xml.workspaceToDom(workspace)
    const xmlString = Blockly.Xml.domToText(xml)
    window.localStorage.setItem(filterName, xmlString)

    portal.setFilter(filterName, filter)
    renderAlertBoxes()
    updateAlerts()
    clearWorkspace()
}

function deleteFilter(filterName) {
    clearWorkspace()
    window.localStorage.removeItem(filterName)
    portal.removeFilter(filterName)
    renderAlertBoxes()
    updateAlerts()
}

function renderAlertBoxes() {
    const alertList = document.getElementById("customize-alerts-list")
    alertList.innerHTML = ""

    const alerts = portal.getFilterKeys()
    for (let alert of alerts) {
        const alertBox = document.createElement("div")
        alertBox.className = "customize-alert-box"
        alertBox.style.borderColor = portal.getColorForFilter(alert)
        alertList.appendChild(alertBox)

        const alertBoxOptions = document.createElement("div")
        alertBoxOptions.className = "customize-alert-box-options"
        alertBox.appendChild(alertBoxOptions)

        const editLink = document.createElement("a")
        editLink.textContent = "Edit"
        editLink.className = "customize-alert-edit-link"
        editLink.onclick = function() {
            loadFilterToWorkspace(alert)
        }
        alertBoxOptions.appendChild(editLink)

        const deleteButton = document.createElement("button")
        deleteButton.className = "close"
        deleteButton.type = "button"
        deleteButton.innerHTML = '<span aria-hidden="true">&times;</span>'
        deleteButton.onclick = function() {
            deleteFilter(alert)
        }
        alertBoxOptions.appendChild(deleteButton)

        const alertBoxLabel = document.createElement("span")
        alertBoxLabel.style.fontStyle = "italic"
        alertBoxLabel.textContent = `"${alert}"`
        alertBox.appendChild(alertBoxLabel)
    }
}

function updateAlerts() {
    portal.renderAlertsDisplay()
}

export function showCustomizeTab() {
    if (!workspace) {
        initializeBlocklyWorkspace()

        $("#create-filter-btn").click(function() {
            if (!$("#create-filter-name").val()) {
                alert("Please input filter name!")
                return
            }
            saveFilter($("#create-filter-name").val())
        })
    }
    renderAlertBoxes()
}