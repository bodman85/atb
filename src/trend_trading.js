const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const ONE_SECOND = 5000;
const FIVE_SECONDS = 5000;
const ONE_MINUTE = 60000; 
const ONE_HOUR = 3600000; 

const FORECAST_BUFFER_SIZE = 10;
const AVG_PRICES_BUFFER_SIZE = 240;
const FORECAST_DELTA_EDGE_VALUE = 0.1;

const TAKE_PROFIT_PCNT = 0.5;
const STOP_LOSS_PRICE_PCNT = 0.2;

const LIMIT_ORDER_FEE_PCNT = 0.01;
const MARKET_ORDER_FEE_PCNT = 0.05;

const FOLLOW_TREND_TRIGGER_PCNT = 0.15;
const OSCILLATOR_TRIGGER_PCNT = 1;
const REPLACE_STOP_ORDER_TRIGGER_PCNT = 1.5;
const STOP_ORDER_TRIGGER_PRICE_PCNT = 0.1;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);
let AVG_PRICES = new CircularBuffer(AVG_PRICES_BUFFER_SIZE);

let currentPrice = 0;
let currentBidPrice = 0;
let currentAskPrice = 0;
let totalPnlPcnt = 0;

let currentPosition = {};
let currentStopOrder = {};

let oscillatorMaxFast = 0;
let oscillatorMinFast = 0;
let oscillatorSlidingAverageFast = 0;
let oscillatorSlidingAverageSlow = 0;

let trend_1m = 0;
let trend_3m = 0;
let trend_5m = 0;
let trend_15m = 0;
let trend_30m = 0;
let movingAverageFast = 0;
let movingAverageMid = 0;
let movingAverageSlow = 0;

window.onload = function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeOrder('BUY', 'MARKET') });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeOrder('SELL', 'MARKET') });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });

    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    initAvgPrices();
    setInterval(initAvgPrices, ONE_HOUR);
    setInterval(pollCurrentPosition, FIVE_SECONDS);
    setInterval(function () { pollOrders(instrumentSymbol) }, FIVE_SECONDS);
    setInterval(displayCurrentPosition, ONE_SECOND);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        currentPrice = parseFloat(ticker['c']);
        document.getElementById('ttPrice').value = currentPrice;
        if (document.getElementById("tradeAutoSwitcher").checked) {
            autoTrade();
        }
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        currentBidPrice = parseFloat(ticker['b']);
        currentAskPrice = parseFloat(ticker['a']);
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        document.getElementById('priceTrend').value = isTrendAsc() ? 'ASC' : isTrendDesc() ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(movingAverageMid - movingAverageSlow, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });

    let lastEnq = Date.now();
    dataManager.pollKlinesFor(instrumentSymbol, '1m', kline => {
        if (Date.now() - lastEnq < ONE_MINUTE) {
            AVG_PRICES.shift(); //remove latest value
        } else {
            lastEnq = Date.now();
        }
        //enqueue new or update existing value in CirculrBuffer
        AVG_PRICES.enq(computeAverage(kline.k['l'], kline.k['h']));
        //compute moving averages
        oscillatorSlidingAverageSlow = computeAveragePriceForLatestMinutes(30);
        movingAverageFast = computeAveragePriceForLatestMinutes(60);
        movingAverageMid = computeAveragePriceForLatestMinutes(120);
        movingAverageSlow = computeAveragePriceForLatestMinutes(240);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1m', kline => {
        trend_1m = getPcntGrowth(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '3m', kline => {
        trend_3m = getPcntGrowth(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '5m', kline => {
        trend_5m = getPcntGrowth(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '15m', kline => {
        trend_15m = getPcntGrowth(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '30m', kline => {
        trend_30m = getPcntGrowth(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '5m', kline => {
        oscillatorMinFast = kline.k['l'];
        oscillatorMaxFast = kline.k['h'];
        oscillatorSlidingAverageFast = computeAverage(oscillatorMinFast, oscillatorMaxFast);
    });
}

function initAvgPrices() {
    dataManager.requestKlines(instrumentSymbol, '1m', 240, klines => {
        klines.forEach(kline => AVG_PRICES.enq(parseFloat(computeAverage(kline[2], kline[3])).toFixed(2)));
    });
}

function autoTrade() {
    if (!currentPosition.positionAmt) { // No position opened
        if (isTrendAsc()) {
            console.log(`ASCENDING trend detected at ${new Date().toLocaleString()}`);
            placeOrder('BUY', 'MARKET');
            placeTakeProfitOrder();
            placeStopLossOrder();
        } else if (isTrendDesc()) {
            console.log(`DESCENDING trend detected at ${new Date().toLocaleString()}`);
            placeOrder('SELL', 'MARKET');
            placeTakeProfitOrder();
            placeStopLossOrder();
        }
        //else { // price is swinging in channel
        //    if (isMarketOverbought()) {
        //        console.log(`Market is OVERBOUGHT at ${new Date().toLocaleString()}`);
        //        placeOrder('SELL', 'MARKET');
        //        placeTakeProfitOrder();
        //        placeStopLossOrder();
        //    } else if (isMarketOversold()) {
        //        console.log(`Market is OVERSOLD at ${new Date().toLocaleString()}`);
        //        placeOrder('BUY', 'MARKET');
        //        placeTakeProfitOrder();
        //        placeStopLossOrder();
        //    }
        //}
    } else {
        if (currentPosition.positionAmt > 0) { //long position
            if (getPcntGrowth(currentStopOrder.stopPrice, currentPrice) > REPLACE_STOP_ORDER_TRIGGER_PCNT * STOP_LOSS_PRICE_PCNT) {
                dataManager.cancelAllOrdersFor(instrumentSymbol);
                placeStopLossOrder();
                placeTakeProfitOrder();
            }
        }
        if (currentPosition.positionAmt < 0) { //short position
            if (getPcntGrowth(currentStopOrder.stopPrice, currentPrice) < -REPLACE_STOP_ORDER_TRIGGER_PCNT * STOP_LOSS_PRICE_PCNT) {
                dataManager.cancelAllOrdersFor(instrumentSymbol);
                placeStopLossOrder();
                placeTakeProfitOrder();
            }
        }
    }
}

function printTrendInfo() {
    //console.log(`Latest: ${AVG_PRICES.get(0)} First: ${AVG_PRICES.get(AVG_PRICES_BUFFER_SIZE - 1)}`);
    console.log(`oscillatorSlidingAverageFast: ${oscillatorSlidingAverageFast}`);
    console.log(`oscillatorSlidingAverageSlow: ${oscillatorSlidingAverageSlow}`);
    console.log(`movingAverageFast: ${movingAverageFast}`);
    console.log(`movingAverageMid: ${movingAverageMid}`);
    console.log(`movingAverageSlow: ${movingAverageSlow}`);
}

function isTrendAsc() {
    return movingAverageFast > 0 && movingAverageMid > 0 && movingAverageSlow > 0
        && getPcntGrowth(movingAverageMid, movingAverageFast) >= FOLLOW_TREND_TRIGGER_PCNT
        && getPcntGrowth(movingAverageSlow, movingAverageMid) >= FOLLOW_TREND_TRIGGER_PCNT
        && trend_1m > 0 && trend_3m > 0 && trend_5m > 0 && trend_15m > 0 && trend_30m > 0
}

function isTrendDesc() {
    return movingAverageFast > 0 && movingAverageMid > 0 && movingAverageSlow > 0
        && getPcntGrowth(movingAverageMid, movingAverageFast) <= -FOLLOW_TREND_TRIGGER_PCNT
        && getPcntGrowth(movingAverageSlow, movingAverageMid) <= -FOLLOW_TREND_TRIGGER_PCNT
        && trend_1m < 0 && trend_3m < 0 && trend_5m < 0 && trend_15m < 0 && trend_30m < 0
}

function isMarketOverbought() {
    return oscillatorSlidingAverageFast > 0 && oscillatorSlidingAverageSlow > 0 && oscillatorMaxFast > 0 && currentPrice > oscillatorMaxFast
        && getPcntGrowth(oscillatorSlidingAverageSlow, oscillatorSlidingAverageFast) >= OSCILLATOR_TRIGGER_PCNT
}

function isMarketOversold() {
    return oscillatorSlidingAverageFast > 0 && oscillatorSlidingAverageSlow > 0 && oscillatorMinFast >0 && currentPrice < oscillatorMinFast
        && getPcntGrowth(oscillatorSlidingAverageSlow, oscillatorSlidingAverageFast) <= -OSCILLATOR_TRIGGER_PCNT
}

function getPcntGrowth(oldValue, newValue) {
    return ((newValue*1 - oldValue*1) / oldValue*1) * 100;
}

function addPcntDelta(value, delta) {
    return parseFloat(value*1 + delta / 100 * value).toFixed(2);
}

function computeAverage(first, second) {
    return parseFloat((first*1 + second*1) / 2).toFixed(2);
}

function computeAveragePriceForLatestMinutes(latestMinutes) {
    let accu = 0;
    for (let i = 0; i < latestMinutes; i++) {
        accu += parseFloat(AVG_PRICES.get(i));
    }
    return parseFloat(accu / latestMinutes).toFixed(2);
}

function pollCurrentPosition() {
    dataManager.requestPositions(positions => {
        let targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && instrumentSymbol === p.symbol);
        if (targetPositions.length == 0) {
            if (currentPosition.unRealizedProfit) {
                totalPnlPcnt += parseFloat(currentPosition.unRealizedProfit);
            }
            currentPosition = {};
            //console.log(`Cancelling all pending limit orders...`);
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
    let pnl = 0;
    if (position.positionAmt > 0) {
        pnl = Math.abs(position.positionAmt)*((currentPrice - position.entryPrice) / position.entryPrice * 100 - 2 * MARKET_ORDER_FEE_PCNT);
    } else if (position.positionAmt < 0) {
        pnl = Math.abs(position.positionAmt) * ((position.entryPrice - currentPrice) / position.entryPrice * 100 - 2 * MARKET_ORDER_FEE_PCNT);
    }
    return pnl;
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

function placeOrder(side, type, price, qty) {
    let order = {
        symbol: instrumentSymbol,
        side: side,
        type: type,
        quantity: qty ? 1*qty : 1 * document.getElementById('ttQuantity').value,
        recvWindow: 30000
    }
    let orderPrice = currentPrice;
    switch (type) {
        case 'MARKET':
            //opening trade should always be a MARKET trade
            currentPosition.entryPrice = currentPrice;
            currentPosition.positionAmt = side === 'BUY' ? order.quantity : -order.quantity;
            console.log(`Placing ${type} ${side} order with price ${orderPrice}...`);
            break;
        case 'LIMIT':
            orderPrice = price ? price : currentBidPrice; //bid and ask prices swapped intentionally to execute limit orders immediately
            if (side === 'BUY') {
                orderPrice = price ? price : currentAskPrice;
            }
            Object.assign(order, { price: orderPrice, timeInForce: 'GTC' });
            break;
        case 'STOP':
            orderPrice = price;
            let triggerPrice = (side === 'BUY' ? addPcntDelta(orderPrice, STOP_ORDER_TRIGGER_PRICE_PCNT) : addPcntDelta(orderPrice, -STOP_ORDER_TRIGGER_PRICE_PCNT));
            Object.assign(order, { price: price, stopPrice: triggerPrice, timeInForce: 'GTC' });
            break;
        case 'STOP_MARKET':
            Object.assign(order, { stopPrice: price, timeInForce: 'GTC' });
            break;
    }
    dataManager.placeOrder(order, order => {
        if (order.type === 'STOP_MARKET') {
            currentStopOrder = order;
        }
    });
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
            let price = order.type === 'LIMIT' ? order.price : order.stopPrice;
            row.appendChild(uiUtils.createTextColumn(parseFloat(price).toFixed(4)));
            if (order.side.toUpperCase() === 'BUY') {
                row.appendChild(uiUtils.createTextColumn(order.side, 'text-success'));
            } else {
                row.appendChild(uiUtils.createTextColumn(order.side, 'text-danger'));
            }
            row.appendChild(uiUtils.createTextColumn(order.type));
            row.appendChild(uiUtils.createTextColumn(order.origQty));
            row.appendChild(uiUtils.createIconButtonColumn("fa-times", function () { dataManager.cancelOrder(order) }));
            document.getElementById("openOrdersDataGrid").appendChild(row);

            if (order.type === 'STOP_MARKET') {
                currentStopOrder = order;
            }
        }
        if (currentPosition.positionAmt && document.getElementById("tradeAutoSwitcher").checked) {
            let quantity = Math.abs(currentPosition.positionAmt);
            if (filteredOrders.length !== 2) {
                dataManager.cancelAllOrdersFor(instrumentSymbol);
                placeStopLossOrder();
                placeTakeProfitOrder();
            } else if (filteredOrders[0].origQty != quantity || filteredOrders[1].origQty != quantity ) {
                dataManager.cancelAllOrdersFor(instrumentSymbol);
                placeStopLossOrder(quantity);
                placeTakeProfitOrder(quantity);
            }
        }
    });
}

async function placeStopLossOrder(quantity) {
    if (currentPosition.positionAmt > 0) { //long position
        let stopLossPrice = addPcntDelta(currentPrice, -STOP_LOSS_PRICE_PCNT);
        await placeOrder('SELL', 'STOP_MARKET', stopLossPrice, quantity);

    }
    if (currentPosition.positionAmt < 0) { //short position
        let stopLossPrice = addPcntDelta(currentPrice, STOP_LOSS_PRICE_PCNT);
        await placeOrder('BUY', 'STOP_MARKET', stopLossPrice);
    }
}

async function placeTakeProfitOrder(quantity) {
    if (currentPosition.positionAmt > 0) { //long position
        let takeProfitPrice = addPcntDelta(currentPosition.entryPrice, TAKE_PROFIT_PCNT);
        placeOrder('SELL', 'LIMIT', takeProfitPrice, quantity);
    }
    if (currentPosition.positionAmt < 0) { //short position
        let takeProfitPrice = addPcntDelta(currentPosition.entryPrice, -TAKE_PROFIT_PCNT);
        placeOrder('BUY', 'LIMIT', takeProfitPrice);
    }
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
