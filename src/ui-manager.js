function removeAllDataRows(buttonId, dataGridId) {
    document.getElementById(buttonId).classList.toggle('invisible');
    document.getElementById(dataGridId).innerHTML = '';
}

function removeRowWithElement(id) {
    let row = document.getElementById(id).parentNode.parentNode;
    row.remove();
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

module.exports = {
    removeRowWithElement: removeRowWithElement,
    fillDropDownWithData: fillDropDownWithData,
    removeAllDataRows: removeAllDataRows
}