var dataManager = require("./data-manager");
var uiUtils = require("./ui-utils");

let rowNumber;
let leadingInstruments = [];
let ledInstruments = [];

window.onload = async function () {
    rowNumber = 0;
    loadState();
    document.getElementById("addNewPairButton").addEventListener("click", function () { addDataRow(cacheDataRow); });
    document.getElementById("removeAllButton").addEventListener("click", removeAllDataRows);
    setInterval(pollPricesAndRecomputeDeltas, 1000);
}

async function loadState() {
    leadingInstruments = dataManager.getCachedArray("leadingInstruments");
    ledInstruments = dataManager.getCachedArray("ledInstruments");
    if (leadingInstruments.length === ledInstruments.length) {
        for (let rn = 0; rn < leadingInstruments.length; rn++) {
            await addDataRow();
            document.getElementById(`leadingInstrument${rn + 1}`).value = leadingInstruments[rn];
            document.getElementById(`ledInstrument${rn + 1}`).value = ledInstruments[rn];
        }
    }
}

async function addDataRow(callback) {
    rowNumber++;
    createRow();
    await initRow(rowNumber, callback);
    document.getElementById('removeAllButton').classList.remove('invisible');
}

async function initRow(rn, callback) {
    uiUtils.fillDropdownWithData(`leadingInstrument${rn}`, await dataManager.getAllSymbols());
    uiUtils.fillDropdownWithData(`ledInstrument${rn}`, await dataManager.getAllSymbols());
    console.log('Dropdowns initialised');
    if (callback) {
        callback(rowNumber);
    }
}
function cacheDataRow(rn) {
    leadingInstruments.push(document.getElementById(`leadingInstrument${rn}`).value);
    ledInstruments.push(document.getElementById(`ledInstrument${rn}`).value);
    dataManager.cache("leadingInstruments", leadingInstruments);
    dataManager.cache("ledInstruments", ledInstruments);
}

function replaceCachedRow(rn) {
    leadingInstruments[rn - 1] = document.getElementById(`leadingInstrument${rn}`).value;
    ledInstruments[rn - 1] = document.getElementById(`ledInstrument${rn}`).value;
    dataManager.cache("leadingInstruments", leadingInstruments);
    dataManager.cache("ledInstruments", ledInstruments);
}

function removeCachedRow(rn) {
    leadingInstruments.splice(rn - 1, 1);
    ledInstruments.splice(rn - 1, 1);
    dataManager.cache("leadingInstruments", leadingInstruments);
    dataManager.cache("ledInstruments", ledInstruments);
}

function removeAllCachedRows() {
    leadingInstruments = [];
    ledInstruments = [];
    dataManager.cache("leadingInstruments", leadingInstruments);
    dataManager.cache("ledInstruments", ledInstruments);
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
        if (value === 'remove') {
            let icon = document.createElement('span')
            icon.classList.add("fa");
            icon.classList.add("fa-trash");
            control.appendChild(icon);
            control.addEventListener("click", removeDataRow);
        }
    }
    div.appendChild(control);
    return div;
}

function onChange() {
    replaceCachedRow(getRowNumberFrom(this.id));
    window.stop();
}

function removeDataRow() {
    uiUtils.removeRowWithElement(this.id);
    let removedRowNumber = getRowNumberFrom(this.id);
    removeCachedRow(removedRowNumber);
    recalculateControlIds(removedRowNumber + 1, rowNumber);
    --rowNumber;
}

function getRowNumberFrom(id) {
    return parseInt(id.match(/\d+$/)[0], 10);
}

function removeAllDataRows() {
    rowNumber = 0;
    removeAllCachedRows();
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
                    deltaUsdTextBox.value = (parseFloat(ledInstrumentPriceTextBox.value) - parseFloat(leadingInstrumentPriceTextBox.value));
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
                    deltaPcntTextBox.value = (ledInstrumentPriceTextBox.value / leadingInstrumentPriceTextBox.value - 1) * 100;
                }
            });
        }
    }
}
