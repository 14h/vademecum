fetch("https://www.vademecum.org/med/de05/search-results", {
    "headers": {
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://www.vademecum.org/med/de05/search?at=med"
    },
    "body": "search=a&area=med",
    "method": "POST"
}).then(console.log).catch(console.log);