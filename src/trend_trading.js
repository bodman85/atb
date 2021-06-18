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
let currentPosition = {};
let bookTicker = {};

window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", removeAllOrders);
    setInterval(pollOrders, 3000);
    setInterval(pollPositions, 3000);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        previousPrice = currentPrice;
        currentPrice = ticker['c'];
        document.getElementById('ttPrice').value = currentPrice;
        let currentDelta = parseFloat((currentPrice - previousPrice) / previousPrice * 100).toFixed(4);
        PRICE_TREND.enq(currentDelta);
        let priceTrend = getPriceTrend();
        document.getElementById('priceTrend').value = priceTrend > 0 ? 'ASC' : priceTrend < 0 ? 'DESC' : 'FLAT';
        uiUtils.paintRedOrGreen(priceTrend, 'priceTrend');

        displayPnlFor(currentPosition);
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        bookTicker = ticker;
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        let fairPrice = computeFairPrice(data);
        let currentPrice = document.getElementById('ttPrice').value;
        let futureDelta = parseFloat((fairPrice - currentPrice) / currentPrice * 100).toFixed(4);
        PRICE_PREDICTIONS.enq(futureDelta);
        let priceForecast = getPriceForecast();
        document.getElementById('priceForecast').value = priceForecast > 0 ? 'UP' : priceForecast < 0 ? 'DOWN' : '???';
        uiUtils.paintRedOrGreen(priceForecast, 'priceForecast');
    });
}

function getPriceTrend() {
    let accu = 0;
    let ptArray = PRICE_TREND.toarray();
    for (let p of ptArray) {
        accu += parseFloat(p);
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
        accu += parseFloat(p);
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
            orderPrice = bookTicker['b'];
        } else {
            orderPrice = bookTicker['a'];
        }
    }
    let order = {
        side: side,
        symbol: document.getElementById('ttInstrument').value,
        quantity: document.getElementById('ttQuantity').value,
        price: orderPrice,
        type: type,
        recvWindow: 60000,
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
        for (let position of targetPositions) {
            currentPosition = position;
//            const { markPrice, ...partialPosition } = position; copy all fields except markPrice
//            Object.assign(currentPosition, partialPosition);
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
    });
}

function calculatePnlUsdFor(position) {
    return parseFloat((currentPrice - position.entryPrice) * position.notionalValue).toFixed(2);
}

function calculatePnlPcntFor(position) {
    let totalCosts = position.entryPrice * Math.abs(position.notionalValue);
    return parseFloat(calculatePnlUsdFor(position) / totalCosts * 100).toFixed(2);
}

function displayPnlFor(position) {
    let pnlUsd = calculatePnlUsdFor(position);
    pnlUsd = isNaN(pnlUsd) ? 0 : pnlUsd;
    let pnlPcnt = calculatePnlPcntFor(position);
    pnlPcnt = isNaN(pnlPcnt) ? 0 : pnlPcnt;
    document.getElementById("ttTotalPnl").innerHTML = `Total \u2248 ${pnlUsd}$ (${pnlPcnt}%)`;
    uiUtils.paintRedOrGreen(pnlUsd, 'ttTotalPnl');
}