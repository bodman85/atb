const SERVER_URL = "https://dapi.binance.com/dapi/v1/"

const ALL_SYMBOLS = "exchangeInfo";
const SYMBOL_PRICE = "ticker/price";

let cachedSymbols = [];

async function getAllSymbols() {
    if (cachedSymbols.length === 0) {
        let response = await fireGetRequestTo(ALL_SYMBOLS);
        cachedSymbols = response.symbols;
    } 
    return cachedSymbols;
}

async function fireGetRequestTo(path) {
    let url = SERVER_URL + path;
    let requestHeaders = new Headers();
    requestHeaders.append('Content-Type', 'application/json');
    //if (token = await tokenManager.getValidAuthToken()) {
    //    requestHeaders.append('Authorization', `Bearer ${token}`);
    //}
    const params = {
        method: 'GET',
        headers: requestHeaders,
    };
    const response = await fetch(url, params);
    const json = await response.json();
    return json;
}

function requestPrice(symbol, callback) {
    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;
    fireGetRequestWithCallback(path, callback);
}

async function fireGetRequestWithCallback(path, callback) {
    let url = SERVER_URL + path;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.open("GET", url, true);
    //xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);
    xhttp.send();
}

async function cache(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
}

function getCachedArray(key) {
    let item = window.localStorage.getItem(key);
    if (item) {
        return JSON.parse(item);
    }
    return [];
}


module.exports = {
    getAllSymbols: getAllSymbols,
    requestPrice: requestPrice,
    cache: cache,
    getCachedArray: getCachedArray
}


