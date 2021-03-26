var dataManager = require("./data-manager");
var uiManager = require("./ui-manager");

let rowNumber = 0;

window.onload = async function () {
    addRowFilledWithData(rowNumber);
    document.getElementById("addNewPairButton").addEventListener("click", addRowFilledWithData);
    document.getElementById("removeAllButton").addEventListener("click", function () {
        rowNumber = 0; uiManager.removeAllDataRows(this.id, "dataGrid");
    });
    setInterval(pollPricesAndRecomputeDeltas, 1000);
}

async function addRowFilledWithData() {
    rowNumber++;
    let row = document.createElement("div");
    row.classList.add('row');
    row.classList.add('mb-1');

    let leadingInstrumentId = `leadingInstrument${rowNumber}`;
    let ledInstrumentId = `ledInstrument${rowNumber}`;

    let leadingPriceId = `leadingPrice${rowNumber}`;
    let ledPriceId = `ledPrice${rowNumber}`;

    let deltaPcntId = `deltaPcnt${rowNumber}`;
    let deltaUsdId = `deltaUsd${rowNumber}`;

    let removeButtonId = `removeButton${rowNumber}`;

    row.appendChild(createColumn(leadingInstrumentId, "select"));
    row.appendChild(createColumn(leadingPriceId, "input", "text"));
    row.appendChild(createColumn(ledInstrumentId, "select"));
    row.appendChild(createColumn(ledPriceId, "input", "text"));
    row.appendChild(createColumn(deltaPcntId, "input", "text"));
    row.appendChild(createColumn(deltaUsdId, "input", "text"));
    row.appendChild(createColumn(removeButtonId, "button", "button", "remove"));
    document.getElementById("dataGrid").appendChild(row);

    uiManager.fillDropDownWithData(leadingInstrumentId, await dataManager.getAllSymbols());
    uiManager.fillDropDownWithData(ledInstrumentId, await dataManager.getAllSymbols());

    document.getElementById('removeAllButton').classList.remove('invisible');
}

function createColumn(id, element, type, value) {
    let div = document.createElement("div");
    div.classList.add("col");
    var control = document.createElement(element);
    control.id = id;
    if (!type) {
        control.classList.add("form-select");
        control.addEventListener("change", function () {
            window.stop();
        });
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

function removeDataRow() {
    uiManager.removeRowWithElement(this.id);
    let removedRow = parseInt(this.id.match(/\d+$/)[0], 10);
    recalculateControlIds(removedRow + 1, rowNumber);
    --rowNumber;
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
