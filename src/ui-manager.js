function removeRowWithElement(id) {
    let row = document.getElementById(id).parentNode.parentNode;
    row.remove();
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

function fillDropDownWithData(id, symbols) {
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

function removeAllDataRows() {
    document.getElementById('removeAllButton').classList.toggle('invisible');
    document.getElementById("dataGrid").innerHTML = '';
}

module.exports = {
    removeRowWithElement: removeRowWithElement,
    fillDropDownWithData: fillDropDownWithData,
    removeAllDataRows: removeAllDataRows
}