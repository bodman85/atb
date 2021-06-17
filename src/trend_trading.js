const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

let bookTicker = {};

window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", removeAllOrders);
    setInterval(pollOrders, 3000);
    setInterval(pollPositions, 3000);

    dataManager.pollPriceTickerFor(instrumentSymbol, ticker => {
        document.getElementById('ttPrice').value = ticker['c'];
    });

    dataManager.pollBookTickerFor(instrumentSymbol, ticker => {
        bookTicker = ticker;
    });

    dataManager.pollDepthFor(instrumentSymbol, data => {
        let predictedPrice = predictPrice(data);
        let currentPrice = document.getElementById('ttPrice').value;
        let futureDelta = parseFloat((predictedPrice - currentPrice) / currentPrice * 100).toFixed(4);
        document.getElementById('ttFutureDelta').value = futureDelta;
        uiUtils.paintRedOrGreen(futureDelta, 'ttFutureDelta');
    });
}

function predictPrice(data) {
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
    let predictedPrice = parseFloat((askVolume + bidVolume) / (askOrders + bidOrders)).toFixed(2);
    return predictedPrice;
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
        let totalCosts = 0;
        let totalPnlUsd = 0;
        let totalPnlPcnt = 0;
        document.getElementById("ttPositionsDataGrid").innerHTML = '';
        document.getElementById("ttTotalPnl").innerHTML = '';
        for (let position of targetPositions) {
            totalPnlUsd += parseFloat(position.unRealizedProfit * position.markPrice);
            if (position.unRealizedProfit < 0) {
                totalCosts += position.markPrice * Math.abs(position.notionalValue);
            }
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
        if (totalCosts) {
            totalPnlPcnt = parseFloat(totalPnlUsd / totalCosts * 100).toFixed(2);
        }
        document.getElementById("ttTotalPnl").innerHTML = `Total \u2248 ${parseFloat(totalPnlUsd).toFixed(2)}$ (${totalPnlPcnt}%)`;
        uiUtils.paintRedOrGreen(totalPnlUsd, 'ttTotalPnl');
    });
}