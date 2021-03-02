const ALL_SYMBOLS_URL = "https://dapi.binance.com/dapi/v1/exchangeInfo";
const SYMBOL_PRICE_URL = "https://dapi.binance.com/dapi/v1/ticker/price";

window.onload = async function () {
    initFuturesDropDowns();
}

function initFuturesDropDowns() {
    requestFuturesSymbols(fillFuturesDropdowns);
}

function fillFuturesDropdowns(response) {
    let futuresDropdown1 = document.getElementById("futures-dropdown-1");
    let futuresDropdown2 = document.getElementById("futures-dropdown-2");
    removeAllChildNodes(futuresDropdown1);
    removeAllChildNodes(futuresDropdown2);
    for (let s of response.symbols) {
        futuresDropdown1.appendChild(createOption(s.symbol, s.symbol));
        futuresDropdown2.appendChild(createOption(s.symbol, s.symbol));
    }
    sortSelectOptions(futuresDropdown1);
    sortSelectOptions(futuresDropdown2);
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

function requestFuturesSymbols(callback) {
    fireGetRequestTo(ALL_SYMBOLS_URL, callback);
}

function requestSymbolPrice(value, callback) {
    let url = `${SYMBOL_PRICE_URL}?symbol=${value}`;
    fireGetRequestTo(url, callback);
}

async function fireGetRequestTo(url, callback) {
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

function getSymbolPrice(selectObject, textBoxId) {
    requestSymbolPrice(selectObject.value, (response) => document.getElementById(textBoxId).value = response[0].price);
}
