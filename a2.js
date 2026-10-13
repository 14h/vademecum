fetch("https://www.vademecum.org/med/de05/search-results", {
    "headers": {
        "accept": "*/*",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://www.vademecum.org/med/de05/g0034"
    },
    "body": "search=a&area=idc",
    "method": "POST"
});