var dataManager = require("./data-manager");

window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);

    let leadingInstrumentSymbol = urlParams.get('leadingInstrument');
    let ledInstrumentSymbol = urlParams.get('ledInstrument');

    document.getElementById('bpLeadingInstrument1').value = leadingInstrumentSymbol;
    document.getElementById('bpLeadingInstrument2').value = leadingInstrumentSymbol;

    document.getElementById('bpLedInstrument1').value = ledInstrumentSymbol;
    document.getElementById('bpLedInstrument2').value = ledInstrumentSymbol;

    setInterval(pollBestPricesAndRecomputeDeltas, 1000, leadingInstrumentSymbol, ledInstrumentSymbol);
}

function pollBestPricesAndRecomputeDeltas(leadingInstrumentSymbol, ledInstrumentSymbol) {

    dataManager.requestBestPrices(leadingInstrumentSymbol, (response) => {
        let leadingPrice1 = document.getElementById(`bpLeadingPrice1`);
        let ledPrice1 = document.getElementById(`bpLedPrice1`);
        let deltaPcnt1 = document.getElementById(`bpDeltaPcnt1`);
        let deltaUsd1 = document.getElementById(`bpDeltaUsd1`);
        if (response[0]) {
            leadingPrice1.value = response[0].bidPrice;
            ledPrice1.value = response[0].askPrice;
            deltaPcnt1.value = parseFloat(((ledPrice1.value / leadingPrice1.value - 1) * 100).toFixed(4));
            deltaUsd1.value = (parseFloat(ledPrice1.value - leadingPrice1.value).toFixed(4));
        }
    });

    dataManager.requestBestPrices(ledInstrumentSymbol, (response) => {
        let leadingPrice2 = document.getElementById(`bpLeadingPrice2`);
        let ledPrice2 = document.getElementById(`bpLedPrice2`);
        let deltaPcnt2 = document.getElementById(`bpDeltaPcnt2`);
        let deltaUsd2 = document.getElementById(`bpDeltaUsd2`);
        if (response[0]) {
            leadingPrice2.value = response[0].askPrice;
            ledPrice2.value = response[0].bidPrice;
            deltaPcnt2.value = parseFloat(((leadingPrice2.value / ledPrice2.value - 1) * 100).toFixed(4));
            deltaUsd2.value = (parseFloat(leadingPrice2.value - ledPrice2.value).toFixed(4));
        }
    });
}