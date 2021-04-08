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

/***/ "./src/best_prices.js":
/*!****************************!*\
  !*** ./src/best_prices.js ***!
  \****************************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("var dataManager = __webpack_require__(/*! ./data-manager */ \"./src/data-manager.js\");\r\nvar cacheManager = __webpack_require__(/*! ./cache-manager */ \"./src/cache-manager.js\");\r\nvar uiUtils = __webpack_require__(/*! ./ui-utils */ \"./src/ui-utils.js\");\r\n\r\nwindow.onload = async function () {\r\n    const urlParams = new URLSearchParams(window.location.search);\r\n\r\n    document.getElementById('bpTargetDeltaPcnt1').addEventListener('input', fixTargetSpread);\r\n    document.getElementById('bpTargetDeltaUsd1').addEventListener('input', fixTargetSpread);\r\n\r\n    document.getElementById('bpTargetDeltaPcnt2').addEventListener('input', fixTargetSpread);\r\n    document.getElementById('bpTargetDeltaUsd2').addEventListener('input', fixTargetSpread);\r\n    \r\n\r\n    let leadingInstrumentSymbol = urlParams.get('leadingInstrument');\r\n    let ledInstrumentSymbol = urlParams.get('ledInstrument');\r\n\r\n    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;\r\n    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;\r\n\r\n    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;\r\n    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;\r\n\r\n    if (cacheManager.isAuthorized()) {\r\n        uiUtils.showElement('buySpreadButton');\r\n        uiUtils.showElement('sellSpreadButton');\r\n    } else {\r\n        uiUtils.hideElement('buySpreadButton');\r\n        uiUtils.hideElement('sellSpreadButton');\r\n    }\r\n\r\n    setInterval(pollBestPricesAndRecomputeDeltas, 1000, leadingInstrumentSymbol, ledInstrumentSymbol);\r\n}\r\n\r\nlet targetSpreadFixedInPcnt1 = true;\r\nlet targetSpreadFixedInPcnt2 = true;\r\nfunction fixTargetSpread() {\r\n    switch (this.id) {\r\n        case 'bpTargetDeltaPcnt1':\r\n            targetSpreadFixedInPcnt1 = true;\r\n            break;\r\n        case 'bpTargetDeltaUsd1':\r\n            targetSpreadFixedInPcnt1 = false;\r\n        case 'bpTargetDeltaPcnt2':\r\n            targetSpreadFixedInPcnt2 = true;\r\n            break;\r\n        case 'bpTargetDeltaUsd2':\r\n            targetSpreadFixedInPcnt2 = false;\r\n    }\r\n}\r\n\r\nfunction pollBestPricesAndRecomputeDeltas(leadingInstrumentSymbol, ledInstrumentSymbol) {\r\n    dataManager.requestBestPrices((response) => {\r\n        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));\r\n\r\n        let leadingBidPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice);\r\n        let leadingOfferPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice);\r\n\r\n        let ledBidPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice);\r\n        let ledOfferPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice);\r\n\r\n        let deltaPcnt1 = parseFloat(((ledOfferPrice / leadingBidPrice - 1) * 100).toFixed(4));\r\n        let deltaUsd1 = parseFloat(ledOfferPrice - leadingBidPrice).toFixed(4);\r\n\r\n        let deltaPcnt2 = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4));\r\n        let deltaUsd2 = parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4);\r\n\r\n        document.getElementById(`bpDeltaPcnt1`).value = deltaPcnt1 + ' %';\r\n        document.getElementById(`bpDeltaUsd1`).value = deltaUsd1 + ' $';\r\n\r\n        document.getElementById(`bpDeltaPcnt2`).value = deltaPcnt2 +' %';\r\n        document.getElementById(`bpDeltaUsd2`).value = deltaUsd2 + ' $';\r\n\r\n        let targetDeltaPcnt1 = document.getElementById(`bpTargetDeltaPcnt1`).value;\r\n        let targetDeltaUsd1 = document.getElementById(`bpTargetDeltaUsd1`).value;\r\n\r\n        let targetDeltaPcnt2 = document.getElementById(`bpTargetDeltaPcnt2`).value;\r\n        let targetDeltaUsd2 = document.getElementById(`bpTargetDeltaUsd2`).value;\r\n\r\n        //recompute target deltas\r\n        if (targetSpreadFixedInPcnt1 && targetDeltaPcnt1) {\r\n            document.getElementById(`bpTargetDeltaUsd1`).value = (deltaUsd1 * targetDeltaPcnt1 / deltaPcnt1).toFixed(4);\r\n        } else if (!targetSpreadFixedInPcnt1 && targetDeltaUsd1) {\r\n            document.getElementById(`bpTargetDeltaPcnt1`).value = (deltaPcnt1 * targetDeltaUsd1 / deltaUsd1).toFixed(4);\r\n        }\r\n\r\n        if (targetSpreadFixedInPcnt2 && targetDeltaPcnt2) {\r\n            document.getElementById(`bpTargetDeltaUsd2`).value = (deltaUsd2 * targetDeltaPcnt2 / deltaPcnt2).toFixed(4);\r\n        } else if (!targetSpreadFixedInPcnt2 && targetDeltaUsd2) {\r\n            document.getElementById(`bpTargetDeltaPcnt2`).value = (deltaPcnt2 * targetDeltaUsd2 / deltaUsd2).toFixed(4);\r\n        }\r\n    });\r\n}\n\n//# sourceURL=webpack://atb/./src/best_prices.js?");

/***/ }),

/***/ "./src/cache-manager.js":
/*!******************************!*\
  !*** ./src/cache-manager.js ***!
  \******************************/
/***/ ((module) => {

eval("const LEADING_INSTRUMENT = \"leadingInstrument\";\r\nconst LED_INSTRUMENT = \"ledInstrument\";\r\n\r\nconst LEADING_INSTRUMENTS = \"leadingInstruments\";\r\nconst LED_INSTRUMENTS = \"ledInstruments\";\r\n\r\nconst API_KEY = \"apiKey\";\r\nconst SECRET_KEY = \"secretKey\"\r\n\r\n\r\nfunction getInstruments(key) {\r\n    let item = window.localStorage.getItem(key);\r\n    if (item) {\r\n        return JSON.parse(item);\r\n    }\r\n    return [];\r\n}\r\n\r\nfunction cacheDataRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments.push(document.getElementById(LEADING_INSTRUMENT+rn).value);\r\n    ledInstruments.push(document.getElementById(LED_INSTRUMENT+rn).value);\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction cacheInstruments(leadingInstruments, ledInstruments) {\r\n    cache(LEADING_INSTRUMENTS, leadingInstruments);\r\n    cache(LED_INSTRUMENTS, ledInstruments);\r\n}\r\n\r\nfunction cache(key, value) {\r\n    window.localStorage.setItem(key, JSON.stringify(value));\r\n}\r\n\r\nfunction getCached(key) {\r\n    let item = window.localStorage.getItem(key);\r\n    if (item) {\r\n        return JSON.parse(item);\r\n    } else {\r\n        return \"\";\r\n    }\r\n}\r\n\r\nfunction remove(key) {\r\n    window.localStorage.removeItem(key);\r\n}\r\n\r\nfunction isAuthorized() {\r\n    let apiKey = getCached(API_KEY);\r\n    let secretKey = getCached(SECRET_KEY);\r\n    return (apiKey && secretKey);\r\n}\r\n\r\nfunction selectCachedValues(rn) {\r\n    document.getElementById(LEADING_INSTRUMENT + rn).value = getInstruments(LEADING_INSTRUMENTS)[rn - 1];\r\n    document.getElementById(LED_INSTRUMENT + rn).value = getInstruments(LED_INSTRUMENTS)[rn - 1];\r\n}\r\n\r\nfunction replaceCachedRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments[rn - 1] = document.getElementById(LEADING_INSTRUMENT + rn).value;\r\n    ledInstruments[rn - 1] = document.getElementById(LED_INSTRUMENT + rn).value;\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction removeCachedRow(rn) {\r\n    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);\r\n    let ledInstruments = getInstruments(LED_INSTRUMENTS);\r\n    leadingInstruments.splice(rn - 1, 1);\r\n    ledInstruments.splice(rn - 1, 1);\r\n    cacheInstruments(leadingInstruments, ledInstruments);\r\n}\r\n\r\nfunction removeAllCachedRows() {\r\n    cacheInstruments([], []);\r\n}\r\n\r\nfunction getCachedRowsCount() {\r\n    return getInstruments(LEADING_INSTRUMENTS).length;\r\n}\r\n\r\nmodule.exports = {\r\n    cache: cache,\r\n    getCached: getCached,\r\n    remove: remove,\r\n    API_KEY: API_KEY,\r\n    SECRET_KEY: SECRET_KEY,\r\n    isAuthorized: isAuthorized,\r\n    selectCachedValues: selectCachedValues,\r\n    cacheDataRow: cacheDataRow,\r\n    replaceCachedRow: replaceCachedRow,\r\n    removeCachedRow: removeCachedRow,\r\n    removeAllCachedRows: removeAllCachedRows,\r\n    getCachedRowsCount: getCachedRowsCount\r\n}\n\n//# sourceURL=webpack://atb/./src/cache-manager.js?");

/***/ }),

/***/ "./src/data-manager.js":
/*!*****************************!*\
  !*** ./src/data-manager.js ***!
  \*****************************/
/***/ ((module) => {

eval("const SERVER_URL = \"https://dapi.binance.com/dapi/v1/\"  //Prod env\r\n//const SERVER_URL = \"https://testnet.binancefuture.com/dapi/v1/\" //Test env\r\n\r\nconst ALL_SYMBOLS = \"exchangeInfo\";\r\nconst SYMBOL_PRICE = \"ticker/price\";\r\nconst BEST_PRICES = \"ticker/bookTicker\";\r\n\r\nlet cachedSymbols = [];\r\n\r\nasync function getAllSymbols() {\r\n    if (cachedSymbols.length === 0) {\r\n        let response = await fireGetRequestTo(ALL_SYMBOLS);\r\n        cachedSymbols = response.symbols;\r\n    } \r\n    return cachedSymbols;\r\n}\r\n\r\nasync function fireGetRequestTo(path) {\r\n    let url = SERVER_URL + path;\r\n    let requestHeaders = new Headers();\r\n    //requestHeaders.append('Content-Type', 'application/json');\r\n    //if (token = await tokenManager.getValidAuthToken()) {\r\n    //    requestHeaders.append('Authorization', `Bearer ${token}`);\r\n    //}\r\n    const params = {\r\n        method: 'GET',\r\n        headers: requestHeaders,\r\n    };\r\n    const response = await fetch(url, params);\r\n    const json = await response.json();\r\n    return json;\r\n}\r\n\r\nfunction requestPrice(symbol, callback) {\r\n    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nfunction requestBestPrices(callback) {\r\n    let path = `${BEST_PRICES}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nasync function fireGetRequestWithCallback(path, callback) {\r\n    let url = SERVER_URL + path;\r\n    let xhttp = new XMLHttpRequest();\r\n    xhttp.onreadystatechange = function () {\r\n        if (this.readyState == 4 && this.status == 200) {\r\n            callback(JSON.parse(xhttp.responseText));\r\n        }\r\n    };\r\n    xhttp.open(\"GET\", url, true);\r\n    //xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);\r\n    xhttp.send();\r\n}\r\n\r\nmodule.exports = {\r\n    getAllSymbols: getAllSymbols,\r\n    requestPrice: requestPrice,\r\n    requestBestPrices: requestBestPrices\r\n}\r\n\r\n\r\n\n\n//# sourceURL=webpack://atb/./src/data-manager.js?");

/***/ }),

/***/ "./src/ui-utils.js":
/*!*************************!*\
  !*** ./src/ui-utils.js ***!
  \*************************/
/***/ ((module) => {

eval("const UNAUTHORIZED = \"unauthorized\";\r\nconst PROMPT_CREDS = \"prompt_creds\";\r\nconst AUTHORIZED = \"authorized\"\r\n\r\nconst UI_STATES = [UNAUTHORIZED, PROMPT_CREDS, AUTHORIZED];\r\n\r\nfunction switchTo(newState) {\r\n    for (let state of UI_STATES) {\r\n        if (state === newState) {\r\n            document.getElementById(state).style.display = 'flex';\r\n        } else {\r\n            document.getElementById(state).style.display = 'none';\r\n        }\r\n    }\r\n}\r\n\r\nfunction clearDataGrid(buttonId, dataGridId) {\r\n    document.getElementById(buttonId).classList.toggle('invisible');\r\n    document.getElementById(dataGridId).innerHTML = '';\r\n}\r\n\r\nfunction removeRowWithElement(id) {\r\n    let row = document.getElementById(id).parentNode.parentNode;\r\n    row.remove();\r\n}\r\n\r\nfunction fillDropdownWithData(id, symbols) {\r\n    let dropdown = document.getElementById(id);\r\n    removeAllChildNodes(dropdown);\r\n    for (let s of symbols) {\r\n        dropdown.appendChild(createOption(s.symbol, s.symbol));\r\n    }\r\n    sortOptions(dropdown);\r\n}\r\n\r\nfunction removeAllChildNodes(parent) {\r\n    while (parent.firstChild) {\r\n        parent.removeChild(parent.firstChild);\r\n    }\r\n}\r\n\r\nfunction createOption(label, value) {\r\n    var option = document.createElement(\"option\");\r\n    option.setAttribute(\"value\", value);\r\n    option.innerHTML = label;\r\n    return option;\r\n}\r\n\r\nfunction sortOptions(dropdown) {\r\n    var tmpAry = new Array();\r\n    for (var i = 0; i < dropdown.options.length; i++) {\r\n        tmpAry[i] = new Array();\r\n        tmpAry[i][0] = dropdown.options[i].text;\r\n        tmpAry[i][1] = dropdown.options[i].value;\r\n    }\r\n    tmpAry.sort();\r\n    clearOptions(dropdown);\r\n    for (var i = 0; i < tmpAry.length; i++) {\r\n        var op = new Option(tmpAry[i][0], tmpAry[i][1]);\r\n        dropdown.options[i] = op;\r\n    }\r\n    return;\r\n}\r\n\r\nfunction clearOptions(element) {\r\n    element.options.length = 0;\r\n}\r\n\r\nfunction showElement(id) {\r\n    var el = document.getElementById(id);\r\n    el.style.display = \"flex\";\r\n}\r\n\r\nfunction hideElement(id) {\r\n    var el = document.getElementById(id);\r\n    el.style.display = \"none\";\r\n}\r\n\r\nmodule.exports = {\r\n    UNAUTHORIZED: UNAUTHORIZED,\r\n    PROMPT_CREDS: PROMPT_CREDS,\r\n    AUTHORIZED: AUTHORIZED,\r\n    switchTo: switchTo,\r\n    removeRowWithElement: removeRowWithElement,\r\n    fillDropdownWithData: fillDropdownWithData,\r\n    clearDataGrid: clearDataGrid,\r\n    showElement: showElement,\r\n    hideElement: hideElement\r\n}\n\n//# sourceURL=webpack://atb/./src/ui-utils.js?");

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
/******/ 	var __webpack_exports__ = __webpack_require__("./src/best_prices.js");
/******/ 	
/******/ })()
;