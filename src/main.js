const dataManager = require("./data-manager");
const uiUtils = require("./ui-utils");
const cacheManager = require("./cache-manager");

let rowNumber;

window.onload = async function () {
    rowNumber = 0;
    reloadState();
    document.getElementById("loginLink").addEventListener("click", promptCreds);
    document.getElementById("loginButton").addEventListener("click", login);
    document.getElementById("logoutLink").addEventListener("click", logout);
    document.getElementById("addNewPairButton").addEventListener("click", function () { addDataRow(cacheManager.cacheInstrumentsDataRow); });
    document.getElementById("removeAllButton").addEventListener("click", removeAllDataRows);
    setInterval(pollPricesAndRecomputeDeltas, 1000);
}

async function reloadState() {
    if (cacheManager.isAuthorized()) {
        uiUtils.switchTo(uiUtils.AUTHORIZED)
    } else {
        uiUtils.switchTo(uiUtils.UNAUTHORIZED);
    }
    for (let rn = 0; rn < cacheManager.getCachedInstrumentsCount(); rn++) {
        await addDataRow(cacheManager.selectCachedInstruments);
    }
}

function promptCreds() {
    uiUtils.switchTo(uiUtils.PROMPT_CREDS);
}

function login() {
    let apiKey = document.getElementById("apiKey").value;
    let secretKey = document.getElementById("secretKey").value;
    if (apiKey && secretKey) {
        cacheManager.cache(cacheManager.API_KEY, apiKey);
        cacheManager.cache(cacheManager.SECRET_KEY, secretKey);
        uiUtils.switchTo(uiUtils.AUTHORIZED);
    }
    
}

function logout() {
    cacheManager.remove("apiKey");
    cacheManager.remove("secretKey");
    uiUtils.switchTo(uiUtils.UNAUTHORIZED);
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
    let row = uiUtils.createTableRow();
    row.appendChild(createElementColumn(`leadingInstrument${rowNumber}`, "select"));
    row.appendChild(createElementColumn(`leadingPrice${rowNumber}`, "input", "text"));
    row.appendChild(createElementColumn(`ledInstrument${rowNumber}`, "select"));
    row.appendChild(createElementColumn(`ledPrice${rowNumber}`, "input", "text"));
    row.appendChild(createElementColumn(`deltaPcnt${rowNumber}`, "input", "text"));
    row.appendChild(createElementColumn(`deltaUsd${rowNumber}`, "input", "text"));
    row.appendChild(createElementColumn(`arrowButton${rowNumber}`, "button", "button", "arrow"));
    row.appendChild(createElementColumn(`removeButton${rowNumber}`, "button", "button", "remove"));
    document.getElementById("dataGrid").appendChild(row);
}

function createElementColumn(id, element, type, value) {
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
    }
    else if (type === 'button') {
        control.type = type;
        control.classList.add("btn");
        control.classList.add("btn-secondary");
        switch (value) {
            case "arrow":
                div.classList.add("col-1");
                control.appendChild(uiUtils.createFaIcon("fa-arrow-right"));
                control.addEventListener("click", showBestPrices);
                break;
            case "remove":
                div.classList.add("col-1");
                control.appendChild(uiUtils.createFaIcon("fa-trash"));
                control.addEventListener("click", removeDataRow);
                break;
        }
    }
    div.appendChild(control);
    return div;
}

function onChange() {
    cacheManager.replaceCachedInstrumentsInRow(getRowNumberFrom(this.id));
    window.stop();
}

function showBestPrices() {
    let rn = getRowNumberFrom(this.id);
    let leadingSymbol = document.getElementById(`leadingInstrument${rn}`).value;
    let ledSymbol = document.getElementById(`ledInstrument${rn}`).value;
    if ((leadingSymbol === ledSymbol) && (cacheManager.getCached(cacheManager.API_KEY)==='9iRLSG624ELwzn5gSREn82qVR7zqp7Z3OjYElvnpZydtH6vcLaPoEOeN7XxfEtDY')) {
        window.open(`trend_trading.html?instrument=${leadingSymbol}`, '_blank');
    } else {
        window.open(`best_prices.html?leadingInstrument=${leadingSymbol}&ledInstrument=${ledSymbol}`, '_blank');
    }
}

function removeDataRow() {
    uiUtils.removeRowWithElement(this.id);
    let removedRowNumber = getRowNumberFrom(this.id);
    cacheManager.removeCachedInstrumentsRow(removedRowNumber);
    recalculateControlIds(removedRowNumber + 1, rowNumber);
    --rowNumber;
}

function getRowNumberFrom(id) {
    return parseInt(id.match(/\d+$/)[0], 10);
}

function removeAllDataRows() {
    rowNumber = 0;
    cacheManager.removeAllCachedInstruments();
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