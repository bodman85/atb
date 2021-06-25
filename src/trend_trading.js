const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const FORECAST_BUFFER_SIZE = 10;
const TREND_BUFFER_SIZE = 600;

const FORECAST_DELTA_EDGE_VALUE = 0.1;
const TREND_INDICATOR_DELTA = 0.2;

const TARGET_PROFIT = 0.05;
const LIMIT_ORDER_FEE_PCNT = 0.01;
const LIMIT_ORDER_PENDING_TIME = 2000;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);
let PRICE_TICKERS = new CircularBuffer(TREND_BUFFER_SIZE);

let currentPrice = 0;
let currentBidPrice = 0;
let currentAskPrice = 0;
let totalPnlPcnt = 0;

let orderLastPlaced = Date.now();
let currentPosition = {};


window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });
    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    setInterval(initCurrentPosition, 10000);
    setInterval(pollOrders, 2000);
    setInterval(displayCurrentPosition, 1000);

    dataManager.pollUserDataStream(function (stream) {
        processUserDataStream(stream);
    });
    setInterval(dataManager.refreshListenKey, 600000);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        previousPrice = currentPrice;
        currentPrice = ticker['c'];

        PRICE_TICKERS.enq(currentPrice);

        if (!dataManager.isEmpty(currentPosition)) {
            currentPosition.unRealizedProfit = computePnlPcntFor(currentPosition);
        }

        priceLastUpdated = Date.now();
        document.getElementById('ttPrice').value = currentPrice;
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        currentBidPrice = parseFloat(ticker['b']);
        currentAskPrice = parseFloat(ticker['a']);
        if (document.getElementById("tradeAutoSwitcher").checked) {
            autoTrade();
        }
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        let priceTrend = getGeneralPriceTrend();
        document.getElementById('priceTrend').value = priceTrend > TREND_INDICATOR_DELTA ? 'ASC' : priceTrend < -TREND_INDICATOR_DELTA ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(priceTrend, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });
}

function autoTrade() {
    let generalTrend = getGeneralPriceTrend();
    let momentTrend = getMomentPriceTrend();
    let forecast = getPriceForecastBasedOnBidAskRatio();
    if (!currentPosition.positionAmt) { // No position
        if (isAsc(generalTrend) && momentTrend > 0 && priceIsFarFromLocalMaximum() && isUp(forecast)) {
            placeBuyOrder();
        } else if (isDesc(generalTrend) && momentTrend < 0 && priceIsFarFromLocalMinimum() && isDown(forecast)) {
            placeSellOrder();
        }
    } else { // position exists
        if (currentPosition.positionAmt > 0) { //long position
            if (isDesc(generalTrend) || currentPosition.unRealizedProfit < -TARGET_PROFIT * 5) {
                placeSellOrder(); // Stop Loss here 176(!) orders placed
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.1) {
                placeSellOrder(); // Backup Take Profit
            }
        } else if (currentPosition.positionAmt < 0) { //short position
            if (isAsc(generalTrend) || currentPosition.unRealizedProfit < -TARGET_PROFIT * 5) {
                placeBuyOrder(); // Stop Loss
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.1) {
                placeBuyOrder(); // Backup Take Profit
            }
        }
    }
}

function isDesc(trend) {
    return trend < -TREND_INDICATOR_DELTA;
}

function isAsc(trend) {
    return trend > TREND_INDICATOR_DELTA;
}

function isDown(forecast) {
    return forecast < -FORECAST_DELTA_EDGE_VALUE;
}

function isUp(forecast) {
    return forecast > FORECAST_DELTA_EDGE_VALUE;
}

function processUserDataStream(stream) {
    var strLines = JSON.stringify(stream).split("\n");
    for (var i in strLines) {
        var obj = JSON.parse(strLines[i]);
        if (obj.e === 'ACCOUNT_UPDATE') {
            let position = {};
            console.log(`Update received: ${JSON.stringify(obj.a.P)}`);
            position.symbol = obj.a.P[0].s;
            position.positionAmt = obj.a.P[0].pa;
            position.entryPrice = obj.a.P[0].ep;
            if (position.positionAmt == 0) {
                console.log('Position closed. Cancelling all open orders');
                dataManager.cancelAllOrdersFor(instrumentSymbol);
                totalPnlPcnt += parseFloat(currentPosition.unRealizedProfit);
            } else {
                console.log('Position opened. Placing STOP-Order');
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
        if (targetPositions.length == 0) {
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
    //console.log(`Price forecast: ${accu}`);
    return accu;
}

function getMomentPriceTrend() {
    let ptArray = PRICE_TICKERS.toarray();
    let first = ptArray[4];
    let last = ptArray[0];
    let trend = (last - first) / first * 100;
    //console.log(`Moment trend: ${trend}`);
    return trend;
}

function getGeneralPriceTrend() {
    let ptArray = PRICE_TICKERS.toarray();
    let first = ptArray[ptArray.length - 1];
    let last = ptArray[0];
    let trend = (last - first) / first * 100;
    //console.log(`General trend: ${trend}`);
    return trend;
}

function getPriceLocalMinimum() {
    return Math.min(...PRICE_TICKERS.toarray());
}

function getPriceLocalMaximum() {
    return Math.max(...PRICE_TICKERS.toarray());
}

function priceIsFarFromLocalMaximum() {
    let localMax = getPriceLocalMaximum();
    return (localMax - currentPrice) / currentPrice * 100 >= TARGET_PROFIT;
}

function priceIsFarFromLocalMinimum() {
    let localMin = getPriceLocalMinimum();
    return (currentPrice - localMin) / localMin * 100 >= TARGET_PROFIT;
}

function handleTradeAutoSwitcher() {
    if (document.getElementById("tradeAutoSwitcher").checked) {
        uiUtils.disableElement('ttQuantity');
        //uiUtils.disableElement('buyInstrumentButton');
        //uiUtils.disableElement('sellInstrumentButton');
        initCurrentPosition();
    } else {
        uiUtils.enableElement('ttQuantity');
        //uiUtils.enableElement('buyInstrumentButton');
        //uiUtils.enableElement('sellInstrumentButton');
        autoTradePnl = 0;
    }
}

function placeBuyOrder(stopPrice) {
    if (stopPrice || (Date.now() - orderLastPlaced >= LIMIT_ORDER_PENDING_TIME)) {
        if (!stopPrice) {
            orderLastPlaced = Date.now();
        } 
        console.log('Buy order placed');
        dataManager.placeOrder(buildOrder('BUY', stopPrice), function (order) {
            if (!stopPrice) {
                setTimeout(dataManager.cancelOrder, LIMIT_ORDER_PENDING_TIME, order);
            }
        });
    }
}

function placeSellOrder(stopPrice) {
    if (stopPrice || (Date.now() - orderLastPlaced >= LIMIT_ORDER_PENDING_TIME)) {
        if (!stopPrice) {
            orderLastPlaced = Date.now();
        } 
        console.log('Sell order placed');
        dataManager.placeOrder(buildOrder('SELL', stopPrice), function (order) {
            if (!stopPrice) {
                setTimeout(dataManager.cancelOrder, LIMIT_ORDER_PENDING_TIME, order);
            }
        });
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
        let orderPrice = price ? price : currentBidPrice; //bid and ask prices swapped intentionally to speed-up limit orders execution
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
