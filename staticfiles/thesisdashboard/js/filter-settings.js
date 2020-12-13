import * as dashboard from './thesis_dashboard.js'
import * as util from './helpers.js'

const FILTER_DROPDOWN_OPTIONS = {
    "Edit": showFilterWorkspace,
    "Rename": renameFilter,
    "Delete": deleteFilter,
}

var workspace = null 
var activeFilterForEditing = null

function initializeDropdowns() {
    $('.ui .dropdown').dropdown({ action: 'select' })
}

function initializeWorkspaceButtons() {
    $("#filter-settings-add-btn").click(() => {
        addNewFilter(prompt("Please provide a name for the new filter.", "test"))
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
        return parsedCode
    } catch (err) {
        if (err instanceof SyntaxError) {
            alert("Incomplete filter!")
            return null
        }
    }
}

function populateFiltersList() {
    // TODO: add active coloring
    util.renderList("filter-settings-filter-list", dashboard.getFilterKeys(), (filterName) => {
        const content = document.createElement("div")
        content.className = "content"
        
        const dropdown = document.createElement("div")
        dropdown.className = "ui dropdown"
        dropdown.innerHTML = `<div class="text">${filterName}</div><i class="dropdown icon"></i>`
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
    }, "selection celled")
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

function renameFilter(filterName) {
    const filterData = window.localStorage.getItem(filterName)
    const newFilterName = prompt("Please enter the new filter name.", "test")
    window.localStorage.removeItem(filterName)
    window.localStorage.setItem(newFilterName, filterData)
    dashboard.setFilter(newFilterName, dashboard.getFilter(filterName))
    dashboard.removeFilter(filterName)
    populateFiltersList()
}

function saveFilter(filterName) {
    const filter = checkWorkspaceValidity()
    if (!filter) return

    const xml = Blockly.Xml.workspaceToDom(workspace)
    const xmlString = Blockly.Xml.domToText(xml)
    window.localStorage.setItem(filterName, xmlString)

    dashboard.setFilter(filterName, filter)
    populateFiltersList()
}

function deleteFilter(filterName) {
    window.localStorage.removeItem(filterName)
    dashboard.removeFilter(filterName)
    hideFilterWorkspace()
    populateFiltersList()
}

export function initializeTab() {
    populateFiltersList()
    initializeWorkspaceButtons()
}