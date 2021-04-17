const cacheManager = require("./cache-manager");
const CryptoJS = require("crypto-js");

//const SERVER_URL = "https://dapi.binance.com/dapi/v1/"  //Prod env
const SERVER_URL = "https://testnet.binancefuture.com/dapi/v1/" //Test env

const ALL_SYMBOLS = "exchangeInfo";
const SYMBOL_PRICE = "ticker/price";
const BEST_PRICES = "ticker/bookTicker";
const PLACE_ORDER = "order";

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
    const params = {
        method: 'GET',
        headers: requestHeaders,
    };
    const response = await fetch(url, params);
    const json = await response.json();
    return json;
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
    xhttp.send();
}

async function firePostRequestTo(path, apiKey) {
    let url = SERVER_URL + path;
    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', url, true);
    xhttp.setRequestHeader('X-MBX-APIKEY', apiKey);
    xhttp.onload = function () {
        console.log(xhttp.responseText);
    }
    xhttp.send();
}

function requestPrice(symbol, callback) {
    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;
    fireGetRequestWithCallback(path, callback);
}

function requestBestPrices(callback) {
    let path = `${BEST_PRICES}`;
    fireGetRequestWithCallback(path, callback);
}

function placeOrder(queryString) {
    let apiKey = cacheManager.getCached(cacheManager.API_KEY);
    //let apiKey = '0d59086bc89d630eb5d6df7d174ad4eed4bc35f3207332dccd6717ad843dea13';
    //let secretKey = '68037734469c00cde71dece5527908e3350d4b03583275458fb5ae7eae28c118';
    let secretKey = cacheManager.getCached(cacheManager.SECRET_KEY);
    let signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex)
    queryString += `&signature=${signature}`;
    let path = PLACE_ORDER + '?' + queryString;
    firePostRequestTo(path, apiKey);
}

module.exports = {
    getAllSymbols: getAllSymbols,
    requestPrice: requestPrice,
    requestBestPrices: requestBestPrices,
    placeOrder: placeOrder
}


