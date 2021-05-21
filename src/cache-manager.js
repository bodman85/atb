const LEADING_INSTRUMENT = "leadingInstrument";
const LED_INSTRUMENT = "ledInstrument";

const LEADING_INSTRUMENTS = "leadingInstruments";
const LED_INSTRUMENTS = "ledInstruments";

const ORDERS = "orders";

const API_KEY = "apiKey";
const SECRET_KEY = "secretKey"

function cacheInstrumentsDataRow(rn) {
    let leadingInstruments = getCachedArray(LEADING_INSTRUMENTS);
    let ledInstruments = getCachedArray(LED_INSTRUMENTS);
    leadingInstruments.push(document.getElementById(LEADING_INSTRUMENT+rn).value);
    ledInstruments.push(document.getElementById(LED_INSTRUMENT+rn).value);
    cacheInstruments(leadingInstruments, ledInstruments);
}

function cacheInstruments(leadingInstruments, ledInstruments) {
    cache(LEADING_INSTRUMENTS, leadingInstruments);
    cache(LED_INSTRUMENTS, ledInstruments);
}

function cacheOrder(order) {
    let orders = getCachedArray(ORDERS);
    orders.push(order);
    cache(ORDERS, orders);
}

function updateOrder(order) {
    let orders = getCachedArray(ORDERS);
    let index = orders.findIndex(o => o.id === order.id);
    if (index > -1) {
        orders[index] = order;
        cache(ORDERS, orders);
        return true;
    } else {
        return false;
    }
}

function removeOrder(orderId) {
    let orders = getCachedArray(ORDERS).filter(order => order.id != orderId);
    cache(ORDERS, orders);
}

function findOrderBy(id) {
    return getCachedArray(ORDERS).find(o => o.id === id);
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

function getCachedArray(key) {
    let item = window.localStorage.getItem(key);
    if (item) {
        return JSON.parse(item);
    }
    return [];
}

function remove(key) {
    window.localStorage.removeItem(key);
}

function clearAll(key) {
    cache(key, []);
}

function isAuthorized() {
    let apiKey = getCached(API_KEY);
    let secretKey = getCached(SECRET_KEY);
    return (apiKey && secretKey);
}

function selectCachedInstruments(rn) {
    document.getElementById(LEADING_INSTRUMENT + rn).value = getCachedArray(LEADING_INSTRUMENTS)[rn - 1];
    document.getElementById(LED_INSTRUMENT + rn).value = getCachedArray(LED_INSTRUMENTS)[rn - 1];
}

function replaceCachedInstrumentsInRow(rn) {
    let leadingInstruments = getCachedArray(LEADING_INSTRUMENTS);
    let ledInstruments = getCachedArray(LED_INSTRUMENTS);
    leadingInstruments[rn - 1] = document.getElementById(LEADING_INSTRUMENT + rn).value;
    ledInstruments[rn - 1] = document.getElementById(LED_INSTRUMENT + rn).value;
    cacheInstruments(leadingInstruments, ledInstruments);
}

function removeCachedInstrumentsRow(rn) {
    let leadingInstruments = getCachedArray(LEADING_INSTRUMENTS);
    let ledInstruments = getCachedArray(LED_INSTRUMENTS);
    leadingInstruments.splice(rn - 1, 1);
    ledInstruments.splice(rn - 1, 1);
    cacheInstruments(leadingInstruments, ledInstruments);
}

function removeAllCachedInstruments() {
    cacheInstruments([], []);
}

function getCachedInstrumentsCount() {
    return getCachedArray(LEADING_INSTRUMENTS).length;
}

module.exports = {
    ORDERS: ORDERS,
    cache: cache,
    getCached: getCached,
    getCachedArray: getCachedArray,
    remove: remove,
    clearAll: clearAll,
    API_KEY: API_KEY,
    SECRET_KEY: SECRET_KEY,
    isAuthorized: isAuthorized,
    selectCachedInstruments: selectCachedInstruments,
    cacheInstrumentsDataRow: cacheInstrumentsDataRow,
    replaceCachedInstrumentsInRow: replaceCachedInstrumentsInRow,
    removeCachedInstrumentsRow: removeCachedInstrumentsRow,
    removeAllCachedInstruments: removeAllCachedInstruments,
    getCachedInstrumentsCount: getCachedInstrumentsCount,
    cacheOrder: cacheOrder,
    updateOrder: updateOrder,
    removeOrder: removeOrder,
    findOrderBy: findOrderBy
}