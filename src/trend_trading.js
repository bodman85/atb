const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const PREDICTION_BUFFER_SIZE = 10;
const TREND_BUFFER_SIZE = 3;

let PRICE_PREDICTIONS = new CircularBuffer(PREDICTION_BUFFER_SIZE);
let PRICE_TREND = new CircularBuffer(TREND_BUFFER_SIZE);//0.0025

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

let previousPrice;
let currentPrice;
let currentBidPrice;
let currentAskPrice;
let autoTradePnl = 0;
let currentPositionAmount = 0;
let currentPosition = {};
let priceTrendLastUpdated = 0;

window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", removeAllOrders);
    document.getElementById('tradeAutoSwitcher').addEventListener('click', handleTradeAutoSwitcher);
    setInterval(pollOrders, 3000);
    setInterval(pollPositions, 1000);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        previousPrice = currentPrice;
        currentPrice = ticker['c'];
        document.getElementById('ttPrice').value = currentPrice;
        let currentDelta = parseFloat((currentPrice - previousPrice) / previousPrice * 100);
        PRICE_TREND.enq(currentDelta);
        priceTrendLastUpdated = Date.now();
        let priceTrend = getPriceTrend();
        document.getElementById('priceTrend').value = priceTrend > 0 ? 'ASC' : priceTrend < 0 ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(priceTrend, 'priceTrend');
        
        if (document.getElementById("tradeAutoSwitcher").checked) {
            autoTrade();
            displayAutoTradePnl();
        } else {
            displayPnlFor(currentPosition);
        }
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        currentBidPrice = ticker['b'];
        currentAskPrice = ticker['a'];
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        let fairPrice = computeFairPrice(data);
        let currentPrice = document.getElementById('ttPrice').value;
        let futureDelta = parseFloat((fairPrice - currentPrice) / currentPrice * 100);
        PRICE_PREDICTIONS.enq(futureDelta);
        let priceForecast = getPriceForecast();
        document.getElementById('priceForecast').value = priceForecast > 0 ? 'UP' : priceForecast < 0 ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });
}

function handleTradeAutoSwitcher() {
    if (document.getElementById("tradeAutoSwitcher").checked) {
        uiUtils.disableElement('ttQuantity');
        uiUtils.disableElement('buyInstrumentButton');
        uiUtils.disableElement('sellInstrumentButton');
    } else {
        uiUtils.enableElement('ttQuantity');
        uiUtils.enableElement('buyInstrumentButton');
        uiUtils.enableElement('sellInstrumentButton');
        autoTradePnl = 0;
    }
}

function autoTrade() {
    if (currentPositionAmount === 0) {
        let trend = getPriceTrend();
        if (getPriceForecast() == 1 && trend >=0 ) {
            placeBuyOrder();
            currentPositionAmount = parseInt(document.getElementById('ttQuantity').value);
        } else if (getPriceForecast() == -1 && trend <= 0) {
            placeSellOrder();
            currentPositionAmount = -parseInt(document.getElementById('ttQuantity').value);
        }
    } else {
        let trend = getPriceTrend();
        let pnlPcnt = calculatePnlPcntFor(currentPosition);
        let pnlUsd = calculatePnlUsdFor(currentPosition);
        if (currentPositionAmount > 0) {        //long position is opened
            if ((trend === -1 && pnlPcnt < -0.025) ||
                (trend === 0 && pnlPcnt > 0.025)) {
                placeSellOrder();
                currentPositionAmount = 0;
                autoTradePnl = isNaN(pnlUsd) ? autoTradePnl : autoTradePnl + pnlUsd;
            }
        } else if (currentPositionAmount < 0) { //short position is opened
            if ((trend === 1 && pnlPcnt < -0.025) ||
                (trend === 0 && pnlPcnt > 0.025)) {
                placeBuyOrder();
                currentPositionAmount = 0;
                autoTradePnl = isNaN(pnlUsd) ? autoTradePnl : autoTradePnl + pnlUsd;
            }
        }
    }
}

function getPriceTrend() {
    if (Date.now() - priceTrendLastUpdated > 1000) { 
        return 0;
    }

    let accu = 0;
    let ptArray = PRICE_TREND.toarray();
    for (let p of ptArray) {
        accu += p;
    }
    if (accu >= 0.0025) {
        return 1;
    } else if (accu <= -0.0025) {
        return -1;
    } else {
        return 0;
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
    return parseFloat((askVolume + bidVolume) / (askOrders + bidOrders)).toFixed(2);
}

function getPriceForecast() {
    let accu = 0;
    let ppArray = PRICE_PREDICTIONS.toarray();
    for (let p of ppArray) {
        if (Math.sign(ppArray[0]) != Math.sign(p)) {
            return 0;
        }
        accu += p;
    }
    if (accu >= 0.025) {
        return 1;
    } else if (accu <= -0.025) {
        return -1;
    } else return 0;
}

function placeBuyOrder() {
    dataManager.placeOrder(buildOrder('BUY'));
}

function placeSellOrder() {
    dataManager.placeOrder(buildOrder('SELL'));
}

function removeAllOrders() {
    dataManager.cancelAllOrdersFor(instrumentSymbol);
}

function buildOrder(side) {
    let type = 'MARKET';
    let orderPrice = '';
    if (document.getElementById("limitOrdersAutoSwitcher").checked) {
        type = 'LIMIT';
        if (side === 'BUY') {
            orderPrice = currentBidPrice;
        } else {
            orderPrice = currentAskPrice;
        }
    }
    let order = {
        side: side,
        symbol: document.getElementById('ttInstrument').value,
        quantity: document.getElementById('ttQuantity').value,
        price: orderPrice,
        type: type,
        recvWindow: 30000,
        timeInForce: 'GTC'
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

function pollPositions() {
    dataManager.requestPositions(positions => {
        let targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && instrumentSymbol === p.symbol);
        document.getElementById("ttPositionsDataGrid").innerHTML = '';
        if (!targetPositions.length) {
            currentPosition = {};
        }
        for (let position of targetPositions) {
            currentPosition = position;
            displayPosition(position);
        }
    });
}

function displayPosition(position) {
    let row = uiUtils.createTableRow();
    row.appendChild(uiUtils.createTextColumn(position.symbol));
    row.appendChild(uiUtils.createTextColumn(position.positionAmt));
    row.appendChild(uiUtils.createTextColumn(parseFloat(position.entryPrice).toFixed(4)));
    row.appendChild(uiUtils.createTextColumn(parseFloat(position.markPrice).toFixed(4)));
    row.appendChild(uiUtils.createTextColumn(parseFloat(position.liquidationPrice).toFixed(4)));
    row.appendChild(uiUtils.createTextColumn(parseFloat(position.unRealizedProfit).toFixed(6)));
    row.appendChild(uiUtils.createIconButtonColumn("fa-times", function () { dataManager.closePosition(position) }));
    document.getElementById("ttPositionsDataGrid").appendChild(row);
}

function calculatePnlUsdFor(position) {
    return parseFloat((currentPrice - position.entryPrice) * position.notionalValue);
}

function calculatePnlPcntFor(position) {
    let totalCosts = position.entryPrice * Math.abs(position.notionalValue);
    return parseFloat(calculatePnlUsdFor(position) / totalCosts * 100);
}

function displayPnlFor(position) {
    let pnlUsd = calculatePnlUsdFor(position);
    pnlUsd = isNaN(pnlUsd) ? 0 : pnlUsd;
    let pnlPcnt = calculatePnlPcntFor(position);
    pnlPcnt = isNaN(pnlPcnt) ? 0 : pnlPcnt;
    document.getElementById("ttTotalPnl").innerHTML = `Total \u2248 ${pnlUsd.toFixed(2)}$ (${pnlPcnt.toFixed(2)}%)`;
    uiUtils.paintRedOrGreen(pnlUsd, 'ttTotalPnl');
}

function displayAutoTradePnl() {
    document.getElementById("ttTotalPnl").innerHTML = `Total \u2248 ${autoTradePnl.toFixed(2)}$`;
    uiUtils.paintRedOrGreen(autoTradePnl, 'ttTotalPnl');
}