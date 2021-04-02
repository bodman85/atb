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

eval("var dataManager = __webpack_require__(/*! ./data-manager */ \"./src/data-manager.js\");\r\n\r\nwindow.onload = async function () {\r\n    const urlParams = new URLSearchParams(window.location.search);\r\n\r\n    let leadingInstrumentSymbol = urlParams.get('leadingInstrument');\r\n    let ledInstrumentSymbol = urlParams.get('ledInstrument');\r\n\r\n    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;\r\n    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;\r\n\r\n    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;\r\n    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;\r\n\r\n    setInterval(pollBestPricesAndRecomputeDeltas, 1000, leadingInstrumentSymbol, ledInstrumentSymbol);\r\n}\r\n\r\nfunction pollBestPricesAndRecomputeDeltas(leadingInstrumentSymbol, ledInstrumentSymbol) {\r\n    dataManager.requestBestPrices((response) => {\r\n        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));\r\n\r\n        let leadingBidPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice);\r\n        let leadingOfferPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice);\r\n\r\n        let ledBidPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice);\r\n        let ledOfferPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice);\r\n\r\n        document.getElementById(`bpLeadingPrice1`).value = leadingBidPrice;\r\n        document.getElementById(`bpLedPrice1`).value = ledOfferPrice;\r\n\r\n        document.getElementById(`bpLeadingPrice2`).value = leadingOfferPrice;\r\n        document.getElementById(`bpLedPrice2`).value = ledBidPrice;\r\n\r\n        document.getElementById(`bpDeltaPcnt1`).value = parseFloat(((ledOfferPrice / leadingBidPrice - 1) * 100).toFixed(4));\r\n        document.getElementById(`bpDeltaUsd1`).value = (parseFloat(ledOfferPrice - leadingBidPrice).toFixed(4));\r\n\r\n        document.getElementById(`bpDeltaPcnt2`).value = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4));\r\n        document.getElementById(`bpDeltaUsd2`).value = (parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4));\r\n    });\r\n}\n\n//# sourceURL=webpack://atb/./src/best_prices.js?");

/***/ }),

/***/ "./src/data-manager.js":
/*!*****************************!*\
  !*** ./src/data-manager.js ***!
  \*****************************/
/***/ ((module) => {

eval("const SERVER_URL = \"https://dapi.binance.com/dapi/v1/\"\r\n\r\nconst ALL_SYMBOLS = \"exchangeInfo\";\r\nconst SYMBOL_PRICE = \"ticker/price\";\r\nconst BEST_PRICES = \"ticker/bookTicker\";\r\n\r\nlet cachedSymbols = [];\r\n\r\nasync function getAllSymbols() {\r\n    if (cachedSymbols.length === 0) {\r\n        let response = await fireGetRequestTo(ALL_SYMBOLS);\r\n        cachedSymbols = response.symbols;\r\n    } \r\n    return cachedSymbols;\r\n}\r\n\r\nasync function fireGetRequestTo(path) {\r\n    let url = SERVER_URL + path;\r\n    let requestHeaders = new Headers();\r\n    requestHeaders.append('Content-Type', 'application/json');\r\n    //if (token = await tokenManager.getValidAuthToken()) {\r\n    //    requestHeaders.append('Authorization', `Bearer ${token}`);\r\n    //}\r\n    const params = {\r\n        method: 'GET',\r\n        headers: requestHeaders,\r\n    };\r\n    const response = await fetch(url, params);\r\n    const json = await response.json();\r\n    return json;\r\n}\r\n\r\nfunction requestPrice(symbol, callback) {\r\n    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nfunction requestBestPrices(callback) {\r\n    let path = `${BEST_PRICES}`;\r\n    fireGetRequestWithCallback(path, callback);\r\n}\r\n\r\nasync function fireGetRequestWithCallback(path, callback) {\r\n    let url = SERVER_URL + path;\r\n    let xhttp = new XMLHttpRequest();\r\n    xhttp.onreadystatechange = function () {\r\n        if (this.readyState == 4 && this.status == 200) {\r\n            callback(JSON.parse(xhttp.responseText));\r\n        }\r\n    };\r\n    xhttp.open(\"GET\", url, true);\r\n    //xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);\r\n    xhttp.send();\r\n}\r\n\r\nmodule.exports = {\r\n    getAllSymbols: getAllSymbols,\r\n    requestPrice: requestPrice,\r\n    requestBestPrices: requestBestPrices\r\n}\r\n\r\n\r\n\n\n//# sourceURL=webpack://atb/./src/data-manager.js?");

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