const dataManager = require("./data-manager");
const cacheManager = require("./cache-manager");
const uiUtils = require("./ui-utils");

const urlParams = new URLSearchParams(window.location.search);
const leadingInstrumentSymbol = urlParams.get('leadingInstrument');
const ledInstrumentSymbol = urlParams.get('ledInstrument');
const form = document.querySelector('form');

window.onload = async function () {

    document.getElementById('bpTargetDeltaPcnt1').addEventListener('input', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd1').addEventListener('input', fixTargetSpread);

    document.getElementById('bpTargetDeltaPcnt2').addEventListener('input', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd2').addEventListener('input', fixTargetSpread);

    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;
    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;

    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;
    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;

    if (cacheManager.isAuthorized()) {
        uiUtils.showElement('buySpreadButton');
        document.getElementById('buySpreadButton').addEventListener('click', function () { pollBestPricesAndPlaceOrder(buySpread) });
        uiUtils.showElement('sellSpreadButton');
        document.getElementById('sellSpreadButton').addEventListener('click', function () { pollBestPricesAndPlaceOrder(sellSpread) });
    } else {
        uiUtils.hideElement('buySpreadButton');
        uiUtils.hideElement('sellSpreadButton');
    }

    setInterval(pollBestPricesAndPlaceOrder, 1000);
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

function buySpread(prices) {
    console.log(JSON.stringify(prices));
    let quantity = document.getElementById('bpQuantity1').value;
    if (quantity) {
        // Buying leading instrument:
        let queryString = `symbol=${leadingInstrumentSymbol}&side=BUY&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${prices.targetLeadingOfferPrice}&timeStamp=${Date.now()}`;
        dataManager.placeOrder(queryString);
        // Selling led instrument:
        queryString = `symbol=${ledInstrumentSymbol}&side=SELL&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${prices.targetLedBidPrice}&timeStamp=${Date.now()}`;
        dataManager.placeOrder(queryString);
    } else {
        form.reportValidity();
    }
}

function sellSpread(prices) {
    let quantity = document.getElementById('bpQuantity2').value;
    if (quantity) {
        // Selling leading instrument:
        let queryString = `symbol=${leadingInstrumentSymbol}&side=SELL&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${prices.targetLeadingBidPrice}&timeStamp=${Date.now()}`;
        dataManager.placeOrder(queryString);
        // Buying led instrument:
        queryString = `symbol=${ledInstrumentSymbol}&side=BUY&type=LIMIT&timeInForce=GTC&quantity=${quantity}&price=${prices.targetLedOfferPrice}&timeStamp=${Date.now()}`;
        dataManager.placeOrder(queryString);
    } else {
        form.reportValidity();
    }
}

function pollBestPricesAndPlaceOrder(callback) {
    dataManager.requestBestPrices((response) => {
        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));

        //request bid and offer prices
        let leadingBidPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice);
        let leadingOfferPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice);

        let ledBidPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice);
        let ledOfferPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice);

        //recalculate deltas
        let deltaPcnt1 = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4));
        let deltaUsd1 = parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4);

        let deltaPcnt2 = parseFloat(((leadingBidPrice / ledOfferPrice - 1) * 100).toFixed(4));
        let deltaUsd2 = parseFloat(leadingBidPrice - ledOfferPrice).toFixed(4);

        document.getElementById(`bpDeltaPcnt1`).value = deltaPcnt1 + ' %';
        document.getElementById(`bpDeltaUsd1`).value = deltaUsd1 + ' $';

        document.getElementById(`bpDeltaPcnt2`).value = deltaPcnt2 + ' %';
        document.getElementById(`bpDeltaUsd2`).value = deltaUsd2 + ' $';

        //recalculate target deltas
        let targetDeltaPcnt1 = document.getElementById(`bpTargetDeltaPcnt1`).value;
        let targetDeltaUsd1 = document.getElementById(`bpTargetDeltaUsd1`).value;

        let targetDeltaPcnt2 = document.getElementById(`bpTargetDeltaPcnt2`).value;
        let targetDeltaUsd2 = document.getElementById(`bpTargetDeltaUsd2`).value;

        if (targetSpreadFixedInPcnt1 && targetDeltaPcnt1) {
            document.getElementById(`bpTargetDeltaUsd1`).value = (deltaUsd1 * targetDeltaPcnt1 / deltaPcnt1).toFixed(4);
        } else if (!targetSpreadFixedInPcnt1 && targetDeltaUsd1) {
            document.getElementById(`bpTargetDeltaPcnt1`).value = (deltaPcnt1 * targetDeltaUsd1 / deltaUsd1).toFixed(4);
        }

        if (targetSpreadFixedInPcnt2 && targetDeltaPcnt2) {
            document.getElementById(`bpTargetDeltaUsd2`).value = (deltaUsd2 * targetDeltaPcnt2 / deltaPcnt2).toFixed(4);
        } else if (!targetSpreadFixedInPcnt2 && targetDeltaUsd2) {
            document.getElementById(`bpTargetDeltaPcnt2`).value = (deltaPcnt2 * targetDeltaUsd2 / deltaUsd2).toFixed(4);
        }

        //recalculate target prices
        let halfDelta1 = targetDeltaUsd1 ? (targetDeltaUsd1 - deltaUsd1) / 2 : 0;
        let halfDelta2 = targetDeltaUsd2 ? (targetDeltaUsd2 - deltaUsd2) / 2 : 0;

        let targetLeadingOfferPrice = Math.floor(leadingOfferPrice - halfDelta1);
        let targetLedBidPrice = Math.ceil(ledBidPrice + halfDelta1);

        let targetLeadingBidPrice = Math.ceil(leadingBidPrice + halfDelta2);
        let targetLedOfferPrice = Math.floor(ledOfferPrice - halfDelta2);

        let targetPrices = {
            targetLeadingOfferPrice: targetLeadingOfferPrice,
            targetLedBidPrice: targetLedBidPrice,
            targetLeadingBidPrice: targetLeadingBidPrice,
            targetLedOfferPrice: targetLedOfferPrice,
        };

        if (callback) {
            callback(targetPrices);
        }
    });
}