const dataManager = require("./data-manager");
const cacheManager = require("./cache-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const instrumentSymbol = urlParams.get('instrument');

const CIRCULAR_BUFFER_SIZE = 100;

let sellSpreadSampling = new CircularBuffer(CIRCULAR_BUFFER_SIZE);
let maxPositions = 10;
let positionsOpened = 0;

window.onload = async function () {
    document.getElementById('ttInstrument').value = instrumentSymbol;
    document.getElementById('buyInstrumentButton').addEventListener('click', function () { placeBuyOrder() });
    document.getElementById('sellInstrumentButton').addEventListener('click', function () { placeSellOrder() });
    document.getElementById("ttRemoveAllOrdersButton").addEventListener("click", removeAllOrders);
    setInterval(pollPrices, 1000);
    setInterval(pollOrders, 1000);
    setInterval(pollPositions, 1000);
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
    let targetPrice = document.getElementById('ttLimitPrice').value;
    let order = {
        side: side,
        symbol: document.getElementById('ttInstrument').value,
        quantity: document.getElementById('ttQuantity').value,
        price: targetPrice,
        type: targetPrice ? 'LIMIT' : 'MARKET',
        recvWindow: 60000,
        timeInForce: 'GTC'
    }
    return order;
}

function pollPrices() {
    dataManager.requestCurrentPrices(response => {
        let filteredResponse = response.filter(item => instrumentSymbol === item.symbol);
        //console.log(JSON.stringify(filteredResponse));
        let instrumentPrice = parseFloat(filteredResponse.map(obj => (parseFloat(obj.askPrice) + parseFloat(obj.bidPrice)) / 2)).toFixed(4);
        document.getElementById('ttPrice').value = instrumentPrice;
    });
}

function pollOrders() {
    dataManager.requestOrders(orders => {
        document.getElementById("limitOrdersDataGrid").innerHTML = '';
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
            document.getElementById("limitOrdersDataGrid").appendChild(row);
        }

    });
}

let targetPositions = {};
function pollPositions() {
    dataManager.requestPositions(positions => {
        targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && instrumentSymbol === p.symbol);
        if (targetPositions.length > 0) {
            uiUtils.showElement("ttCloseAllPositionsButton");
        } else {
            uiUtils.hideElement("ttCloseAllPositionsButton");
        }
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
        document.getElementById("ttTotalPnl").innerHTML = `Total: ${parseFloat(totalPnlUsd).toFixed(2)}$ (${totalPnlPcnt}%)`;
        uiUtils.paintRedOrGreen(totalPnlUsd, 'ttTotalPnl');
    });
}