import { TABS } from './constants.js'
import { showMetricsOverview } from './metrics-overview.js'
import { showRadarCharts } from './radar-charts.js'

var activeTab = null

function handleTabSwitch(tab) {
    if (activeTab === tab) return 
    
    activeTab = tab
    if (activeTab === TABS.METRICS) {
        showMetricsOverview()
    } else if (activeTab === TABS.RADAR_CHART) {
        showRadarCharts()
    }
}

$(document).ready(() => {
    $("#nav-metrics").click(() => handleTabSwitch(TABS.METRICS))
    $("#nav-radar").click(() => handleTabSwitch(TABS.RADAR_CHART))
    handleTabSwitch(TABS.METRICS)
})