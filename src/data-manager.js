const cacheManager = require("./cache-manager");
const CryptoJS = require("crypto-js");
const W3CWebSocket = require('websocket').w3cwebsocket;

const PROXY_URL = "https://atb-proxy.herokuapp.com/";


//Prod env:
const SERVER_URL = "https://dapi.binance.com/"
const WEBSOCKET_URL = "wss://dstream.binance.com/ws/"
/*
//Test env:
const SERVER_URL = "https://testnet.binancefuture.com/" 
const WEBSOCKET_URL = "wss://dstream.binancefuture.com/ws/" 
*/

const ALL_SYMBOLS = "dapi/v1/exchangeInfo";
const SYMBOL_PRICE = "dapi/v1/ticker/price";
const BEST_PRICES = "dapi/v1/ticker/bookTicker";
const PLACE_ORDER = "dapi/v1/order";
const POSITIONS = 'dapi/v1/positionRisk';

const LISTEN_KEY = "dapi/v1/listenKey";

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
    let url = PROXY_URL + SERVER_URL + path;
    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200 && callback) {
            callback(JSON.parse(request.responseText));
        }
    };
    request.open("GET", url, true);
    let apiKey = cacheManager.getCached(cacheManager.API_KEY);
    if (apiKey) {
        request.setRequestHeader('X-MBX-APIKEY', apiKey);
    }
    request.send();
}


async function fireTestRequestWithCallback(path, callback) {
    let url = "http://localhost:8080";
    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200 && callback) {
            callback(request.responseText);
        }
    };
    request.open("GET", url, true);
    request.send();
}

async function firePostRequestWithCallback(path, callback) {
    let url = PROXY_URL + SERVER_URL + path;
    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState == 4 && request.status == 200 && callback) {
            callback(request.responseText);
        }
    }; 
    request.open('POST', url, true);
    let apiKey = cacheManager.getCached(cacheManager.API_KEY);
    if (apiKey) {
        request.setRequestHeader('X-MBX-APIKEY', apiKey);
    }
    request.send();
}

function requestPrice(symbol, callback) {
    let path = `${SYMBOL_PRICE}?symbol=${symbol}`;
    fireGetRequestWithCallback(path, callback);
}

function requestBestPrices(callback) {
    let path = `${BEST_PRICES}`;
    fireGetRequestWithCallback(path, callback);
}

function executeOrder(order, callback) {
    //test apiKey = '0d59086bc89d630eb5d6df7d174ad4eed4bc35f3207332dccd6717ad843dea13';
    //test secretKey = '68037734469c00cde71dece5527908e3350d4b03583275458fb5ae7eae28c118';
    let buyQueryString = `symbol=${order.buy}&side=BUY&type=MARKET&quantity=1&timeStamp=${Date.now()}&recvWindow=60000`;
    let sellQueryString = `symbol=${order.sell}&side=SELL&type=MARKET&quantity=1&timeStamp=${Date.now()}&recvWindow=60000`;
    buyQueryString += sign(buyQueryString);
    sellQueryString += sign(sellQueryString);
    firePostRequestWithCallback(PLACE_ORDER + '?' + buyQueryString, callback);
    firePostRequestWithCallback(PLACE_ORDER + '?' + sellQueryString, callback);
}

function requestPositions(callback) {
    let queryString = `timeStamp=${Date.now()}`;
    queryString += sign(queryString);
    fireGetRequestWithCallback(POSITIONS + '?' + queryString, callback);
}

function closePosition(position, callback) {
    let quantity = Math.abs(position.positionAmt);
    let side = position.positionAmt < 0 ? 'BUY' : 'SELL';
    let queryString = `symbol=${position.symbol}&side=${side}&type=MARKET&quantity=${quantity}&timeStamp=${Date.now()}`;
    queryString += sign(queryString);
    firePostRequestWithCallback(PLACE_ORDER + '?' + queryString, callback);
}

function closeAllPositions(positions) {
    for (let position of positions) {
        closePosition(position);
    }
}

function listenToAccountUpdate() {
    firePostRequestWithCallback(LISTEN_KEY, logAccountUpdate);
}

function logAccountUpdate(listenKey) {
    const client = new W3CWebSocket(WEBSOCKET_URL + listenKey);
    client.onmessage = function (e) {
        console.log(JSON.stringify(e.data));
    };
}

function sign(queryString) {
    let secretKey = cacheManager.getCached(cacheManager.SECRET_KEY);
    let signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex)
    return `&signature=${signature}`;
}

module.exports = {
    getAllSymbols: getAllSymbols,
    requestPrice: requestPrice,
    requestBestPrices: requestBestPrices,
    executeOrder: executeOrder,
    requestPositions: requestPositions,
    closePosition: closePosition,
    closeAllPositions: closeAllPositions,
    listenToAccountUpdate: listenToAccountUpdate
}


