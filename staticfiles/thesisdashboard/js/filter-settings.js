import * as dashboard from './thesis_dashboard.js'
import * as overviewTab from './overview.js'
import * as studentsTab from './students.js'
import * as alertsTab from './alerts.js'
import * as util from './helpers.js'

const FILTER_DROPDOWN_OPTIONS = {
    "Edit": showFilterWorkspace,
    "Rename": renameFilter,
    "Delete": deleteFilter,
}

var workspace = null 
var activeFilterForEditing = null

function initializeDropdowns() {
    $('.setting-dropdown').dropdown({ action: 'select' })
}

function initializeWorkspaceButtons() {
    $("#filter-settings-add-btn").click(() => {
        showFilterNameModal("Add New Filter", "Add Filter", "New Filter", (newFilterName) => {
            addNewFilter(newFilterName)
        })
    })

    $("#cancel-btn").click(() => {
        hideFilterWorkspace()
    })

    $("#save-btn").click(() => {
        saveFilter(activeFilterForEditing)
    })

    $("#delete-btn").click(() => {
        deleteFilter(activeFilterForEditing)
    })

    $("#clear-wksp-btn").click(() => {
        resetWorkspace()
    })
}

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
}

function resetWorkspace() {
    clearWorkspace()
    Blockly.Xml.domToWorkspace(document.getElementById('defaultWorkspaceBlocks'), workspace)
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

function populateFiltersList() {
    util.renderList("filter-settings-filter-list", dashboard.getFilterKeys(), (filterName) => {
        const content = document.createElement("div")
        content.className = "content"
        
        const dropdown = document.createElement("div")
        dropdown.className = "ui fluid dropdown setting-dropdown"
        dropdown.innerHTML = `<div class="text filter-settings-dropdown-text">${filterName}</div><i class="dropdown icon filter-settings-dropdown-icon"></i>`
        content.appendChild(dropdown)

        const menu = document.createElement("div")
        menu.className = "menu"
        dropdown.appendChild(menu)

        for (let key of Object.keys(FILTER_DROPDOWN_OPTIONS)) {
            const item = document.createElement("div")
            item.className = "item"
            item.textContent = key
            item.onclick = () => FILTER_DROPDOWN_OPTIONS[key](filterName)
            menu.appendChild(item)
        }

        return content
    }, "selection divided", "filter-type", (alert) => dashboard.getFilterIcon(alert), (alert) => dashboard.getFilterTooltip(alert), true)
    initializeDropdowns()
}

function showFilterWorkspace(filterName) {
    $("#filter-settings-wksp-placeholder").hide()
    $("#filter-settings-wksp").show()
    $("#filter-settings-wksp-filter-name").text(filterName)
    activeFilterForEditing = filterName

    if (!workspace) initializeBlocklyWorkspace()

    if (window.localStorage.getItem(filterName)) {
        loadFilterToWorkspace(filterName)
    } else {
        resetWorkspace()
    }
}

function hideFilterWorkspace() {
    $("#filter-settings-wksp-placeholder").show()
    $("#filter-settings-wksp").hide()
    activeFilterForEditing = null
}

function loadFilterToWorkspace(filterName) {
    clearWorkspace()
    const xmlString = window.localStorage.getItem(filterName)
    const xml = Blockly.Xml.textToDom(xmlString)
    Blockly.Xml.domToWorkspace(xml, workspace)
}

function addNewFilter(filterName) {
    showFilterWorkspace(filterName)
}

function showFilterNameModal(modalTitle, buttonText, initialFilterName, onApproveFunction) {
    $("#filter-name-modal-title").text(modalTitle)
    $("#filter-name-modal-btn").text(buttonText)
    $("#filter-name-modal-input").val(initialFilterName)
    $("#filter-name-modal").modal({
        onApprove: () => onApproveFunction($("#filter-name-modal-input").val())
    }).modal("show")
}

function updateFiltersAcrossDashboard() {
    dashboard.handleFilterChange()
    overviewTab.handleFilterChange()
    studentsTab.handleFilterChange()
    alertsTab.handleFilterChange()
}

function renameFilter(filterName) {
    hideFilterWorkspace()
    const filterData = window.localStorage.getItem(filterName)
    showFilterNameModal(`Rename ${filterName}`, "Rename", filterName, (newFilterName) => {
        window.localStorage.removeItem(filterName)
        window.localStorage.setItem(newFilterName, filterData)
        dashboard.setFilter(newFilterName, dashboard.getFilter(filterName))
        dashboard.removeFilter(filterName)
        populateFiltersList()
    })
    updateFiltersAcrossDashboard()
}

function saveFilter(filterName) {
    const filter = checkWorkspaceValidity()
    if (!filter) return

    const xml = Blockly.Xml.workspaceToDom(workspace)
    const xmlString = Blockly.Xml.domToText(xml)
    window.localStorage.setItem(filterName, xmlString)

    dashboard.setFilter(filterName, filter)
    populateFiltersList()
    updateFiltersAcrossDashboard()
}

function deleteFilter(filterName) {
    hideFilterWorkspace()
    window.localStorage.removeItem(filterName)
    dashboard.removeFilter(filterName)
    hideFilterWorkspace()
    populateFiltersList()
    updateFiltersAcrossDashboard()
}

export function initializeTab() {
    populateFiltersList()
    initializeWorkspaceButtons()
}