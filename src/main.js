var dataManager = require("./data-manager");
var uiUtils = require("./ui-utils");
var cacheManager = require("./cache-manager");

let rowNumber;

window.onload = async function () {
    rowNumber = 0;
    loadState();
    document.getElementById("addNewPairButton").addEventListener("click", function () { addDataRow(cacheManager.cacheDataRow); });
    document.getElementById("removeAllButton").addEventListener("click", removeAllDataRows);
    setInterval(pollPricesAndRecomputeDeltas, 1000);
}

async function loadState() {
    for (let rn = 0; rn < cacheManager.getCachedRowsCount(); rn++) {
        await addDataRow(cacheManager.selectCachedValues);
    }
}

async function addDataRow(callback) {
    rowNumber++;
    createRow();
    await initRow(callback);
    document.getElementById('removeAllButton').classList.remove('invisible');
}

async function initRow(callback) {
    uiUtils.fillDropdownWithData(`leadingInstrument${rowNumber}`, await dataManager.getAllSymbols());
    uiUtils.fillDropdownWithData(`ledInstrument${rowNumber}`, await dataManager.getAllSymbols());
    if (callback && typeof callback === "function") {
        callback(rowNumber);
    }
}

function createRow() {
    let row = document.createElement("div");
    row.classList.add('row');
    row.classList.add('mb-1');
    row.appendChild(createColumn(`leadingInstrument${rowNumber}`, "select"));
    row.appendChild(createColumn(`leadingPrice${rowNumber}`, "input", "text"));
    row.appendChild(createColumn(`ledInstrument${rowNumber}`, "select"));
    row.appendChild(createColumn(`ledPrice${rowNumber}`, "input", "text"));
    row.appendChild(createColumn(`deltaPcnt${rowNumber}`, "input", "text"));
    row.appendChild(createColumn(`deltaUsd${rowNumber}`, "input", "text"));
    row.appendChild(createColumn(`arrowButton${rowNumber}`, "button", "button", "arrow"));
    row.appendChild(createColumn(`removeButton${rowNumber}`, "button", "button", "remove"));
    document.getElementById("dataGrid").appendChild(row);
}

function createColumn(id, element, type, value) {
    let div = document.createElement("div");
    div.classList.add("col");
    var control = document.createElement(element);
    control.id = id;
    if (!type) {
        control.classList.add("form-select");
        control.addEventListener("change", onChange);
    } else if (type === 'text') {
        control.type = type;
        control.classList.add("form-control");
    } else if (type === 'button') {
        control.type = type;
        control.classList.add("btn");
        control.classList.add("btn-secondary");
        switch (value) {
            case "arrow":
                div.classList.add("col-1");
                control.appendChild(createFaIcon("fa-arrow-right"));
                control.addEventListener("click", showBestPrices);
                break;
            case "remove":
                div.classList.add("col-1");
                control.appendChild(createFaIcon("fa-trash"));
                control.addEventListener("click", removeDataRow);
                break;
        }
    }
    div.appendChild(control);
    return div;
}

function createFaIcon(name) {
    let icon = document.createElement('span')
    icon.classList.add("fa");
    icon.classList.add(name);
    return icon;
}

function onChange() {
    cacheManager.replaceCachedRow(getRowNumberFrom(this.id));
    window.stop();
}

function showBestPrices() {
    let rn = getRowNumberFrom(this.id);
    let leadingSymbol = document.getElementById(`leadingInstrument${rn}`).value;
    let ledSymbol = document.getElementById(`ledInstrument${rn}`).value;
    window.location.href = `best_prices.html?leadingInstrument=${leadingSymbol}&ledInstrument=${ledSymbol}`;
}

function removeDataRow() {
    uiUtils.removeRowWithElement(this.id);
    let removedRowNumber = getRowNumberFrom(this.id);
    cacheManager.removeCachedRow(removedRowNumber);
    recalculateControlIds(removedRowNumber + 1, rowNumber);
    --rowNumber;
}

function getRowNumberFrom(id) {
    return parseInt(id.match(/\d+$/)[0], 10);
}

function removeAllDataRows() {
    rowNumber = 0;
    cacheManager.removeAllCachedRows();
    uiUtils.clearDataGrid(this.id, "dataGrid");
}

function recalculateControlIds(start, total) {
    for (let rn = start; rn <= total; rn++) {
        document.getElementById(`leadingInstrument${rn}`).id = `leadingInstrument${rn - 1}`;
        document.getElementById(`ledInstrument${rn}`).id = `ledInstrument${rn - 1}`;
        document.getElementById(`leadingPrice${rn}`).id = `leadingPrice${rn - 1}`;
        document.getElementById(`ledPrice${rn}`).id = `ledPrice${rn - 1}`;
        document.getElementById(`deltaPcnt${rn}`).id = `deltaPcnt${rn - 1}`;
        document.getElementById(`deltaUsd${rn}`).id = `deltaUsd${rn - 1}`;
        document.getElementById(`removeButton${rn}`).id = `removeButton${rn - 1}`;
        document.getElementById(`arrowButton${rn}`).id = `arrowButton${rn - 1}`;
    }
}

function pollPricesAndRecomputeDeltas() {
    for (let rn = rowNumber; rn > 0; rn--) {
        let leadingInstrumentSelect = document.getElementById(`leadingInstrument${rn}`);
        if (leadingInstrumentSelect) {
            dataManager.requestPrice(leadingInstrumentSelect.value, (response) => {
                let leadingInstrumentPriceTextBox = document.getElementById(`leadingPrice${rn}`);
                let ledInstrumentPriceTextBox = document.getElementById(`ledPrice${rn}`);
                let deltaUsdTextBox = document.getElementById(`deltaUsd${rn}`);
                if (response[0] && leadingInstrumentPriceTextBox) {
                    leadingInstrumentPriceTextBox.value = response[0].price;
                    deltaUsdTextBox.value = (parseFloat(ledInstrumentPriceTextBox.value - leadingInstrumentPriceTextBox.value).toFixed(4));
                }
            });
        }
        let ledInstrumentSelect = document.getElementById(`ledInstrument${rn}`);
        if (ledInstrumentSelect) {
            dataManager.requestPrice(ledInstrumentSelect.value, (response) => {
                let leadingInstrumentPriceTextBox = document.getElementById(`leadingPrice${rn}`);
                let ledInstrumentPriceTextBox = document.getElementById(`ledPrice${rn}`);
                let deltaPcntTextBox = document.getElementById(`deltaPcnt${rn}`);
                if (response[0] && leadingInstrumentPriceTextBox && ledInstrumentPriceTextBox) {
                    ledInstrumentPriceTextBox.value = response[0].price;
                    deltaPcntTextBox.value = parseFloat(((ledInstrumentPriceTextBox.value / leadingInstrumentPriceTextBox.value - 1) * 100).toFixed(4));
                }
            });
        }
    }
}
