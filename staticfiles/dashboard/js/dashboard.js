import { TABS } from './constants.js'
import { showMetricsOverview } from './metrics-overview.js'

var activeTab = null

function handleTabSwitch(tab) {
    activeTab = tab
    if (activeTab === TABS.METRICS) {
        showMetricsOverview()
    }
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    handleTabSwitch(TABS.METRICS)
})