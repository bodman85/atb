const LEADING_INSTRUMENT = "leadingInstrument";
const LED_INSTRUMENT = "ledInstrument";

const LEADING_INSTRUMENTS = "leadingInstruments";
const LED_INSTRUMENTS = "ledInstruments";


function getInstruments(key) {
    let item = window.localStorage.getItem(key);
    if (item) {
        return JSON.parse(item);
    }
    return [];
}

function cacheDataRow(rn) {
    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);
    let ledInstruments = getInstruments(LED_INSTRUMENTS);
    leadingInstruments.push(document.getElementById(LEADING_INSTRUMENT+rn).value);
    ledInstruments.push(document.getElementById(LED_INSTRUMENT+rn).value);
    cacheInstruments(leadingInstruments, ledInstruments);
}

function cacheInstruments(leadingInstruments, ledInstruments) {
    cache(LEADING_INSTRUMENTS, leadingInstruments);
    cache(LED_INSTRUMENTS, ledInstruments);
}

function cache(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
}

function getCached(key) {
    let item = window.localStorage.getItem(key);
    if (item) {
        return JSON.parse(item);
    } else {
        return "";
    }
}

function remove(key) {
    window.localStorage.removeItem(key);
}

function selectCachedValues(rn) {
    document.getElementById(LEADING_INSTRUMENT + rn).value = getInstruments(LEADING_INSTRUMENTS)[rn - 1];
    document.getElementById(LED_INSTRUMENT + rn).value = getInstruments(LED_INSTRUMENTS)[rn - 1];
}

function replaceCachedRow(rn) {
    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);
    let ledInstruments = getInstruments(LED_INSTRUMENTS);
    leadingInstruments[rn - 1] = document.getElementById(LEADING_INSTRUMENT + rn).value;
    ledInstruments[rn - 1] = document.getElementById(LED_INSTRUMENT + rn).value;
    cacheInstruments(leadingInstruments, ledInstruments);
}

function removeCachedRow(rn) {
    let leadingInstruments = getInstruments(LEADING_INSTRUMENTS);
    let ledInstruments = getInstruments(LED_INSTRUMENTS);
    leadingInstruments.splice(rn - 1, 1);
    ledInstruments.splice(rn - 1, 1);
    cacheInstruments(leadingInstruments, ledInstruments);
}

function removeAllCachedRows() {
    cacheInstruments([], []);
}

function getCachedRowsCount() {
    return getInstruments(LEADING_INSTRUMENTS).length;
}

module.exports = {
    cache: cache,
    getCached: getCached,
    remove: remove,
    selectCachedValues: selectCachedValues,
    cacheDataRow: cacheDataRow,
    replaceCachedRow: replaceCachedRow,
    removeCachedRow: removeCachedRow,
    removeAllCachedRows: removeAllCachedRows,
    getCachedRowsCount: getCachedRowsCount
}