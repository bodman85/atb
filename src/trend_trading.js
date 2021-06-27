const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const FORECAST_BUFFER_SIZE = 10;
const TREND_BUFFER_SIZE = 600;

const FORECAST_DELTA_EDGE_VALUE = 0.1;
const TREND_INDICATOR_DELTA = 0.01;

const TARGET_PROFIT = 1;
const LIMIT_ORDER_FEE_PCNT = 0.01;
const LIMIT_ORDER_PENDING_TIME = 5000;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);
let PRICE_TICKERS = new CircularBuffer(TREND_BUFFER_SIZE);

let currentPrice = 0;
let currentBidPrice = 0;
let currentAskPrice = 0;
let totalPnlPcnt = 0;

let orderLastPlaced = Date.now();
let currentPosition = {};

let trend_1m = 0;
let trend_5m = 0;
let trend_15m = 0;
let trend_30m = 0;
let trend_1h = 0;


window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });
    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    setInterval(initCurrentPosition, 10000);
    setInterval(function () { pollOrders(instrumentSymbol) }, 2000);
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
        //let priceTrend = getGeneralPriceTrend();
        document.getElementById('priceTrend').value = allTrendsAsc() ? 'ASC' : allTrendsDesc() ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(trend_5m, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1m', kline => {
        trend_1m = computeDeltaInPcnt(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '5m', kline => {
        trend_5m = computeDeltaInPcnt(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '15m', kline => {
        trend_15m = computeDeltaInPcnt(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '30m', kline => {
        trend_30m = computeDeltaInPcnt(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1h', kline => {
        trend_1h = computeDeltaInPcnt(kline.k['o'], kline.k['c']);
    });
}

function computeDeltaInPcnt(first, second) {
    let f = parseFloat(first);
    let s = parseFloat(second);
    return (s - f) / f * 100;
}

function autoTrade() {
    //let generalTrend = getGeneralPriceTrend();
    //let momentTrend = getMomentPriceTrend();
    let forecast = getPriceForecastBasedOnBidAskRatio();
    if (!currentPosition.positionAmt) { // No position
        if (allTrendsAsc() /*&& isUp(forecast)*/) {
            placeBuyOrder();
        } else if (allTrendsDesc() /*&& isDown(forecast)*/) {
            placeSellOrder();
        }
    } else { // position exists
        if (currentPosition.positionAmt > 0) { //long position
            if (isDesc(trend_5m, 5)
                || currentPosition.unRealizedProfit < -(TARGET_PROFIT + LIMIT_ORDER_FEE_PCNT * 2)
                || isDesc(trend_1m) && currentPosition.unRealizedProfit > 0) {
                placeSellOrder(); // Stop Loss
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.1) {
                placeSellOrder(); // Backup Take Profit
            }
        } else if (currentPosition.positionAmt < 0) { //short position
            if (isAsc(trend_5m)
                || currentPosition.unRealizedProfit < -(TARGET_PROFIT + LIMIT_ORDER_FEE_PCNT * 2)
                || isDesc(trend_1m) && currentPosition.unRealizedProfit > 0) {
                placeBuyOrder(); // Stop Loss
            } else if (currentPosition.unRealizedProfit >= TARGET_PROFIT * 1.1) {
                placeBuyOrder(); // Backup Take Profit
            }
        }
    }
}

function isDesc(trend, coefficient) {
    let c = coefficient || 1;
    return trend <= -TREND_INDICATOR_DELTA * c;
}

function isFlat(trend, coefficient) {
    let c = coefficient || 1;
    return trend > -TREND_INDICATOR_DELTA * c && trend < TREND_INDICATOR_DELTA * c;
}

function isAsc(trend, coefficient) {
    let c = coefficient || 1;
    return trend >= TREND_INDICATOR_DELTA * c;
}

function allTrendsDesc() {
    return isDesc(trend_1m, 1) && isDesc(trend_5m, 5) && isDesc(trend_15m, 3) && isDesc(trend_30m, 6) && isDesc(trend_1h, 12);
}

function allTrendsAsc() {
    return isAsc(trend_1m, 1) && isAsc(trend_5m, 5) && isAsc(trend_15m, 3) && isAsc(trend_30m, 6) && isAsc(trend_1h, 12);
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
    let first = ptArray[5];
    let last = ptArray[0];
    let trend = computeDeltaInPcnt(first, last);
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

function pollOrders(symbol) {
    dataManager.requestOrders(symbol, orders => {
        //let filteredOrders = orders.filter(o => o.symbol === instrumentSymbol);
        if (orders.length > 0) {
            uiUtils.showElement("ttRemoveAllOrdersButton");
        } else {
            uiUtils.hideElement("ttRemoveAllOrdersButton");
        }
        document.getElementById("openOrdersDataGrid").innerHTML = '';
        for (let order of orders) {
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
