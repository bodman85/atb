const UNAUTHORIZED = "unauthorized";
const PROMPT_CREDS = "prompt_creds";
const AUTHORIZED = "authorized"

const UI_STATES = [UNAUTHORIZED, PROMPT_CREDS, AUTHORIZED];

function switchTo(newState) {
    for (let state of UI_STATES) {
        if (state === newState) {
            document.getElementById(state).style.display = 'flex';
        } else {
            document.getElementById(state).style.display = 'none';
        }
    }
}

function clearDataGrid(buttonId, dataGridId) {
    hideElement(buttonId);
    document.getElementById(dataGridId).innerHTML = '';
}

function removeRowWithElement(id) {
    let row = document.getElementById(id).parentNode.parentNode;
    row.remove();
}

function fillDropdownWithData(id, symbols) {
    let dropdown = document.getElementById(id);
    removeAllChildNodes(dropdown);
    for (let s of symbols) {
        dropdown.appendChild(createOption(s.symbol, s.symbol));
    }
    sortOptions(dropdown);
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

function sortOptions(dropdown) {
    var tmpAry = new Array();
    for (var i = 0; i < dropdown.options.length; i++) {
        tmpAry[i] = new Array();
        tmpAry[i][0] = dropdown.options[i].text;
        tmpAry[i][1] = dropdown.options[i].value;
    }
    tmpAry.sort();
    clearOptions(dropdown);
    for (var i = 0; i < tmpAry.length; i++) {
        var op = new Option(tmpAry[i][0], tmpAry[i][1]);
        dropdown.options[i] = op;
    }
    return;
}

function clearOptions(element) {
    element.options.length = 0;
}

function showElement(id) {
    document.getElementById(id).classList.remove('invisible');
}

function hideElement(id) {
    document.getElementById(id).classList.add('invisible');
}

function enableElement(id) {
    document.getElementById(id).disabled = false;
}

function disableElement(id) {
    document.getElementById(id).disabled = true;
}

function paintGreen(id) {
    document.getElementById(id).style.color = 'green';
}

function paintRed(id) {
    document.getElementById(id).style.color = 'red';
}

function paintRedOrGreen(value, id) {
    if (value >= 0) {
        paintGreen(id);
    } else {
        paintRed(id);
    }
}

function createTableRow() {
    let row = document.createElement("div");
    row.classList.add('row');
    row.classList.add('mb-1');
    return row;
}

function createTextColumn(text, attr) {
    let column = document.createElement("div");
    column.classList.add("col");
    column.innerHTML = text;
    if (attr) {
        column.classList.add(attr);
    }
    return column;
}

function createIconButtonColumn(iconName, clickHandler) {
    let column = document.createElement("div");
    column.classList.add("col");
    let button = document.createElement("button");
    button.classList.add("btn");
    button.classList.add("btn-secondary");
    button.appendChild(createFaIcon(iconName));
    button.addEventListener("click", clickHandler);
    column.appendChild(button);
    return column;
}

function createFaIcon(name) {
    let icon = document.createElement('span')
    icon.classList.add("fa");
    icon.classList.add(name);
    return icon;
}

module.exports = {
    UNAUTHORIZED: UNAUTHORIZED,
    PROMPT_CREDS: PROMPT_CREDS,
    AUTHORIZED: AUTHORIZED,
    switchTo: switchTo,
    removeRowWithElement: removeRowWithElement,
    fillDropdownWithData: fillDropdownWithData,
    clearDataGrid: clearDataGrid,
    showElement: showElement,
    hideElement: hideElement,
    enableElement: enableElement,
    disableElement: disableElement,
    paintGreen: paintGreen,
    paintRed: paintRed,
    paintRedOrGreen: paintRedOrGreen,
    createTableRow: createTableRow,
    createTextColumn: createTextColumn,
    createIconButtonColumn: createIconButtonColumn,
    createFaIcon: createFaIcon
}