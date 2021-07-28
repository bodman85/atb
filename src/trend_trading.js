const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const FORECAST_BUFFER_SIZE = 10;

const FORECAST_DELTA_EDGE_VALUE = 0.1;

const TREND_DELTA_PCNT = 0.05;
const TAKE_PROFIT_PCNT = 1;
const STOP_LOSS_PCNT = 0.25;
const LIMIT_ORDER_FEE_PCNT = 0.01;
const LIMIT_ORDER_PENDING_TIME = 5000;

let FAIR_PRICE_DELTAS = new CircularBuffer(FORECAST_BUFFER_SIZE);

let previousPrice = 0;
let currentPrice = 0;
let currentBidPrice = 0;
let currentAskPrice = 0;
let totalPnl = 0;
let totalPnlPcnt = 0;

let orderLastPlaced = Date.now();
let currentPosition = {};

let trend_1m = 0;
let slidingAverage_30m = 0;
let slidingAverage_1h = 0;
let slidingAverage_4h = 0;


window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", function () { dataManager.cancelAllOrdersFor(instrumentSymbol) });

    setInterval(function () { detectRapidPriceFall(instrumentSymbol) }, 3000);

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

        if (takeProfitPrice > 0 && currentPrice >= takeProfitPrice) {
            console.log(new Date().toLocaleString());
            console.log(`Position closed with PROFIT: ${getPcntChange(rapidPriceFallFinish, currentPrice)} %`);
            totalPnl += getPcntChange(rapidPriceFallFinish, currentPrice);
            console.log(`Total PnL : ${totalPnl}`);
            resetStopPrices();
        } else if (stopLossPrice > 0 && currentPrice <= stopLossPrice) {
            console.log(new Date().toLocaleString());
            console.log(`Position closed with LOSS: ${getPcntChange(rapidPriceFallFinish, currentPrice)} %`);
            totalPnl += getPcntChange(rapidPriceFallFinish, currentPrice);
            console.log(`Total PnL : ${totalPnl}`);
            resetStopPrices();
        }

        if (!dataManager.isEmpty(currentPosition)) {
            currentPosition.unRealizedProfit = computePnlPcntFor(currentPosition);
        }

        document.getElementById('ttPrice').value = currentPrice;
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        currentBidPrice = parseFloat(ticker['b']);
        currentAskPrice = parseFloat(ticker['a']);
        if (document.getElementById("tradeAutoSwitcher").checked) {
            autoTrade();
        }
    });

    function autoTrade() {
        if (!currentPosition.positionAmt) { // No position
            if (isTrendAsc() && trend_1m > 0) {
                placeBuyOrder();
            } else if (isTrendDesc() && trend_1m < 0) {
                placeSellOrder();
            }
        }
    }

    dataManager.pollDepthFor(instrumentSymbol, data => {
        document.getElementById('priceTrend').value = isTrendAsc() ? 'ASC' : isTrendDesc() ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(slidingAverage_1h - slidingAverage_4h, 'priceTrend');

        let fairPriceDelta = parseFloat((computeFairPrice(data) - currentPrice) / currentPrice * 100);
        FAIR_PRICE_DELTAS.enq(fairPriceDelta);

        let priceForecast = getPriceForecastBasedOnBidAskRatio();

        document.getElementById('priceForecast').value = (priceForecast > FORECAST_DELTA_EDGE_VALUE) ? 'UP' : (priceForecast < -FORECAST_DELTA_EDGE_VALUE) ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1m', kline => {
        trend_1m = getPcntChange(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '30m', kline => {
        slidingAverage_30m = computeAverage(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '1h', kline => {
        slidingAverage_1h = computeAverage(kline.k['o'], kline.k['c']);
    });

    dataManager.pollKlinesFor(instrumentSymbol, '4h', kline => {
        slidingAverage_4h = computeAverage(kline.k['o'], kline.k['c']);
    });
}

function isTrendAsc() {
    return getPcntChange(slidingAverage_30m, slidingAverage_1h) >= TREND_DELTA_PCNT
        && getPcntChange(slidingAverage_1h, slidingAverage_4h) >= TREND_DELTA_PCNT
}
function isTrendDesc() {
    return getPcntChange(slidingAverage_30m, slidingAverage_1h) <= -TREND_DELTA_PCNT
        && getPcntChange(slidingAverage_1h, slidingAverage_4h) <= -TREND_DELTA_PCNT
}

let price3SecondsAgo = currentPrice;
let rapidPriceFallStart = 0;
let rapidPriceFallFinish = 0;
let takeProfitPrice = 0;
let stopLossPrice = 0;
let flatCounter = 0;

function detectRapidPriceFall() {
    if (stopLossPrice === 0 && takeProfitPrice === 0) {
        if (getPcntChange(price3SecondsAgo, currentPrice) <= -0.2) {
            flatCounter = 0;
            if (rapidPriceFallStart === 0) {
                rapidPriceFallStart = price3SecondsAgo;
                console.log(`Rapid fall started from price ${rapidPriceFallStart}`);
            } else {
                console.log(`Rapid price fall goes on`);
            }
        } else if (getPcntChange(price3SecondsAgo, currentPrice) >= 0.2) {
            flatCounter = 0;
            if (rapidPriceFallStart !== 0) {
                rapidPriceFallFinish = currentPrice;
                console.log(`Rapid fall finished with price ${rapidPriceFallFinish}`);
                if (getPcntChange(rapidPriceFallStart, rapidPriceFallFinish) <= -0.5) {
                    if (document.getElementById("tradeAutoSwitcher").checked) {
                        takeProfitPrice = rapidPriceFallStart;
                        stopLossPrice = rapidPriceFallFinish - 0.0025 * rapidPriceFallFinish;
                        console.log(`========================================================`);
                        console.log(new Date().toLocaleString());
                        console.log(`Long position will be opened with price ${currentPrice}`);
                        console.log(`Take Profit price: ${takeProfitPrice}`);
                        console.log(`Stop Loss price: ${stopLossPrice}`);
                        console.log(`========================================================`);
                    }
                } else {
                    console.log(`Rapid price fall was insignificant`);
                }
                resetRapidPriceFallDetector();
            }
        } else {
            if (rapidPriceFallStart !== 0) {
                flatCounter++;
                if (flatCounter === 10) {
                    console.log(`Rapid price fall was cancelled`);
                    resetRapidPriceFallDetector();
                }
            }
        }
    }
    price3SecondsAgo = currentPrice;
}

function resetRapidPriceFallDetector() {
    rapidPriceFallStart = 0;
    rapidPriceFallFinish = 0;
    flatCounter = 0;
}

function resetStopPrices() {
    takeProfitPrice = 0;
    stopLossPrice = 0;
}

function getPcntChange(oldValue, newValue) {
    return ((newValue - oldValue) / oldValue) * 100;
}

function computeAverage(first, second) {
    return ((first * 1 + second * 1) / 2);
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
                console.log('Position opened. Placing STOP-Orders');
                placeStopOrdersFor(position);
            }
            updateCurrentPosition(position.symbol, position.positionAmt, position.entryPrice, computePnlPcntFor(position))
        }
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

function placeBuyOrder(stopPrice) {
    if (stopPrice || (Date.now() - orderLastPlaced >= LIMIT_ORDER_PENDING_TIME)) {
        if (!stopPrice) {
            orderLastPlaced = Date.now();
        } 
        console.log('Placing buy order ...');
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
        console.log('Placing sell order ...');
        dataManager.placeOrder(buildOrder('SELL', stopPrice), function (order) {
            if (!stopPrice) {
                setTimeout(dataManager.cancelOrder, LIMIT_ORDER_PENDING_TIME, order);
            }
        });
    }
}

function placeStopOrdersFor(position) {
    if (position.positionAmt > 0) {
        let stopLossPrice = parseFloat(parseFloat(position.entryPrice) - position.entryPrice / 100 * STOP_LOSS_PCNT).toFixed(2)
        let takeProfitPrice = parseFloat(parseFloat(position.entryPrice) + position.entryPrice / 100 * TAKE_PROFIT_PCNT).toFixed(2)
        placeSellOrder(stopLossPrice);
        placeSellOrder(takeProfitPrice);
    } else if (position.positionAmt < 0) {
        let stopLossPrice = parseFloat(parseFloat(position.entryPrice) + position.entryPrice / 100 * STOP_LOSS_PCNT).toFixed(2)
        let takeProfitPrice = parseFloat(parseFloat(position.entryPrice) - position.entryPrice / 100 * TAKE_PROFIT_PCNT).toFixed(2)
        placeSellOrder(stopLossPrice);
        placeSellOrder(takeProfitPrice);
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
