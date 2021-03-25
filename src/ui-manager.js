const LEADING_INSTRUMENT_DROPDOWN = 'leadingInstrument';
const LED_INSTRUMENT_DROPDOWN = 'ledInstrument';

//function fillLeadingInstrumentDropdownWith(rowNumber, data) {
//    let dropDown = document.getElementById(`LEADING_INSTRUMENT_DROPDOWN${rowNumber}`);
//    removeAllChildNodes(dropDown);
//    for (let s of data.symbols) {
//        dropDown.appendChild(createOption(s.symbol, s.symbol));
//    }
//    sortSelectOptions(dropDown);
//}

function removeRowWithElement(id) {
    let row = document.getElementById(id).parentNode.parentNode;
    let removedRows = row ? 1 : 0;
    row.remove();
    return removedRows;
}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
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

function createOption(label, value) {
    var option = document.createElement("option");
    option.setAttribute("value", value);
    option.innerHTML = label;
    return option;
}

function clearOptions(element) {
    element.options.length = 0;
}

module.exports = {
    removeRowWithElement: removeRowWithElement,
    removeAllChildNodes: removeAllChildNodes,
    createOption: createOption,
    sortOptions: sortOptions
}