const cacheManager = require("./cache-manager");
const CryptoJS = require("crypto-js");
const W3CWebSocket = require('websocket').w3cwebsocket;

const PROXY_URL = "https://atb-proxy.herokuapp.com/";

//Prod env:
const SERVER_URL = "https://dapi.binance.com/"
const WEBSOCKET_URL = "wss://dstream.binance.com/ws/"
//const USER_DATA_STREAM_URL = "wss://stream.binance.com:9443/ws/"
/*
//Test env:
const SERVER_URL = "https://testnet.binancefuture.com/" 
const WEBSOCKET_URL = "wss://dstream.binancefuture.com/ws/" 
*/


const ALL_SYMBOLS = "dapi/v1/exchangeInfo";
const SYMBOL_PRICE = "dapi/v1/ticker/price";
const CURRENT_PRICES = "dapi/v1/ticker/bookTicker";
const ORDER = "dapi/v1/order";
const OPEN_ORDERS = 'dapi/v1/openOrders';
const ALL_OPEN_ORDERS = 'dapi/v1/allOpenOrders';
const POSITIONS = 'dapi/v1/positionRisk';
const KLINES = 'dapi/v1/klines';

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

async function fireTestRequestWithCallback(path, callback) {
    let url = "http://localhost:8080";
    fireRequestWithCallback(url, 'GET', callback);
}

async function fireGetRequestWithCallback(path, callback) {
    let url = PROXY_URL + SERVER_URL + path;
    fireRequestWithCallback(url, 'GET', callback);
}

async function firePostRequestWithCallback(path, callback) {
    let url = PROXY_URL + SERVER_URL + path;
    fireRequestWithCallback(url, 'POST', callback);
}

async function firePutRequestWithCallback(path, callback) {
    let url = PROXY_URL + SERVER_URL + path;
    fireRequestWithCallback(url, 'PUT', callback);
}

async function fireDeleteRequestWithCallback(path, callback) {
    let url = PROXY_URL + SERVER_URL + path;
    fireRequestWithCallback(url, 'DELETE', callback);
}

async function fireRequestWithCallback(url, requestMethod, callback) {
    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200 && callback) {
            callback(JSON.parse(request.responseText));
        }
    };
    request.open(requestMethod, url, true);
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

function requestCurrentPrices(callback) {
    let path = `${CURRENT_PRICES}`;
    fireGetRequestWithCallback(path, callback);
}

function placeOrder(order, callback) {
    let queryString = `symbol=${order.symbol}&side=${order.side}&type=${order.type}&quantity=${order.quantity}&timeStamp=${Date.now()}&recvWindow=${order.recvWindow}`;
    if (order.type.toUpperCase() === 'LIMIT') {
        queryString += `&price=${order.price}&timeInForce=${order.timeInForce}`;
    } else if (order.type.toUpperCase() === 'STOP') {
        queryString += `&price=${order.price}&stopPrice=${order.stopPrice}&timeInForce=${order.timeInForce}`;
    } else if (order.type.toUpperCase() === 'STOP_MARKET') {
        queryString += `&stopPrice=${order.stopPrice}&timeInForce=${order.timeInForce}`;
    }
    queryString += sign(queryString);
    firePostRequestWithCallback(ORDER + '?' + queryString, callback);
}

function requestOrders(symbol, callback) {
    let queryString = `symbol=${symbol}&timeStamp=${Date.now()}`;
    queryString += sign(queryString);
    fireGetRequestWithCallback(OPEN_ORDERS + '?' + queryString, callback);
}

function cancelOrder(order, callback) {
    let queryString = `symbol=${order.symbol}&orderId=${order.orderId}&timeStamp=${Date.now()}`;
    queryString += sign(queryString);
    fireDeleteRequestWithCallback(ORDER + '?' + queryString, callback);
}

function cancelAllOrdersFor(symbol, callback) {
    let queryString = `symbol=${symbol}&timeStamp=${Date.now()}`;
    queryString += sign(queryString);
    fireDeleteRequestWithCallback(ALL_OPEN_ORDERS + '?' + queryString, callback);
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
    firePostRequestWithCallback(ORDER + '?' + queryString, callback);
}

function closePositions(positions) {
    for (let position of positions) {
        closePosition(position);
    }
}

function requestKlines(symbol, interval, limit, callback) {
    let queryString = `symbol=${symbol}&interval=${interval}&limit=${limit}`;
    fireGetRequestWithCallback(KLINES + '?' + queryString, callback);
}

async function pollPriceTickerFor(symbol, callback) {
    const ws = new W3CWebSocket(`${WEBSOCKET_URL}${symbol.toLowerCase()}@ticker`);
    try {
        ws.onmessage = await function (e) {
            callback(JSON.parse(e.data));
        }
    } catch (error) {
        console.log("ooops ", error);
    }
}

function pollBookTickerFor(symbol, callback) {
    const ws = new W3CWebSocket(`${WEBSOCKET_URL}${symbol.toLowerCase()}@bookTicker`);
    ws.onmessage = function (e) {
        let ticker = JSON.parse(e.data);
        callback(ticker);
    };
}

function pollDepthFor(symbol, callback) {
    const ws = new W3CWebSocket(`${WEBSOCKET_URL}${symbol.toLowerCase()}@depth20`);
    ws.onmessage = function (e) {
        let data = JSON.parse(e.data);
        callback(data);
    };
}

function pollKlinesFor(symbol, interval, callback) {
    const ws = new W3CWebSocket(`${WEBSOCKET_URL}${symbol.toLowerCase()}@kline_${interval}`);
    ws.onmessage = function (e) {
        let data = JSON.parse(e.data);
        callback(data);
    };
}

function pollUserDataStream(callback) {
    firePostRequestWithCallback(LISTEN_KEY, function (resp) {
        console.log(resp.listenKey);
        const ws = new W3CWebSocket(`${WEBSOCKET_URL}${resp.listenKey}`);
        ws.onmessage = function (e) {
            let data = JSON.parse(e.data);
            callback(data);
        };
    });
}

function refreshListenKey() {
    firePutRequestWithCallback(LISTEN_KEY);
}

function sign(queryString) {
    let secretKey = cacheManager.getCached(cacheManager.SECRET_KEY);
    let signature = CryptoJS.HmacSHA256(queryString, secretKey).toString(CryptoJS.enc.Hex)
    return `&signature=${signature}`;
}

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

module.exports = {
    getAllSymbols: getAllSymbols,
    requestPrice: requestPrice,
    requestCurrentPrices: requestCurrentPrices,
    placeOrder: placeOrder,
    requestOrders: requestOrders,
    cancelOrder: cancelOrder,
    cancelAllOrdersFor: cancelAllOrdersFor,
    requestPositions: requestPositions,
    closePosition: closePosition,
    closePositions: closePositions,
      requestKlines: requestKlines, 
    pollPriceTickerFor: pollPriceTickerFor,
    pollBookTickerFor: pollBookTickerFor,
    pollDepthFor: pollDepthFor,
    pollKlinesFor: pollKlinesFor,
    pollUserDataStream: pollUserDataStream,
    refreshListenKey: refreshListenKey,
    isEmpty: isEmpty
}


