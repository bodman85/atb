const dataManager = require("./data-manager");
const cacheManager = require("./cache-manager");
const uiUtils = require("./ui-utils");
const CircularBuffer = require("circular-buffer");

const urlParams = new URLSearchParams(window.location.search);
const leadingInstrumentSymbol = urlParams.get('leadingInstrument');
const ledInstrumentSymbol = urlParams.get('ledInstrument');
const form = document.querySelector('form');

const CIRCULAR_BUFFER_SIZE = 10;

let sellSpreadSampling = new CircularBuffer(CIRCULAR_BUFFER_SIZE);
let maxPositions = 10;
let positionsOpened = 0;

window.onload = async function () {

    document.getElementById('bpTargetDeltaPcnt1').addEventListener('focus', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd1').addEventListener('focus', fixTargetSpread);

    document.getElementById('bpTargetDeltaPcnt2').addEventListener('focus', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd2').addEventListener('focus', fixTargetSpread);

    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;
    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;

    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;
    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;

    document.getElementById("removeAllOrdersButton").addEventListener("click", removeAllOrders);
    document.getElementById("closeAllPositionsButton").addEventListener("click", function () { dataManager.closePositions(targetPositions); positionsOpened = 0; });

    if (cacheManager.isAuthorized()) {
        uiUtils.showElement('sellSpreadButton');
        document.getElementById('sellSpreadButton').addEventListener('click', function () { placeSellSpreadOrder(null) });
        uiUtils.showElement('sellSpreadAutoSwitcher');
        document.getElementById('sellSpreadAutoSwitcher').addEventListener('click', handleAutoSellSwitcher);
        uiUtils.showElement('buySpreadButton');
        document.getElementById('buySpreadButton').addEventListener('click', placeBuySpreadOrder);
    } else {
        uiUtils.hideElement('sellSpreadButton');
        uiUtils.hideElement('buySpreadButton');
    }

    setInterval(pollPricesAndProcessOrders, 1000);
    dataManager.listenToAccountUpdate();
    setInterval(pollPositions, 1000);
}

let targetSpreadFixedInPcnt1 = true;
let targetSpreadFixedInPcnt2 = true;
function fixTargetSpread() {
    switch (this.id) {
        case 'bpTargetDeltaPcnt1':
            targetSpreadFixedInPcnt1 = true;
            break;
        case 'bpTargetDeltaUsd1':
            targetSpreadFixedInPcnt1 = false;
        case 'bpTargetDeltaPcnt2':
            targetSpreadFixedInPcnt2 = true;
            break;
        case 'bpTargetDeltaUsd2':
            targetSpreadFixedInPcnt2 = false;
    }
}

function generateUUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function placeSellSpreadOrder(targetSpread) {

    let quantity = isAutoSellOn() ? 1 : document.getElementById('bpQuantity1').value;
    if (!quantity) {
        form.reportValidity();
    }
    targetSpread ||= document.getElementById('bpTargetDeltaPcnt1').value;
    let order = {
        id: generateUUID(),
        buy: leadingInstrumentSymbol,
        sell: ledInstrumentSymbol,
        quantity: quantity,
        executed: 0,
        targetSpreadPcnt: targetSpread,
        targetSpreadUsd: document.getElementById('bpTargetDeltaUsd1').value,
        targetSpreadFixedInPcnt: targetSpreadFixedInPcnt1
    }

    cacheManager.cacheOrder(order);
}

function handleAutoSellSwitcher() {
    if (isAutoSellOn()) {
        uiUtils.disableElement('bpTargetDeltaPcnt1');
        uiUtils.disableElement('bpTargetDeltaUsd1');
        uiUtils.disableElement('bpQuantity1');
        uiUtils.disableElement('sellSpreadButton');

        uiUtils.disableElement('bpTargetDeltaPcnt2');
        uiUtils.disableElement('bpTargetDeltaUsd2');
        uiUtils.disableElement('bpQuantity2');
        uiUtils.disableElement('buySpreadButton');

        maxPositions = document.getElementById('bpQuantity1').value || 10;
    } else {
        uiUtils.enableElement('bpTargetDeltaPcnt1');
        uiUtils.enableElement('bpTargetDeltaUsd1');
        uiUtils.enableElement('bpQuantity1');
        uiUtils.enableElement('sellSpreadButton');

        uiUtils.enableElement('bpTargetDeltaPcnt2');
        uiUtils.enableElement('bpTargetDeltaUsd2');
        uiUtils.enableElement('bpQuantity2');
        uiUtils.enableElement('buySpreadButton');
    }
}

function isAutoSellOn() {
    return document.getElementById("sellSpreadAutoSwitcher").checked;
}

function placeBuySpreadOrder() {
    let quantity = document.getElementById('bpQuantity2').value;
    if (!quantity) {
        form.reportValidity();
    }
    let order = {
        id: generateUUID(),
        buy: ledInstrumentSymbol,
        sell: leadingInstrumentSymbol,
        quantity: quantity,
        executed: 0,
        targetSpreadPcnt: document.getElementById('bpTargetDeltaPcnt2').value,
        targetSpreadUsd: document.getElementById('bpTargetDeltaUsd2').value,
        targetSpreadFixedInPcnt: targetSpreadFixedInPcnt2
    }
    cacheManager.cacheOrder(order);
}

function reloadOrders() {
    document.getElementById("ordersDataGrid").innerHTML = '';
    let orders = cacheManager.getCachedArray(cacheManager.ORDERS);
    if (orders.length > 0) {
        uiUtils.showElement("removeAllOrdersButton");
    } else {
        uiUtils.hideElement("removeAllOrdersButton");
    }
    for (let order of orders) {
        let row = uiUtils.createTableRow();
        row.appendChild(uiUtils.createTextColumn(orders.indexOf(order) + 1));
        row.appendChild(uiUtils.createTextColumn(order.buy));
        row.appendChild(uiUtils.createTextColumn(order.sell));
        row.appendChild(uiUtils.createTextColumn(order.targetSpreadFixedInPcnt ? order.targetSpreadPcnt ? order.targetSpreadPcnt + '%' : '' : order.targetSpreadUsd ? order.targetSpreadUsd + '$' : ''));
        row.appendChild(uiUtils.createTextColumn(order.quantity));
        row.appendChild(uiUtils.createTextColumn(order.executed));
        row.appendChild(uiUtils.createIconButtonColumn("fa-trash", function () { cacheManager.removeOrder(order.id) }));
        document.getElementById("ordersDataGrid").appendChild(row);
    }
    return orders;
}


function removeAllOrders() {
    cacheManager.clearAll(cacheManager.ORDERS);
}

function pollPricesAndProcessOrders() {
    dataManager.requestBestPrices((response) => {
        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));

        //request bid and offer prices
        let leadingBidPrice = parseFloat(filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice));
        let leadingOfferPrice = parseFloat(filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice));

        let ledBidPrice = parseFloat(filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice));
        let ledOfferPrice = parseFloat(filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice));

        //recalculate deltas
        let deltaPcnt1 = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4));
        let deltaUsd1 = parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4);

        let deltaPcnt2 = parseFloat(((ledOfferPrice / leadingBidPrice - 1) * 100).toFixed(4));
        let deltaUsd2 = parseFloat(ledOfferPrice - leadingBidPrice).toFixed(4);

        document.getElementById(`bpDeltaPcnt1`).value = deltaPcnt1 + ' %';
        document.getElementById(`bpDeltaUsd1`).value = deltaUsd1 + ' $';

        document.getElementById(`bpDeltaPcnt2`).value = deltaPcnt2 + ' %';
        document.getElementById(`bpDeltaUsd2`).value = deltaUsd2 + ' $';

        //recalculate target deltas
        let targetDeltaPcnt1 = parseFloat(document.getElementById(`bpTargetDeltaPcnt1`).value);
        let targetDeltaUsd1 = parseFloat(document.getElementById(`bpTargetDeltaUsd1`).value);

        let targetDeltaPcnt2 = parseFloat(document.getElementById(`bpTargetDeltaPcnt2`).value);
        let targetDeltaUsd2 = parseFloat(document.getElementById(`bpTargetDeltaUsd2`).value);

        if (targetSpreadFixedInPcnt1) {
            if (targetDeltaPcnt1) {
                document.getElementById(`bpTargetDeltaUsd1`).value = (deltaUsd1 * targetDeltaPcnt1 / deltaPcnt1).toFixed(4);
            } else {
                document.getElementById(`bpTargetDeltaUsd1`).value = '';
            }
        } else if (!targetSpreadFixedInPcnt1) {
            if (targetDeltaUsd1) {
                document.getElementById(`bpTargetDeltaPcnt1`).value = (deltaPcnt1 * targetDeltaUsd1 / deltaUsd1).toFixed(4);
            } else {
                document.getElementById(`bpTargetDeltaPcnt1`).value = '';
            }
        }
        if (targetSpreadFixedInPcnt2) {
            if (targetDeltaPcnt2) {
                document.getElementById(`bpTargetDeltaUsd2`).value = (deltaUsd2 * targetDeltaPcnt2 / deltaPcnt2).toFixed(4);
            } else {
                document.getElementById(`bpTargetDeltaUsd2`).value = '';
            }
        } else if (!targetSpreadFixedInPcnt2) {
            if (targetDeltaUsd2) {
                document.getElementById(`bpTargetDeltaPcnt2`).value = (deltaPcnt2 * targetDeltaUsd2 / deltaUsd2).toFixed(4);
            } else {
                document.getElementById(`bpTargetDeltaPcnt2`).value = '';
            }
        }
        //refresh orders
        let orders = reloadOrders();
        //process orders
        for (let order of orders) {
            let targetSpreadIsMet = false;

            if (order.targetSpreadPcnt && order.targetSpreadUsd) {
                if (order.targetSpreadFixedInPcnt) {
                    if (order.buy === leadingInstrumentSymbol) {
                        if (deltaPcnt1 >= order.targetSpreadPcnt) {
                            targetSpreadIsMet = true;
                        }
                    } else if (order.buy === ledInstrumentSymbol) {
                        if (deltaPcnt2 <= order.targetSpreadPcnt) {
                            targetSpreadIsMet = true;
                        }
                    }
                } else {
                    if (order.buy === leadingInstrumentSymbol) {
                        if (deltaUsd1 >= order.targetSpreadUsd) {
                            targetSpreadIsMet = true;
                        }
                    } else if (order.buy === ledInstrumentSymbol) {
                        if (deltaUsd2 <= order.targetSpreadUsd) {
                            targetSpreadIsMet = true;
                        }
                    }
                }
            } else {
                targetSpreadIsMet = true;
            }
            if (targetSpreadIsMet && order.executed === 0) {
                execute(order, order.quantity);
                positionsOpened++;
            } else if (isAutoSellOn()) {
                removeAllOrders();
                break;
            }
            if (order.executed == order.quantity) {
                cacheManager.removeOrder(order.id);
            }
        }
        //Auto trading
        sellSpreadSampling.enq(deltaPcnt1.toFixed(2));
        placeAutoSellOrderIfApplicable(sellSpreadSampling);
    });
}

function placeAutoSellOrderIfApplicable(sellSpreadSampling) {
    if (!isAutoSellOn() || sellSpreadSampling.size() < CIRCULAR_BUFFER_SIZE) {
        return;
    }

    let desiredSellSpread = getProbableDesiredSellSpread(sellSpreadSampling);
    let actualSellSpread = parseFloat(document.getElementById(`bpDeltaPcnt1`).value);
    let sellSpreadTreshold = document.getElementById('bpTargetDeltaPcnt1').value;
    if (desiredSellSpread < actualSellSpread || desiredSellSpread < sellSpreadTreshold || positionsOpened >= maxPositions) {
        return;
    }
    placeSellSpreadOrder(desiredSellSpread);
}

function getProbableDesiredSellSpread(sellSpreadSampling) {
    let sellSpreadProbabilities = getProbabilitiesOf(sellSpreadSampling.toarray());
    let M = getProbableAverage(sellSpreadProbabilities);
    let D = getDeviation(sellSpreadProbabilities, M);
    let desiredSellSpread = M + 1.5 * D;
    return parseFloat(desiredSellSpread).toFixed(4);
}

function getProbabilitiesOf(arr) {
    let probabilities = {};
    if (arr) {
        for (let num of arr) {
            probabilities[num] = probabilities[num] ? probabilities[num] + 1/arr.length : 1/arr.length;
        }
    }
    return probabilities;
}

function getProbableAverage(probabilities) {
    let M = 0;
    for (let key in probabilities) {
        M += key * probabilities[key];
    }
    return M;
}

function getDeviation(probabilities, M) {
    let D = 0;
    for (let key in probabilities) {
        D += key * key * probabilities[key];
    }
    D = D - M * M;
    return Math.sqrt(D);
}

function execute(order, countdown) {
    if (!cacheManager.findOrderBy(order.id) || countdown == 0) {
        return;
    }
    dataManager.executeOrder(order, function () { order.executed += 0.5; cacheManager.updateOrder(order); reloadOrders(); });
    setTimeout(function () { execute(order, --countdown) }, 100);
}

let targetPositions = {};
function pollPositions() {
    dataManager.requestPositions(positions => {
        targetPositions = positions.filter(p => parseFloat(p.unRealizedProfit) !== 0 && [leadingInstrumentSymbol, ledInstrumentSymbol].includes(p.symbol));
        if (targetPositions.length > 0) {
            uiUtils.showElement("closeAllPositionsButton");
        } else {
            uiUtils.hideElement("closeAllPositionsButton");
        }
        let totalCosts = 0;
        let totalPnlUsd = 0;
        let totalPnlPcnt = 0;
        document.getElementById("positionsDataGrid").innerHTML = '';
        document.getElementById("totalPnl").innerHTML = '';
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
            row.appendChild(uiUtils.createTextColumn(parseFloat(position.unRealizedProfit).toFixed(6)));
            row.appendChild(uiUtils.createIconButtonColumn("fa-times", function () {dataManager.closePosition(position)}));
            document.getElementById("positionsDataGrid").appendChild(row);
        }
        if (totalCosts) {
            totalPnlPcnt = parseFloat(totalPnlUsd / totalCosts * 100).toFixed(2);
        }
        document.getElementById("totalPnl").innerHTML = `Total: ${parseFloat(totalPnlUsd).toFixed(2)}$ (${totalPnlPcnt}%)`;
        if (totalPnlUsd >= 0) {
            uiUtils.paintGreen('totalPnl');
        } else {
            uiUtils.paintRed('totalPnl');
        }

        if (isAutoSellOn() && totalPnlPcnt >= 0.5) {
            dataManager.closePositions(targetPositions);
            positionsOpened = 0;
        }
    });
}


