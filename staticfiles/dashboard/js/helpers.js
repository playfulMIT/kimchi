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