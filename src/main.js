var dataManager = require("./data-manager");
var uiManager = require("./ui-manager");

let rowNumber = 0;

window.onload = async function () {
    addRowFilledWithData(rowNumber);
    document.getElementById("addNewPairButton").addEventListener("click", addRowFilledWithData);
    document.getElementById("removeAllButton").addEventListener("click", removeAllDataRows);
    setInterval(pollPricesAndRecomputeDeltas, 500);
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

    fillDropDownWithData(leadingInstrumentId, await dataManager.getAllSymbols());
    fillDropDownWithData(ledInstrumentId, await dataManager.getAllSymbols());

    document.getElementById('removeAllButton').classList.remove('invisible');
}

function removeAllDataRows() {
    rowNumber = 0;
    document.getElementById('removeAllButton').classList.toggle('invisible');
    document.getElementById("dataGrid").innerHTML = '';
}

function createColumn(id, element, type, value) {
    let div = document.createElement("div");
    div.classList.add("col");
    var control = document.createElement(element);
    control.id = id;
    if (!type) {
        control.classList.add("form-select");
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
            control.addEventListener("click", function () {
                rowNumber = rowNumber - uiManager.removeRowWithElement(control.id);
            }, false);
        }
    }
    div.appendChild(control);
    return div;
}

function fillDropDownWithData(id, symbols) {
    let dropdown = document.getElementById(id);
    uiManager.removeAllChildNodes(dropdown);
    for (let s of symbols) {
        dropdown.appendChild(uiManager.createOption(s.symbol, s.symbol));
    }
    uiManager.sortOptions(dropdown);
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
