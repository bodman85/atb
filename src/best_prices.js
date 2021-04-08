var dataManager = require("./data-manager");
var cacheManager = require("./cache-manager");
var uiUtils = require("./ui-utils");

window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);

    document.getElementById('bpTargetDeltaPcnt1').addEventListener('input', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd1').addEventListener('input', fixTargetSpread);

    document.getElementById('bpTargetDeltaPcnt2').addEventListener('input', fixTargetSpread);
    document.getElementById('bpTargetDeltaUsd2').addEventListener('input', fixTargetSpread);
    

    let leadingInstrumentSymbol = urlParams.get('leadingInstrument');
    let ledInstrumentSymbol = urlParams.get('ledInstrument');

    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;
    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;

    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;
    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;

    if (cacheManager.isAuthorized()) {
        uiUtils.showElement('buySpreadButton');
        uiUtils.showElement('sellSpreadButton');
    } else {
        uiUtils.hideElement('buySpreadButton');
        uiUtils.hideElement('sellSpreadButton');
    }

    setInterval(pollBestPricesAndRecomputeDeltas, 1000, leadingInstrumentSymbol, ledInstrumentSymbol);
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

function pollBestPricesAndRecomputeDeltas(leadingInstrumentSymbol, ledInstrumentSymbol) {
    dataManager.requestBestPrices((response) => {
        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));

        let leadingBidPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice);
        let leadingOfferPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice);

        let ledBidPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice);
        let ledOfferPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice);

        let deltaPcnt1 = parseFloat(((ledOfferPrice / leadingBidPrice - 1) * 100).toFixed(4));
        let deltaUsd1 = parseFloat(ledOfferPrice - leadingBidPrice).toFixed(4);

        let deltaPcnt2 = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4));
        let deltaUsd2 = parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4);

        document.getElementById(`bpDeltaPcnt1`).value = deltaPcnt1 + ' %';
        document.getElementById(`bpDeltaUsd1`).value = deltaUsd1 + ' $';

        document.getElementById(`bpDeltaPcnt2`).value = deltaPcnt2 +' %';
        document.getElementById(`bpDeltaUsd2`).value = deltaUsd2 + ' $';

        let targetDeltaPcnt1 = document.getElementById(`bpTargetDeltaPcnt1`).value;
        let targetDeltaUsd1 = document.getElementById(`bpTargetDeltaUsd1`).value;

        let targetDeltaPcnt2 = document.getElementById(`bpTargetDeltaPcnt2`).value;
        let targetDeltaUsd2 = document.getElementById(`bpTargetDeltaUsd2`).value;

        //recompute target deltas
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
    });
}