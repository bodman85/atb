const SERVER_URL = "https://dapi.binance.com/dapi/v1/"
const ALL_SYMBOLS = "exchangeInfo";
const SYMBOL_PRICE = "ticker/price";

let cachedInstruments;
let rowNumber = 0;

window.onload = async function () {
    addRowFilledWithData(rowNumber);
    document.getElementById("addNewPairButton").addEventListener("click", addRowFilledWithData);
}

function addRowFilledWithData() {
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

    //Create empty row
    row.appendChild(createColumn(leadingInstrumentId, "select"));
    row.appendChild(createColumn(leadingPriceId, "input", "text"));
    row.appendChild(createColumn(ledInstrumentId, "select"));
    row.appendChild(createColumn(ledPriceId, "input", "text"));
    row.appendChild(createColumn(deltaPcntId, "input", "text"));
    row.appendChild(createColumn(deltaUsdId, "input", "text"));

    document.getElementById("instrumentGrid").appendChild(row);

    //Insert data into created row
    initInstrumentDropDown(leadingInstrumentId);
    initInstrumentDropDown(ledInstrumentId);

    pollPricesAndRecomputeDeltasFor(rowNumber);
}

function createColumn(id, element, type) {
    let div = document.createElement("div");
    div.classList.add("col");
    var control = document.createElement(element);
    if (type) {
        control.type = type;
        control.classList.add("form-control");
    } else {
        control.classList.add("form-select");
    }

    control.setAttribute("id", id);
    div.appendChild(control);
    return div;
}

async function initInstrumentDropDown(id) {
    if (!cachedInstruments) {
        cachedInstruments = await fireGetRequestTo(ALL_SYMBOLS);
    }
    fillDropDownWithData(id, cachedInstruments);
}

async function fireGetRequestTo(path) {
    let url = SERVER_URL + path;
    let requestHeaders = new Headers();
    requestHeaders.append('Content-Type', 'application/json');
    //if (token = await tokenManager.getValidAuthToken()) {
    //    requestHeaders.append('Authorization', `Bearer ${token}`);
    //}
    const params = {
        method: 'GET',
        headers: requestHeaders,
    };
    const response = await fetch(url, params);
    const json = await response.json();
    return json;
}

async function fireGetRequestWithCallback(path, callback) {
    let url = SERVER_URL + path;
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.open("GET", url, true);
    //xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);
    xhttp.send();
}

function fillDropDownWithData(id, response) {
    let dropDown = document.getElementById(id);
    removeAllChildNodes(dropDown);
    for (let s of response.symbols) {
        dropDown.appendChild(createOption(s.symbol, s.symbol));
    }
    sortSelectOptions(dropDown);
}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function createOption(label, value) {
    var option = document.createElement("option");
    option.setAttribute("value", value);
    option.innerHTML = label;
    return option;
}

function sortSelectOptions(selElem) {
    var tmpAry = new Array();
    for (var i = 0; i < selElem.options.length; i++) {
        tmpAry[i] = new Array();
        tmpAry[i][0] = selElem.options[i].text;
        tmpAry[i][1] = selElem.options[i].value;
    }
    tmpAry.sort();
    while (selElem.options.length > 0) {
        selElem.options[0] = null;
    }
    for (var i = 0; i < tmpAry.length; i++) {
        var op = new Option(tmpAry[i][0], tmpAry[i][1]);
        selElem.options[i] = op;
    }
    return;
}

function requestSymbolPrice(value, callback) {
    let path = `${SYMBOL_PRICE}?symbol=${value}`;
    fireGetRequestWithCallback(path, callback);
}

function pollPricesAndRecomputeDeltasFor(rowNum) {
    let leadingInstrumentPriceTextBox = document.getElementById(`leadingPrice${rowNum}`);
    let ledInstrumentPriceTextBox = document.getElementById(`ledPrice${rowNum}`);

    let leadingInstrumentSelect = document.getElementById(`leadingInstrument${rowNum}`);
    let ledInstrumentSelect = document.getElementById(`ledInstrument${rowNum}`);

    let deltaPcntTextBox = document.getElementById(`deltaPcnt${rowNum}`);
    let deltaUsdTextBox = document.getElementById(`deltaUsd${rowNum}`);

    requestSymbolPrice(leadingInstrumentSelect.value, (response) => {
        leadingInstrumentPriceTextBox.value = response[0].price;
        deltaUsdTextBox.value = (parseFloat(ledInstrumentPriceTextBox.value) - parseFloat(leadingInstrumentPriceTextBox.value));
    });

    requestSymbolPrice(ledInstrumentSelect.value, (response) => {
        ledInstrumentPriceTextBox.value = response[0].price;
    });
    deltaPcntTextBox.value = (ledInstrumentPriceTextBox.value / leadingInstrumentPriceTextBox.value - 1) * 100;

    setTimeout(function () { pollPricesAndRecomputeDeltasFor(rowNum) }, 1000);
}
