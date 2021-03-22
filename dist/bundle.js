(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

    let removeButtonId = `removeButton${rowNumber}`;

    //Create empty row
    row.appendChild(createColumn(leadingInstrumentId, "select"));
    row.appendChild(createColumn(leadingPriceId, "input", "text"));
    row.appendChild(createColumn(ledInstrumentId, "select"));
    row.appendChild(createColumn(ledPriceId, "input", "text"));
    row.appendChild(createColumn(deltaPcntId, "input", "text"));
    row.appendChild(createColumn(deltaUsdId, "input", "text"));
    row.appendChild(createColumn(removeButtonId, "button", "button", "remove"));

    document.getElementById("instrumentGrid").appendChild(row);

    //Insert data into created row
    initInstrumentDropDown(leadingInstrumentId);
    initInstrumentDropDown(ledInstrumentId);

    pollPricesAndRecomputeDeltasFor(rowNumber);
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
            control.addEventListener("click", function () { removeRow(control.id) }, false);
        }
    }

function removeRow(buttonId) {
    let row = document.getElementById(buttonId).parentNode.parentNode;
    row.remove();
    rowNumber--;
}
  
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJtYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJjb25zdCBTRVJWRVJfVVJMID0gXCJodHRwczovL2RhcGkuYmluYW5jZS5jb20vZGFwaS92MS9cIlxyXG5jb25zdCBBTExfU1lNQk9MUyA9IFwiZXhjaGFuZ2VJbmZvXCI7XHJcbmNvbnN0IFNZTUJPTF9QUklDRSA9IFwidGlja2VyL3ByaWNlXCI7XHJcblxyXG5sZXQgY2FjaGVkSW5zdHJ1bWVudHM7XHJcbmxldCByb3dOdW1iZXIgPSAwO1xyXG5cclxud2luZG93Lm9ubG9hZCA9IGFzeW5jIGZ1bmN0aW9uICgpIHtcclxuICAgIGFkZFJvd0ZpbGxlZFdpdGhEYXRhKHJvd051bWJlcik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImFkZE5ld1BhaXJCdXR0b25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGFkZFJvd0ZpbGxlZFdpdGhEYXRhKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkUm93RmlsbGVkV2l0aERhdGEoKSB7XHJcbiAgICByb3dOdW1iZXIrKztcclxuICAgIGxldCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgcm93LmNsYXNzTGlzdC5hZGQoJ3JvdycpO1xyXG4gICAgcm93LmNsYXNzTGlzdC5hZGQoJ21iLTEnKTtcclxuXHJcbiAgICBsZXQgbGVhZGluZ0luc3RydW1lbnRJZCA9IGBsZWFkaW5nSW5zdHJ1bWVudCR7cm93TnVtYmVyfWA7XHJcbiAgICBsZXQgbGVkSW5zdHJ1bWVudElkID0gYGxlZEluc3RydW1lbnQke3Jvd051bWJlcn1gO1xyXG5cclxuICAgIGxldCBsZWFkaW5nUHJpY2VJZCA9IGBsZWFkaW5nUHJpY2Uke3Jvd051bWJlcn1gO1xyXG4gICAgbGV0IGxlZFByaWNlSWQgPSBgbGVkUHJpY2Uke3Jvd051bWJlcn1gO1xyXG5cclxuICAgIGxldCBkZWx0YVBjbnRJZCA9IGBkZWx0YVBjbnQke3Jvd051bWJlcn1gO1xyXG4gICAgbGV0IGRlbHRhVXNkSWQgPSBgZGVsdGFVc2Qke3Jvd051bWJlcn1gO1xyXG5cclxuICAgIGxldCByZW1vdmVCdXR0b25JZCA9IGByZW1vdmVCdXR0b24ke3Jvd051bWJlcn1gO1xyXG5cclxuICAgIC8vQ3JlYXRlIGVtcHR5IHJvd1xyXG4gICAgcm93LmFwcGVuZENoaWxkKGNyZWF0ZUNvbHVtbihsZWFkaW5nSW5zdHJ1bWVudElkLCBcInNlbGVjdFwiKSk7XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQoY3JlYXRlQ29sdW1uKGxlYWRpbmdQcmljZUlkLCBcImlucHV0XCIsIFwidGV4dFwiKSk7XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQoY3JlYXRlQ29sdW1uKGxlZEluc3RydW1lbnRJZCwgXCJzZWxlY3RcIikpO1xyXG4gICAgcm93LmFwcGVuZENoaWxkKGNyZWF0ZUNvbHVtbihsZWRQcmljZUlkLCBcImlucHV0XCIsIFwidGV4dFwiKSk7XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQoY3JlYXRlQ29sdW1uKGRlbHRhUGNudElkLCBcImlucHV0XCIsIFwidGV4dFwiKSk7XHJcbiAgICByb3cuYXBwZW5kQ2hpbGQoY3JlYXRlQ29sdW1uKGRlbHRhVXNkSWQsIFwiaW5wdXRcIiwgXCJ0ZXh0XCIpKTtcclxuICAgIHJvdy5hcHBlbmRDaGlsZChjcmVhdGVDb2x1bW4ocmVtb3ZlQnV0dG9uSWQsIFwiYnV0dG9uXCIsIFwiYnV0dG9uXCIsIFwicmVtb3ZlXCIpKTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImluc3RydW1lbnRHcmlkXCIpLmFwcGVuZENoaWxkKHJvdyk7XHJcblxyXG4gICAgLy9JbnNlcnQgZGF0YSBpbnRvIGNyZWF0ZWQgcm93XHJcbiAgICBpbml0SW5zdHJ1bWVudERyb3BEb3duKGxlYWRpbmdJbnN0cnVtZW50SWQpO1xyXG4gICAgaW5pdEluc3RydW1lbnREcm9wRG93bihsZWRJbnN0cnVtZW50SWQpO1xyXG5cclxuICAgIHBvbGxQcmljZXNBbmRSZWNvbXB1dGVEZWx0YXNGb3Iocm93TnVtYmVyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ29sdW1uKGlkLCBlbGVtZW50LCB0eXBlLCB2YWx1ZSkge1xyXG4gICAgbGV0IGRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICBkaXYuY2xhc3NMaXN0LmFkZChcImNvbFwiKTtcclxuICAgIHZhciBjb250cm9sID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChlbGVtZW50KTtcclxuICAgIGNvbnRyb2wuaWQgPSBpZDtcclxuICAgIGlmICghdHlwZSkge1xyXG4gICAgICAgIGNvbnRyb2wuY2xhc3NMaXN0LmFkZChcImZvcm0tc2VsZWN0XCIpO1xyXG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAndGV4dCcpIHtcclxuICAgICAgICBjb250cm9sLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgIGNvbnRyb2wuY2xhc3NMaXN0LmFkZChcImZvcm0tY29udHJvbFwiKTtcclxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2J1dHRvbicpIHtcclxuICAgICAgICBjb250cm9sLnR5cGUgPSB0eXBlO1xyXG4gICAgICAgIGNvbnRyb2wuY2xhc3NMaXN0LmFkZChcImJ0blwiKTtcclxuICAgICAgICBjb250cm9sLmNsYXNzTGlzdC5hZGQoXCJidG4tc2Vjb25kYXJ5XCIpO1xyXG4gICAgICAgIGlmICh2YWx1ZSA9PT0gJ3JlbW92ZScpIHtcclxuICAgICAgICAgICAgbGV0IGljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJylcclxuICAgICAgICAgICAgaWNvbi5jbGFzc0xpc3QuYWRkKFwiZmFcIik7XHJcbiAgICAgICAgICAgIGljb24uY2xhc3NMaXN0LmFkZChcImZhLXRyYXNoXCIpO1xyXG4gICAgICAgICAgICBjb250cm9sLmFwcGVuZENoaWxkKGljb24pO1xyXG4gICAgICAgICAgICBjb250cm9sLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbiAoKSB7IHJlbW92ZVJvdyhjb250cm9sLmlkKSB9LCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuZnVuY3Rpb24gcmVtb3ZlUm93KGJ1dHRvbklkKSB7XHJcbiAgICBsZXQgcm93ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnV0dG9uSWQpLnBhcmVudE5vZGUucGFyZW50Tm9kZTtcclxuICAgIHJvdy5yZW1vdmUoKTtcclxuICAgIHJvd051bWJlci0tO1xyXG59XHJcbiAgXHJcbiAgICBkaXYuYXBwZW5kQ2hpbGQoY29udHJvbCk7XHJcbiAgICByZXR1cm4gZGl2O1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBpbml0SW5zdHJ1bWVudERyb3BEb3duKGlkKSB7XHJcbiAgICBpZiAoIWNhY2hlZEluc3RydW1lbnRzKSB7XHJcbiAgICAgICAgY2FjaGVkSW5zdHJ1bWVudHMgPSBhd2FpdCBmaXJlR2V0UmVxdWVzdFRvKEFMTF9TWU1CT0xTKTtcclxuICAgIH1cclxuICAgIGZpbGxEcm9wRG93bldpdGhEYXRhKGlkLCBjYWNoZWRJbnN0cnVtZW50cyk7XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZpcmVHZXRSZXF1ZXN0VG8ocGF0aCkge1xyXG4gICAgbGV0IHVybCA9IFNFUlZFUl9VUkwgKyBwYXRoO1xyXG4gICAgbGV0IHJlcXVlc3RIZWFkZXJzID0gbmV3IEhlYWRlcnMoKTtcclxuICAgIHJlcXVlc3RIZWFkZXJzLmFwcGVuZCgnQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgIC8vaWYgKHRva2VuID0gYXdhaXQgdG9rZW5NYW5hZ2VyLmdldFZhbGlkQXV0aFRva2VuKCkpIHtcclxuICAgIC8vICAgIHJlcXVlc3RIZWFkZXJzLmFwcGVuZCgnQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHt0b2tlbn1gKTtcclxuICAgIC8vfVxyXG4gICAgY29uc3QgcGFyYW1zID0ge1xyXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXHJcbiAgICAgICAgaGVhZGVyczogcmVxdWVzdEhlYWRlcnMsXHJcbiAgICB9O1xyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHBhcmFtcyk7XHJcbiAgICBjb25zdCBqc29uID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xyXG4gICAgcmV0dXJuIGpzb247XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGZpcmVHZXRSZXF1ZXN0V2l0aENhbGxiYWNrKHBhdGgsIGNhbGxiYWNrKSB7XHJcbiAgICBsZXQgdXJsID0gU0VSVkVSX1VSTCArIHBhdGg7XHJcbiAgICBsZXQgeGh0dHAgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgIHhodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAodGhpcy5yZWFkeVN0YXRlID09IDQgJiYgdGhpcy5zdGF0dXMgPT0gMjAwKSB7XHJcbiAgICAgICAgICAgIGNhbGxiYWNrKEpTT04ucGFyc2UoeGh0dHAucmVzcG9uc2VUZXh0KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIHhodHRwLm9wZW4oXCJHRVRcIiwgdXJsLCB0cnVlKTtcclxuICAgIC8veGh0dHAuc2V0UmVxdWVzdEhlYWRlcignQXV0aG9yaXphdGlvbicsIGBCZWFyZXIgJHt0b2tlbldpdGhFeHBpcmF0aW9uLnRva2VufWApO1xyXG4gICAgeGh0dHAuc2VuZCgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaWxsRHJvcERvd25XaXRoRGF0YShpZCwgcmVzcG9uc2UpIHtcclxuICAgIGxldCBkcm9wRG93biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcclxuICAgIHJlbW92ZUFsbENoaWxkTm9kZXMoZHJvcERvd24pO1xyXG4gICAgZm9yIChsZXQgcyBvZiByZXNwb25zZS5zeW1ib2xzKSB7XHJcbiAgICAgICAgZHJvcERvd24uYXBwZW5kQ2hpbGQoY3JlYXRlT3B0aW9uKHMuc3ltYm9sLCBzLnN5bWJvbCkpO1xyXG4gICAgfVxyXG4gICAgc29ydFNlbGVjdE9wdGlvbnMoZHJvcERvd24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZW1vdmVBbGxDaGlsZE5vZGVzKHBhcmVudCkge1xyXG4gICAgd2hpbGUgKHBhcmVudC5maXJzdENoaWxkKSB7XHJcbiAgICAgICAgcGFyZW50LnJlbW92ZUNoaWxkKHBhcmVudC5maXJzdENoaWxkKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlT3B0aW9uKGxhYmVsLCB2YWx1ZSkge1xyXG4gICAgdmFyIG9wdGlvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJvcHRpb25cIik7XHJcbiAgICBvcHRpb24uc2V0QXR0cmlidXRlKFwidmFsdWVcIiwgdmFsdWUpO1xyXG4gICAgb3B0aW9uLmlubmVySFRNTCA9IGxhYmVsO1xyXG4gICAgcmV0dXJuIG9wdGlvbjtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydFNlbGVjdE9wdGlvbnMoc2VsRWxlbSkge1xyXG4gICAgdmFyIHRtcEFyeSA9IG5ldyBBcnJheSgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzZWxFbGVtLm9wdGlvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB0bXBBcnlbaV0gPSBuZXcgQXJyYXkoKTtcclxuICAgICAgICB0bXBBcnlbaV1bMF0gPSBzZWxFbGVtLm9wdGlvbnNbaV0udGV4dDtcclxuICAgICAgICB0bXBBcnlbaV1bMV0gPSBzZWxFbGVtLm9wdGlvbnNbaV0udmFsdWU7XHJcbiAgICB9XHJcbiAgICB0bXBBcnkuc29ydCgpO1xyXG4gICAgd2hpbGUgKHNlbEVsZW0ub3B0aW9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgc2VsRWxlbS5vcHRpb25zWzBdID0gbnVsbDtcclxuICAgIH1cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdG1wQXJ5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG9wID0gbmV3IE9wdGlvbih0bXBBcnlbaV1bMF0sIHRtcEFyeVtpXVsxXSk7XHJcbiAgICAgICAgc2VsRWxlbS5vcHRpb25zW2ldID0gb3A7XHJcbiAgICB9XHJcbiAgICByZXR1cm47XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVlc3RTeW1ib2xQcmljZSh2YWx1ZSwgY2FsbGJhY2spIHtcclxuICAgIGxldCBwYXRoID0gYCR7U1lNQk9MX1BSSUNFfT9zeW1ib2w9JHt2YWx1ZX1gO1xyXG4gICAgZmlyZUdldFJlcXVlc3RXaXRoQ2FsbGJhY2socGF0aCwgY2FsbGJhY2spO1xyXG59XHJcblxyXG5mdW5jdGlvbiBwb2xsUHJpY2VzQW5kUmVjb21wdXRlRGVsdGFzRm9yKHJvd051bSkge1xyXG4gICAgbGV0IGxlYWRpbmdJbnN0cnVtZW50UHJpY2VUZXh0Qm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGxlYWRpbmdQcmljZSR7cm93TnVtfWApO1xyXG4gICAgbGV0IGxlZEluc3RydW1lbnRQcmljZVRleHRCb3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgbGVkUHJpY2Uke3Jvd051bX1gKTtcclxuXHJcbiAgICBsZXQgbGVhZGluZ0luc3RydW1lbnRTZWxlY3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgbGVhZGluZ0luc3RydW1lbnQke3Jvd051bX1gKTtcclxuICAgIGxldCBsZWRJbnN0cnVtZW50U2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGxlZEluc3RydW1lbnQke3Jvd051bX1gKTtcclxuXHJcbiAgICBsZXQgZGVsdGFQY250VGV4dEJveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGBkZWx0YVBjbnQke3Jvd051bX1gKTtcclxuICAgIGxldCBkZWx0YVVzZFRleHRCb3ggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgZGVsdGFVc2Qke3Jvd051bX1gKTtcclxuXHJcbiAgICByZXF1ZXN0U3ltYm9sUHJpY2UobGVhZGluZ0luc3RydW1lbnRTZWxlY3QudmFsdWUsIChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGxlYWRpbmdJbnN0cnVtZW50UHJpY2VUZXh0Qm94LnZhbHVlID0gcmVzcG9uc2VbMF0ucHJpY2U7XHJcbiAgICAgICAgZGVsdGFVc2RUZXh0Qm94LnZhbHVlID0gKHBhcnNlRmxvYXQobGVkSW5zdHJ1bWVudFByaWNlVGV4dEJveC52YWx1ZSkgLSBwYXJzZUZsb2F0KGxlYWRpbmdJbnN0cnVtZW50UHJpY2VUZXh0Qm94LnZhbHVlKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXF1ZXN0U3ltYm9sUHJpY2UobGVkSW5zdHJ1bWVudFNlbGVjdC52YWx1ZSwgKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgbGVkSW5zdHJ1bWVudFByaWNlVGV4dEJveC52YWx1ZSA9IHJlc3BvbnNlWzBdLnByaWNlO1xyXG4gICAgfSk7XHJcbiAgICBkZWx0YVBjbnRUZXh0Qm94LnZhbHVlID0gKGxlZEluc3RydW1lbnRQcmljZVRleHRCb3gudmFsdWUgLyBsZWFkaW5nSW5zdHJ1bWVudFByaWNlVGV4dEJveC52YWx1ZSAtIDEpICogMTAwO1xyXG5cclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyBwb2xsUHJpY2VzQW5kUmVjb21wdXRlRGVsdGFzRm9yKHJvd051bSkgfSwgMTAwMCk7XHJcbn1cclxuIl19
