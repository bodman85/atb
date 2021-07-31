const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const FORECAST_BUFFER_SIZE = 10;
const FORECAST_DELTA_EDGE_VALUE = 0.1;

const TREND_DELTA_PCNT = 0.05;
const RAPID_FALL_DELTA_PCNT = 0.2;
const TAKE_PROFIT_FOLLOW_TREND_PCNT = 0.25;
const TAKE_PROFIT_RAPID_FALL_PCNT = 0.5;
const TAKE_PROFIT_SWING_IN_CHANNEL_PCNT = 0.25;
const STOP_LOSS_PRICE_PCNT = 0.25;
const LIMIT_ORDER_FEE_PCNT = 0.01;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);

let currentPrice = 0;
let currentBidPrice = 0;
let currentAskPrice = 0;
let totalPnlPcnt = 0;

let currentPosition = {};

let trend_1m = 0;
let slidingAverage15m = 0;
let slidingAverage1 = 0;
let slidingAverage2 = 0;
let slidingAverage3 = 0;

let price3SecondsAgo = currentPrice;
let rapidPriceFallStart = 0;
let rapidPriceFallFinish = 0;
let flatCounter = 0;


window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeOrder('BUY', 'MARKET') });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeOrder('SELL', 'MARKET') });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });

    setInterval(function () { detectRapidPriceFall(instrumentSymbol) }, 3000);

    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    setInterval(pollCurrentPosition, 5000);
    setInterval(function () { pollOrders(instrumentSymbol) }, 5000);
    setInterval(displayCurrentPosition, 1000);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        currentPrice = parseFloat(ticker['c']);
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
        document.getElementById('priceTrend').value = isTrendAsc() ? 'ASC' : isTrendDesc() ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(slidingAverage2 - slidingAverage3, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1m', kline => {
        trend_1m = getPcntDelta(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '15m', kline => {
        slidingAverage15m = computeAverage(kline.k['l'], kline.k['h']);
    });
    dataManager.pollKlinesFor(instrumentSymbol, '30m', kline => {
        slidingAverage1 = computeAverage(kline.k['l'], kline.k['h']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1h', kline => {
        slidingAverage2 = computeAverage(kline.k['l'], kline.k['h']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '2h', kline => {
        slidingAverage3 = computeAverage(kline.k['l'], kline.k['hc']);
    });
}

function autoTrade() {
    if (!currentPosition.positionAmt) { // No position opened
        if (isTrendAsc()) {
            printTrendInfo();
            console.log(`ASCENDING trend started`);
            placeOrder('BUY', 'MARKET');
            let takeProfitPrice = addPcntDelta(currentPrice, TAKE_PROFIT_FOLLOW_TREND_PCNT);
            placeOrder('SELL', 'LIMIT', takeProfitPrice);
            let stopLossPrice = addPcntDelta(currentPrice, -STOP_LOSS_PRICE_PCNT);
            placeOrder('SELL', 'STOP', stopLossPrice);
        } else if (isTrendDesc()) {
            printTrendInfo();
            console.log(`DESCENDING trend started`);
            placeOrder('SELL', 'MARKET');
            let takeProfitPrice = addPcntDelta(currentPrice, -TAKE_PROFIT_FOLLOW_TREND_PCNT);
            placeOrder('BUY', 'LIMIT', takeProfitPrice);
            let stopLossPrice = addPcntDelta(currentPrice, STOP_LOSS_PRICE_PCNT);
            placeOrder('BUY', 'STOP', stopLossPrice);
        } else { // price is swinging in channel
            if (getPcntDelta(slidingAverage2, slidingAverage15m) >= TAKE_PROFIT_SWING_IN_CHANNEL_PCNT) {
                console.log(`Market is overbought`);
                printTrendInfo();
                placeOrder('SELL', 'MARKET');
                let takeProfitPrice = addPcntDelta(currentPrice, -TAKE_PROFIT_SWING_IN_CHANNEL_PCNT);
                placeOrder('BUY', 'LIMIT', takeProfitPrice);
                let stopLossPrice = addPcntDelta(currentPrice, STOP_LOSS_PRICE_PCNT);
                placeOrder('BUY', 'STOP', stopLossPrice);

            } else if (getPcntDelta(slidingAverage2, slidingAverage15m) <= -TAKE_PROFIT_SWING_IN_CHANNEL_PCNT) {
                console.log(`Market is oversold`);
                printTrendInfo();
                placeOrder('BUY', 'MARKET');
                let takeProfitPrice = addPcntDelta(currentPrice, TAKE_PROFIT_SWING_IN_CHANNEL_PCNT);
                placeOrder('SELL', 'LIMIT', takeProfitPrice);
                let stopLossPrice = addPcntDelta(currentPrice, -STOP_LOSS_PRICE_PCNT);
                placeOrder('SELL', 'STOP', stopLossPrice);
            }
        }
    } else if (currentPosition.positionAmt > 0 && isTrendDesc()) { // Long position opened and Trend turned to descending
        placeOrder('SELL', 'LIMIT');

    } else if (currentPosition.positionAmt < 0 && isTrendAsc()) {// Short position opened and trend turned to acsending
        placeOrder('BUY', 'LIMIT');
    }
}

function detectRapidPriceFall() {
    if (!currentPosition.positionAmt) { // No position
        if (getPcntDelta(price3SecondsAgo, currentPrice) <= -RAPID_FALL_DELTA_PCNT) {
            flatCounter = 0;
            if (rapidPriceFallStart === 0) {
                rapidPriceFallStart = price3SecondsAgo;
                console.log(`Rapid fall started from price ${rapidPriceFallStart}`);
            } else {
                console.log(`Rapid price fall goes on`);
            }
        } else if (getPcntDelta(price3SecondsAgo, currentPrice) >= RAPID_FALL_DELTA_PCNT / 2) {
            flatCounter = 0;
            if (rapidPriceFallStart !== 0) {
                rapidPriceFallFinish = currentPrice;
            }
        } else {
            if (rapidPriceFallStart !== 0) {
                flatCounter++;
                if (flatCounter === 10) {
                    console.log(`Rapid price fall finished and stuck at low point`);
                    rapidPriceFallFinish = currentPrice;
                }
            }
        }
        if (rapidPriceFallFinish > 0) {
            console.log(`Rapid fall finished with price ${rapidPriceFallFinish}`);
            if (getPcntDelta(rapidPriceFallStart, rapidPriceFallFinish) <= -TAKE_PROFIT_RAPID_FALL_PCNT) {
                if (document.getElementById("tradeAutoSwitcher").checked) {
                    placeOrder('BUY', 'MARKET');
                    let takeProfitPrice = rapidPriceFallStart;
                    placeOrder('SELL', 'LIMIT', takeProfitPrice);
                    let stopLossPrice = addPcntDelta(rapidPriceFallFinish, -STOP_LOSS_PRICE_PCNT);
                    placeOrder('SELL', 'STOP', stopLossPrice);
                }
            } else {
                console.log(`Rapid price fall was insignificant. No position will be opened.`);
            }
            flatCounter = 0;
            rapidPriceFallStart = 0;
            rapidPriceFallFinish = 0;
        }
    }
    price3SecondsAgo = currentPrice;
}

function printTrendInfo() {
    console.log(`slidingAverage15m: ${slidingAverage15m}`);
    console.log(`slidingAverage1: ${slidingAverage1}`);
    console.log(`slidingAverage2: ${slidingAverage2}`);
    console.log(`slidingAverage3: ${slidingAverage3}`);
}

function isTrendAsc() {
    return slidingAverage1 > 0 && slidingAverage2 > 0 && slidingAverage3 > 0
        && getPcntDelta(slidingAverage2, slidingAverage1) >= TREND_DELTA_PCNT
        && getPcntDelta(slidingAverage3, slidingAverage2) >= TREND_DELTA_PCNT
        && trend_1m > 0
}

function isTrendDesc() {
    return slidingAverage1 > 0 && slidingAverage2 > 0 && slidingAverage3 > 0
        && getPcntDelta(slidingAverage1, slidingAverage2) >= TREND_DELTA_PCNT
        && getPcntDelta(slidingAverage2, slidingAverage3) >= TREND_DELTA_PCNT
        && trend_1m < 0 && rapidPriceFallStart === 0
}

function getPcntDelta(oldValue, newValue) {
    return ((newValue - oldValue) / oldValue) * 100;
}

function addPcntDelta(value, delta) {
    return parseFloat(value + delta / 100 * value).toFixed(2);
}

function computeAverage(first, second) {
    return ((first * 1 + second * 1) / 2);
}

function pollCurrentPosition() {
    dataManager.requestPositions(positions => {
        let targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && instrumentSymbol === p.symbol);
        if (targetPositions.length == 0) {
            if (currentPosition.unRealizedProfit) {
                totalPnlPcnt += parseFloat(currentPosition.unRealizedProfit);
            }
            currentPosition = {};
            //Cancelling all pending limit orders...
            dataManager.cancelAllOrdersFor(instrumentSymbol);
        } else {
            let position = targetPositions[0];
            currentPosition.symbol = position.symbol;
            currentPosition.positionAmt = position.positionAmt;
            currentPosition.entryPrice = position.entryPrice;
            currentPosition.unRealizedProfit = computePnlPcntFor(position);
        }
    });
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
    return accu;
}

function handleTradeAutoSwitcher() {
    if (document.getElementById("tradeAutoSwitcher").checked) {
        uiUtils.disableElement('ttQuantity');
        uiUtils.disableElement('buyInstrumentButton');
        uiUtils.disableElement('sellInstrumentButton');
        pollCurrentPosition();
    } else {
        uiUtils.enableElement('ttQuantity');
        uiUtils.enableElement('buyInstrumentButton');
        uiUtils.enableElement('sellInstrumentButton');
    }
}

function placeOrder(side, type, price) {
    let order = {
        side: side,
        symbol: instrumentSymbol,
        quantity: document.getElementById('ttQuantity').value,
        type: type,
        recvWindow: 30000
    }
    let orderPrice = price;
    if (type === 'MARKET') {
        //opening trade should always be a MARKET trade
        currentPosition.positionAmt = order.quantity;
    } else if (type === 'LIMIT') {
        orderPrice = price ? price : currentBidPrice; //bid and ask prices swapped intentionally to execute limit orders immediately
        if (side === 'BUY') {
            orderPrice = price ? price : currentAskPrice;
        }
        Object.assign(order, { price: orderPrice, timeInForce: 'GTC' });
    } else if (type === 'STOP') {
        let triggerPrice = (side === 'BUY' ? addPcntDelta(orderPrice, 0.05) : addPcntDelta(orderPrice, -0.05));
        Object.assign(order, { price: orderPrice, stopPrice: triggerPrice, timeInForce: 'GTC' });
    }
    console.log(`Placing ${type} ${side} order with price ${orderPrice}...`);
    dataManager.placeOrder(order);
}

function pollOrders(symbol) {
    dataManager.requestOrders(symbol, orders => {
        let filteredOrders = orders.filter(o => o.status === 'NEW');
        if (filteredOrders.length > 0) {
            uiUtils.showElement("ttRemoveAllOrdersButton");
        } else {
            uiUtils.hideElement("ttRemoveAllOrdersButton");
        }
        document.getElementById("openOrdersDataGrid").innerHTML = '';
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
