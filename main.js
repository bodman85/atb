/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/cache-manager.js":
/*!******************************!*\
  !*** ./src/cache-manager.js ***!
  \******************************/
/***/ ((module) => {

eval("const LEADING_INSTRUMENT = \"leadingInstrument\";\r\nconst LED_INSTRUMENT = \"ledInstrument\";\r\n\r\nconst LEADING_INSTRUMENTS = \"leadingInstruments\";\r\nconst LED_INSTRUMENTS = \"ledInstruments\";\r\n\r\n\r\nfunction getInstruments(key) {\r\n    let item = window.localStorage.getItem(key);\r\n    if (item) {\r\n        return JSON.parse(item);\r\n    }\r\n    return [];\r\n}\r\n\r\nfunction cacheDataRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments.push(document.getElementById(LEADING_INSTRUMENT+rn).value);\r\n    ledInstruments.push(document.getElementById(LED_INSTRUMENT+rn).value);\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction cacheInstruments(leadingInstruments, ledInstruments) {\r\n    cache(LEADING_INSTRUMENTS, leadingInstruments);\r\n    cache(LED_INSTRUMENTS, ledInstruments);\r\n}\r\n\r\nfunction cache(key, value) {\r\n    window.localStorage.setItem(key, JSON.stringify(value));\r\n}\r\n\r\nfunction selectCachedValues(rn) {\r\n    document.getElementById(LEADING_INSTRUMENT + rn).value = getInstruments(LEADING_INSTRUMENTS)[rn - 1];\r\n    document.getElementById(LED_INSTRUMENT + rn).value = getInstruments(LED_INSTRUMENTS)[rn - 1];\r\n}\r\n\r\nfunction replaceCachedRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments[rn - 1] = document.getElementById(LEADING_INSTRUMENT + rn).value;\r\n    ledInstruments[rn - 1] = document.getElementById(LED_INSTRUMENT + rn).value;\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction removeCachedRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments.splice(rn - 1, 1);\r\n    ledInstruments.splice(rn - 1, 1);\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction removeAllCachedRows() {\r\n    cacheInstruments([], []);\r\n}\r\n\r\nfunction getCachedRowsCount() {\r\n    return getInstruments(LEADING_INSTRUMENTS).length;\r\n}\r\n\r\nmodule.exports = {\r\n    getInstruments: getInstruments,\r\n    cache: cache,\r\n    selectCachedValues: selectCachedValues,\r\n    cacheDataRow: cacheDataRow,\r\n    replaceCachedRow: replaceCachedRow,\r\n    removeCachedRow: removeCachedRow,\r\n    removeAllCachedRows: removeAllCachedRows,\r\n    getCachedRowsCount: getCachedRowsCount\r\n}\n\n//# sourceURL=webpack://atb/./src/cache-manager.js?");

/***/ }),

/***/ "./src/data-manager.js":
/*!*****************************!*\
  !*** ./src/data-manager.js ***!
  \*****************************/
/***/ ((module) => {

eval("const SERVER_URL = \"https://dapi.binance.com/dapi/v1/\"\r\n\r\nconst ALL_SYMBOLS = \"exchangeInfo\";\r\nconst SYMBOL_PRICE = \"ticker/price\";\r\nconst BEST_PRICES = \"ticker/bookTicker\";\r\n\r\nlet cachedSymbols = [];\r\n\r\nasync function getAllSymbols() {\r\n    if (cachedSymbols.length === 0) {\r\n        let response = await fireGetRequestTo(ALL_SYMBOLS);\r\n        cachedSymbols = response.symbols;\r\n    } \r\n    return cachedSymbols;\r\n}\r\n\r\nasync function fireGetRequestTo(path) {\r\n    let url = SERVER_URL + path;\r\n    let requestHeaders = new Headers();\r\n    requestHeaders.append('Content-Type', 'application/json');\r\n    //if (token = await tokenManager.getValidAuthToken()) {\r\n    //    requestHeaders.append('Authorization', `Bearer ${token}`);\r\n    //}\r\n    const params = {\r\n        method: 'GET',\r\n        headers: requestHeaders,\r\n    };\r\n    const response = await fetch(url, params);\r\n    const json = await response.json();\r\n    return json;\r\n}\r\n\r\nfunction requestPrice(symbol, callback) {\r\n    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nfunction requestBestPrices(symbol, callback) {\r\n    let path = `${BEST_PRICES}?symbol=${symbol}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nasync function fireGetRequestWithCallback(path, callback) {\r\n    let url = SERVER_URL + path;\r\n    let xhttp = new XMLHttpRequest();\r\n    xhttp.onreadystatechange = function () {\r\n        if (this.readyState == 4 && this.status == 200) {\r\n            callback(JSON.parse(xhttp.responseText));\r\n        }\r\n    };\r\n    xhttp.open(\"GET\", url, true);\r\n    //xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);\r\n    xhttp.send();\r\n}\r\n\r\nmodule.exports = {\r\n    getAllSymbols: getAllSymbols,\r\n    requestPrice: requestPrice,\r\n    requestBestPrices: requestBestPrices\r\n}\r\n\r\n\r\n\n\n//# sourceURL=webpack://atb/./src/data-manager.js?");

/***/ }),

/***/ "./src/main.js":
/*!*********************!*\
  !*** ./src/main.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("var dataManager = __webpack_require__(/*! ./data-manager */ \"./src/data-manager.js\");\r\nvar uiUtils = __webpack_require__(/*! ./ui-utils */ \"./src/ui-utils.js\");\r\nvar cacheManager = __webpack_require__(/*! ./cache-manager */ \"./src/cache-manager.js\");\r\n\r\nlet rowNumber;\r\n\r\nwindow.onload = async function () {\r\n    rowNumber = 0;\r\n    loadState();\r\n    document.getElementById(\"addNewPairButton\").addEventListener(\"click\", function () { addDataRow(cacheManager.cacheDataRow); });\r\n    document.getElementById(\"removeAllButton\").addEventListener(\"click\", removeAllDataRows);\r\n    setInterval(pollPricesAndRecomputeDeltas, 1000);\r\n}\r\n\r\nasync function loadState() {\r\n    for (let rn = 0; rn < cacheManager.getCachedRowsCount(); rn++) {\r\n        await addDataRow(cacheManager.selectCachedValues);\r\n    }\r\n}\r\n\r\nasync function addDataRow(callback) {\r\n    rowNumber++;\r\n    createRow();\r\n    await initRow(callback);\r\n    document.getElementById('removeAllButton').classList.remove('invisible');\r\n}\r\n\r\nasync function initRow(callback) {\r\n    uiUtils.fillDropdownWithData(`leadingInstrument${rowNumber}`, await dataManager.getAllSymbols());\r\n    uiUtils.fillDropdownWithData(`ledInstrument${rowNumber}`, await dataManager.getAllSymbols());\r\n    if (callback && typeof callback === \"function\") {\r\n        callback(rowNumber);\r\n    }\r\n}\r\n\r\nfunction createRow() {\r\n    let row = document.createElement(\"div\");\r\n    row.classList.add('row');\r\n    row.classList.add('mb-1');\r\n    row.appendChild(createColumn(`leadingInstrument${rowNumber}`, \"select\"));\r\n    row.appendChild(createColumn(`leadingPrice${rowNumber}`, \"input\", \"text\"));\r\n    row.appendChild(createColumn(`ledInstrument${rowNumber}`, \"select\"));\r\n    row.appendChild(createColumn(`ledPrice${rowNumber}`, \"input\", \"text\"));\r\n    row.appendChild(createColumn(`deltaPcnt${rowNumber}`, \"input\", \"text\"));\r\n    row.appendChild(createColumn(`deltaUsd${rowNumber}`, \"input\", \"text\"));\r\n    row.appendChild(createColumn(`arrowButton${rowNumber}`, \"button\", \"button\", \"arrow\"));\r\n    row.appendChild(createColumn(`removeButton${rowNumber}`, \"button\", \"button\", \"remove\"));\r\n    document.getElementById(\"dataGrid\").appendChild(row);\r\n}\r\n\r\nfunction createColumn(id, element, type, value) {\r\n    let div = document.createElement(\"div\");\r\n    div.classList.add(\"col\");\r\n    var control = document.createElement(element);\r\n    control.id = id;\r\n    if (!type) {\r\n        control.classList.add(\"form-select\");\r\n        control.addEventListener(\"change\", onChange);\r\n    } else if (type === 'text') {\r\n        control.type = type;\r\n        control.classList.add(\"form-control\");\r\n    } else if (type === 'button') {\r\n        control.type = type;\r\n        control.classList.add(\"btn\");\r\n        control.classList.add(\"btn-secondary\");\r\n        switch (value) {\r\n            case \"arrow\":\r\n                div.classList.add(\"col-1\");\r\n                control.appendChild(createFaIcon(\"fa-arrow-right\"));\r\n                control.addEventListener(\"click\", showBestPrices);\r\n                break;\r\n            case \"remove\":\r\n                div.classList.add(\"col-1\");\r\n                control.appendChild(createFaIcon(\"fa-trash\"));\r\n                control.addEventListener(\"click\", removeDataRow);\r\n                break;\r\n        }\r\n    }\r\n    div.appendChild(control);\r\n    return div;\r\n}\r\n\r\nfunction createFaIcon(name) {\r\n    let icon = document.createElement('span')\r\n    icon.classList.add(\"fa\");\r\n    icon.classList.add(name);\r\n    return icon;\r\n}\r\n\r\nfunction onChange() {\r\n    cacheManager.replaceCachedRow(getRowNumberFrom(this.id));\r\n    window.stop();\r\n}\r\n\r\nfunction showBestPrices() {\r\n    let rn = getRowNumberFrom(this.id);\r\n    let leadingSymbol = document.getElementById(`leadingInstrument${rn}`).value;\r\n    let ledSymbol = document.getElementById(`ledInstrument${rn}`).value;\r\n    window.location.href = `best_prices.html?leadingInstrument=${leadingSymbol}&ledInstrument=${ledSymbol}`;\r\n}\r\n\r\nfunction removeDataRow() {\r\n    uiUtils.removeRowWithElement(this.id);\r\n    let removedRowNumber = getRowNumberFrom(this.id);\r\n    cacheManager.removeCachedRow(removedRowNumber);\r\n    recalculateControlIds(removedRowNumber + 1, rowNumber);\r\n    --rowNumber;\r\n}\r\n\r\nfunction getRowNumberFrom(id) {\r\n    return parseInt(id.match(/\\d+$/)[0], 10);\r\n}\r\n\r\nfunction removeAllDataRows() {\r\n    rowNumber = 0;\r\n    cacheManager.removeAllCachedRows();\r\n    uiUtils.clearDataGrid(this.id, \"dataGrid\");\r\n}\r\n\r\nfunction recalculateControlIds(start, total) {\r\n    for (let rn = start; rn <= total; rn++) {\r\n        document.getElementById(`leadingInstrument${rn}`).id = `leadingInstrument${rn - 1}`;\r\n        document.getElementById(`ledInstrument${rn}`).id = `ledInstrument${rn - 1}`;\r\n        document.getElementById(`leadingPrice${rn}`).id = `leadingPrice${rn - 1}`;\r\n        document.getElementById(`ledPrice${rn}`).id = `ledPrice${rn - 1}`;\r\n        document.getElementById(`deltaPcnt${rn}`).id = `deltaPcnt${rn - 1}`;\r\n        document.getElementById(`deltaUsd${rn}`).id = `deltaUsd${rn - 1}`;\r\n        document.getElementById(`removeButton${rn}`).id = `removeButton${rn - 1}`;\r\n        document.getElementById(`arrowButton${rn}`).id = `arrowButton${rn - 1}`;\r\n    }\r\n}\r\n\r\nfunction pollPricesAndRecomputeDeltas() {\r\n    for (let rn = rowNumber; rn > 0; rn--) {\r\n        let leadingInstrumentSelect = document.getElementById(`leadingInstrument${rn}`);\r\n        if (leadingInstrumentSelect) {\r\n            dataManager.requestPrice(leadingInstrumentSelect.value, (response) => {\r\n                let leadingInstrumentPriceTextBox = document.getElementById(`leadingPrice${rn}`);\r\n                let ledInstrumentPriceTextBox = document.getElementById(`ledPrice${rn}`);\r\n                let deltaUsdTextBox = document.getElementById(`deltaUsd${rn}`);\r\n                if (response[0] && leadingInstrumentPriceTextBox) {\r\n                    leadingInstrumentPriceTextBox.value = response[0].price;\r\n                    deltaUsdTextBox.value = (parseFloat(ledInstrumentPriceTextBox.value - leadingInstrumentPriceTextBox.value).toFixed(4));\r\n                }\r\n            });\r\n        }\r\n        let ledInstrumentSelect = document.getElementById(`ledInstrument${rn}`);\r\n        if (ledInstrumentSelect) {\r\n            dataManager.requestPrice(ledInstrumentSelect.value, (response) => {\r\n                let leadingInstrumentPriceTextBox = document.getElementById(`leadingPrice${rn}`);\r\n                let ledInstrumentPriceTextBox = document.getElementById(`ledPrice${rn}`);\r\n                let deltaPcntTextBox = document.getElementById(`deltaPcnt${rn}`);\r\n                if (response[0] && leadingInstrumentPriceTextBox && ledInstrumentPriceTextBox) {\r\n                    ledInstrumentPriceTextBox.value = response[0].price;\r\n                    deltaPcntTextBox.value = parseFloat(((ledInstrumentPriceTextBox.value / leadingInstrumentPriceTextBox.value - 1) * 100).toFixed(4));\r\n                }\r\n            });\r\n        }\r\n    }\r\n}\r\n\n\n//# sourceURL=webpack://atb/./src/main.js?");

/***/ }),

/***/ "./src/ui-utils.js":
/*!*************************!*\
  !*** ./src/ui-utils.js ***!
  \*************************/
/***/ ((module) => {

eval("function clearDataGrid(buttonId, dataGridId) {\r\n    document.getElementById(buttonId).classList.toggle('invisible');\r\n    document.getElementById(dataGridId).innerHTML = '';\r\n}\r\n\r\nfunction removeRowWithElement(id) {\r\n    let row = document.getElementById(id).parentNode.parentNode;\r\n    row.remove();\r\n}\r\n\r\nfunction fillDropdownWithData(id, symbols) {\r\n    let dropdown = document.getElementById(id);\r\n    removeAllChildNodes(dropdown);\r\n    for (let s of symbols) {\r\n        dropdown.appendChild(createOption(s.symbol, s.symbol));\r\n    }\r\n    sortOptions(dropdown);\r\n}\r\n\r\nfunction removeAllChildNodes(parent) {\r\n    while (parent.firstChild) {\r\n        parent.removeChild(parent.firstChild);\r\n    }\r\n}\r\n\r\nfunction createOption(label, value) {\r\n    var option = document.createElement(\"option\");\r\n    option.setAttribute(\"value\", value);\r\n    option.innerHTML = label;\r\n    return option;\r\n}\r\n\r\nfunction sortOptions(dropdown) {\r\n    var tmpAry = new Array();\r\n    for (var i = 0; i < dropdown.options.length; i++) {\r\n        tmpAry[i] = new Array();\r\n        tmpAry[i][0] = dropdown.options[i].text;\r\n        tmpAry[i][1] = dropdown.options[i].value;\r\n    }\r\n    tmpAry.sort();\r\n    clearOptions(dropdown);\r\n    for (var i = 0; i < tmpAry.length; i++) {\r\n        var op = new Option(tmpAry[i][0], tmpAry[i][1]);\r\n        dropdown.options[i] = op;\r\n    }\r\n    return;\r\n}\r\n\r\nfunction clearOptions(element) {\r\n    element.options.length = 0;\r\n}\r\n\r\nmodule.exports = {\r\n    removeRowWithElement: removeRowWithElement,\r\n    fillDropdownWithData: fillDropdownWithData,\r\n    clearDataGrid: clearDataGrid\r\n}\n\n//# sourceURL=webpack://atb/./src/ui-utils.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/main.js");
/******/ 	
/******/ })()
;