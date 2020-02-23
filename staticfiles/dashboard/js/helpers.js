export function callAPI(url) {
    return new Promise((resolve, reject) => {
        fetch(url, { credentials: "same-origin" })
            .then(response => {
                resolve(response.json())
            })
    })
}

export function fetchPage(url, shouldFetchAll = false, pagesToFetch = 1) {
    return new Promise((resolve, reject) => {
        if (!url) resolve([])

        callAPI(url)
            .then(data => {
                if (data.next && (shouldFetchAll || pagesToFetch > 1)) {
                    fetchPage(data.next, shouldFetchAll, pagesToFetch - 1)
                        .then(pageResult => {
                            resolve({
                                results: [...data.results, ...pageResult.results],
                                nextPage: pageResult.nextPage
                            })
                        })
                } else {
                    resolve({
                        results: data.results,
                        nextPage: data.next
                    })
                }
            })
            .catch(error => {
                console.log('Encountered error during fetch: ', error)
                resolve({
                    results: [],
                    nextPage: url
                })
            })
    })
}

export function toEchartsData(data, keyNameMap = {}) {
    const formattedData = []
    for (let [key, value] of Object.entries(data)) {
        formattedData.push({name: keyNameMap[key] || key, value: value})
    }
    return formattedData
}

export function createBarChart(data, divId, title = null, xAxisData = null, showLegend = false) {
    const barChart = echarts.init(document.getElementById(divId))
    const options = {
        tooltip: {},
        calculable: true,
        xAxis: {
            data: xAxisData ? xAxisData : [...Array(data.length).keys()].map(i => i + 1)
        },
        yAxis: {},
        series: {
            name: title,
            type: "bar",
            height: '80%',
            width: '80%',
            top: '10%',
            left: '10%',
            label: { show: true, position: "inside" },
            data: data
        }
    }

    if (title) {
        options.title = {
            textStyle: {
                fontSize: 14
            },
            text: title,
            left: "center",
            triggerEvent: true
        }
    }

    if (showLegend) {
        options.legend = {
            data: Object.values(keyNameMap)
        }
    }

    barChart.setOption(options)
}


export function formatPlurals(text, value) {
    return text + `${value == 1 ? "" : "s"}`
}

export function formatTime(timeInSeconds) {
    return timeInSeconds > 60 ? `${Math.floor(timeInSeconds / 60)}m ${(timeInSeconds % 60).toFixed()}s` : `${timeInSeconds.toFixed()}s`
}