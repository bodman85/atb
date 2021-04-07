var dataManager = require("./data-manager");
var cacheManager = require("./cache-manager");
var uiUtils = require("./ui-utils");

window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);

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

function pollBestPricesAndRecomputeDeltas(leadingInstrumentSymbol, ledInstrumentSymbol) {
    dataManager.requestBestPrices((response) => {
        let filteredResponse = response.filter(item => [leadingInstrumentSymbol, ledInstrumentSymbol].includes(item.symbol));

        let leadingBidPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.bidPrice);
        let leadingOfferPrice = filteredResponse.filter(item => item.symbol === leadingInstrumentSymbol).map(obj => obj.askPrice);

        let ledBidPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.bidPrice);
        let ledOfferPrice = filteredResponse.filter(item => item.symbol === ledInstrumentSymbol).map(obj => obj.askPrice);

        document.getElementById(`bpDeltaPcnt1`).value = parseFloat(((ledOfferPrice / leadingBidPrice - 1) * 100).toFixed(4))+' %';
        document.getElementById(`bpDeltaUsd1`).value = (parseFloat(ledOfferPrice - leadingBidPrice).toFixed(4))+' $';

        document.getElementById(`bpDeltaPcnt2`).value = parseFloat(((ledBidPrice / leadingOfferPrice - 1) * 100).toFixed(4))+' %';
        document.getElementById(`bpDeltaUsd2`).value = (parseFloat(ledBidPrice - leadingOfferPrice).toFixed(4))+' $';
    });
}