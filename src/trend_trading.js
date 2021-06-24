const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const TREND_BUFFER_SIZE = 5;
const FORECAST_BUFFER_SIZE = 100;
const LIMIT_ORDER_FEE_PCNT = 0.01;

const TREND_DELTA_EDGE_VALUE = 0.04;
const FORECAST_DELTA_EDGE_VALUE = 0.1;
const TARGET_PROFIT = 0.04;

const LIMIT_ORDER_PENDING_TIME = 1000;
const TREND_VALID_TIME = 2000;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);
let PREVIOUS_PRICE_DELTAS = new CircularBuffer(TREND_BUFFER_SIZE);

let previousPrice = 0;
let currentPrice = 0;

let priceLastUpdated = Date.now();
let orderLastPlaced = Date.now();

let currentBidPrice = 0;
let currentAskPrice = 0;

let currentPosition = {};
let totalPnlPcnt = 0;



window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });
    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    initCurrentPosition();
    setInterval(pollOrders, 2000);
    setInterval(displayCurrentPosition, 1000);
    setInterval(dataManager.refreshListenKey, 300000);

    dataManager.pollUserDataStream(function (stream) {
        processUserDataStream(stream);
    });

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        previousPrice = currentPrice;
        currentPrice = ticker['c'];

        if (!dataManager.isEmpty(currentPosition)) {
            currentPosition.unRealizedProfit = computePnlPcntFor(currentPosition);
        }

        priceLastUpdated = Date.now();
        document.getElementById('ttPrice').value = currentPrice;

        let previousPriceDelta = previousPrice ? parseFloat((currentPrice - previousPrice) / previousPrice * 100) : 0;
        PREVIOUS_PRICE_DELTAS.enq(previousPriceDelta);
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        currentBidPrice = parseFloat(ticker['b']);
        currentAskPrice = parseFloat(ticker['a']);
        if (document.getElementById("tradeAutoSwitcher").checked) {
            autoTrade();
        }
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        let priceTrend = getPriceTrend();
        document.getElementById('priceTrend').value = priceTrend > TREND_DELTA_EDGE_VALUE ? 'ASC' : priceTrend < -TREND_DELTA_EDGE_VALUE ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(priceTrend, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });
}

function autoTrade() {
    let trend = getPriceTrend();
    let forecast = getPriceForecastBasedOnBidAskRatio();
    if (!hasAmount(currentPosition)) { // No position
        if ((trend >= 0) && isUp(forecast)) {
            placeBuyOrder();
        } else if ((trend <= 0) && isDown(forecast)) {
            placeSellOrder();
        }
    } else { // position exists
        if (currentPosition.positionAmt > 0) { //long position
            if (currentPosition.unRealizedProfit < -TARGET_PROFIT) {
                placeSellOrder(); // Stop Loss
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.5) {
                placeSellOrder(); // Backup Take Profit
            }
        } else if (currentPosition.positionAmt < 0) { //short position
            if (currentPosition.unRealizedProfit < -TARGET_PROFIT) {
                placeBuyOrder(); // Stop Loss
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.5) {
                placeBuyOrder(); // Backup Take Profit
            }
        }
    }
}

function isDesc(trend) {
    return trend < -TREND_DELTA_EDGE_VALUE;
}

function isFlat(trend) {
    return trend >= -TREND_DELTA_EDGE_VALUE && trend <= TREND_DELTA_EDGE_VALUE;
}

function isAsc(trend) {
    return trend > TREND_DELTA_EDGE_VALUE;
}

function isDown(forecast) {
    return forecast < -FORECAST_DELTA_EDGE_VALUE;
}

function isUndefined(forecast) {
    return forecast >= -FORECAST_DELTA_EDGE_VALUE && forecast <= FORECAST_DELTA_EDGE_VALUE;
}

function isUp(forecast) {
    return forecast > FORECAST_DELTA_EDGE_VALUE;
}

function processUserDataStream(stream) {
    var strLines = JSON.stringify(stream).split("\n");
    for (var i in strLines) {
        var obj = JSON.parse(strLines[i]);
        if (obj.e === 'ACCOUNT_UPDATE') {
            dataManager.cancelAllOrdersFor(instrumentSymbol);
            let position = {};
            position.symbol = obj.a.P[0].s;
            position.positionAmt = obj.a.P[0].pa;
            position.entryPrice = obj.a.P[0].ep;
            if (position.positionAmt == 0) {
                totalPnlPcnt += currentPosition.unRealizedProfit;
            } else {
                placeStopOrderFor(position);
            }
            updateCurrentPosition(position.symbol, position.positionAmt, position.entryPrice, computePnlPcntFor(position))
        }
    }
}

function placeStopOrderFor(position) {
    if (position.positionAmt > 0) {
        let stopPrice = parseFloat(parseFloat(position.entryPrice) + position.entryPrice / 100 * TARGET_PROFIT).toFixed(2)
        placeSellOrder(stopPrice);
    } else if (position.positionAmt < 0) {
        let stopPrice = parseFloat(position.entryPrice - position.entryPrice / 100 * TARGET_PROFIT).toFixed(2);
        placeBuyOrder(stopPrice);
    }
}

function initCurrentPosition() {
    dataManager.requestPositions(positions => {
        let targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && instrumentSymbol === p.symbol);
        if (targetPositions.length === 0) {
            currentPosition = {};
        } else {
            let position = targetPositions[0];
            updateCurrentPosition(position.symbol, position.positionAmt, position.entryPrice, computePnlPcntFor(position));
        }
    });
}

function updateCurrentPosition(s, pa, ep, up) {
    currentPosition.symbol = s;
    currentPosition.positionAmt = pa;
    currentPosition.entryPrice = ep;
    currentPosition.unRealizedProfit = up;
}

function hasAmount(position) {
    return !dataManager.isEmpty(position) && ('positionAmt' in position) && position.positionAmt != 0;
}

function computePnlPcntFor(position) {
    if (!hasAmount(position)) {
        return 0;
    } else {
        if (position.positionAmt > 0) {
            return (currentPrice - position.entryPrice) / position.entryPrice * 100 - 2 * LIMIT_ORDER_FEE_PCNT;
        } else {
            return (position.entryPrice - currentPrice) / position.entryPrice * 100 - 2 * LIMIT_ORDER_FEE_PCNT;
        }
    }
}

function computeFairPrice(data) {
    let asks = data['a'];
    let askOrders = 0;
    let askVolume = 0;
    for (let a of asks) {
        askOrders += parseInt(a[1]);
        askVolume += a[0] * a[1];
    }
    let bids = data['b'];
    let bidOrders = 0;
    let bidVolume = 0;
    for (let b of bids) {
        bidOrders += parseInt(b[1]);
        bidVolume += b[0] * b[1];
    }
    return parseFloat((askVolume + bidVolume) / (askOrders + bidOrders));
}

function getPriceForecastBasedOnBidAskRatio() {
    let accu = 0;
    let fpArray = FAIR_PRICE_DELTAS.toarray();
    for (let p of fpArray) {
        accu += p;
    }
    //console.log(accu);
    return accu;
}

function getPriceTrend() {
    let accu = 0;
    let ptArray = PREVIOUS_PRICE_DELTAS.toarray();
    if (Date.now() - priceLastUpdated > TREND_VALID_TIME) {
        return 0;
    }
    for (let p of ptArray) {
        //if (Math.sign(ptArray[0]) != Math.sign(p)) {
        //    return 0;
        //}
        accu += p;
    }
    return accu;
}

function handleTradeAutoSwitcher() {
    if (document.getElementById("tradeAutoSwitcher").checked) {
        uiUtils.disableElement('ttQuantity');
        uiUtils.disableElement('buyInstrumentButton');
        uiUtils.disableElement('sellInstrumentButton');
        initCurrentPosition();
    } else {
        uiUtils.enableElement('ttQuantity');
        uiUtils.enableElement('buyInstrumentButton');
        uiUtils.enableElement('sellInstrumentButton');
        autoTradePnl = 0;
    }
}

function placeBuyOrder(price) {
    if (price || (Date.now() - orderLastPlaced >= LIMIT_ORDER_PENDING_TIME)) {
        dataManager.placeOrder(buildOrder('BUY', price));
        orderLastPlaced = Date.now();
    }
}

function placeSellOrder(price) {
    if (price || (Date.now() - orderLastPlaced >= LIMIT_ORDER_PENDING_TIME)) {
        dataManager.placeOrder(buildOrder('SELL', price));
        orderLastPlaced = Date.now();
    }
}

function buildOrder(side, price) {
    let type = 'MARKET';
    if (document.getElementById("limitOrdersAutoSwitcher").checked) {
        type = 'LIMIT';
    }
    let order = {
        side: side,
        symbol: instrumentSymbol,
        quantity: document.getElementById('ttQuantity').value,
        type: type,
        recvWindow: 30000
    }
    if (type === 'LIMIT') {
        let orderPrice = price ? price : currentBidPrice; //bid and ask prices mixed intentionally to speed-up order execution
        if (side === 'BUY') {
            orderPrice = price ? price : currentAskPrice;
        }
        Object.assign(order, { price: orderPrice, timeInForce: 'GTC' });
    }
    return order;
}

function pollOrders() {
    dataManager.requestOrders(orders => {
        document.getElementById("openOrdersDataGrid").innerHTML = '';
        let filteredOrders = orders.filter(o => o.symbol === instrumentSymbol);
        if (filteredOrders.length > 0) {
            uiUtils.showElement("ttRemoveAllOrdersButton");
        } else {
            uiUtils.hideElement("ttRemoveAllOrdersButton");
        }
        for (let order of filteredOrders) {
            let row = uiUtils.createTableRow();
            row.appendChild(uiUtils.createTextColumn(order.orderId));
            row.appendChild(uiUtils.createTextColumn(order.symbol));
            row.appendChild(uiUtils.createTextColumn(parseFloat(order.price).toFixed(4)));
            if (order.side.toUpperCase() === 'BUY') {
                row.appendChild(uiUtils.createTextColumn(order.side, 'text-success'));
            } else {
                row.appendChild(uiUtils.createTextColumn(order.side, 'text-danger'));
            }
            row.appendChild(uiUtils.createTextColumn(order.origQty));
            row.appendChild(uiUtils.createTextColumn(order.executedQty));
            row.appendChild(uiUtils.createIconButtonColumn("fa-times", function () { dataManager.cancelOrder(order) }));
            document.getElementById("openOrdersDataGrid").appendChild(row);
        }
    });
}

function displayCurrentPosition() {
    document.getElementById("ttPositionsDataGrid").innerHTML = '';
    if (hasAmount(currentPosition)) {
        let row = uiUtils.createTableRow();
        row.appendChild(uiUtils.createTextColumn(currentPosition.symbol));
        row.appendChild(uiUtils.createTextColumn(currentPosition.positionAmt));
        row.appendChild(uiUtils.createTextColumn(parseFloat(currentPosition.entryPrice).toFixed(4)));
        row.appendChild(uiUtils.createTextColumn(parseFloat(currentPosition.unRealizedProfit).toFixed(6)));
        row.appendChild(uiUtils.createIconButtonColumn("fa-times", function () { dataManager.closePosition(currentPosition) }));
        document.getElementById("ttPositionsDataGrid").appendChild(row);
    }
    displayTotalPnlPcnt();
}

function displayTotalPnlPcnt() {
    document.getElementById("ttTotalPnl").innerHTML = `Total \u2248 ${totalPnlPcnt.toFixed(2)}%`;
    uiUtils.paintRedOrGreen(totalPnlPcnt, 'ttTotalPnl');
}
