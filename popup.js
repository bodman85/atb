const LANGUAGES_URL = "https://luxoft-trans-k8s-demo.westeurope.cloudapp.azure.com/api/v1/languages";
const MODELS_URL = "https://luxoft-trans-k8s-demo.westeurope.cloudapp.azure.com/api/v1/models";

window.onload = async function () {
    let loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener("click", function () {
            login();
        });
    }
    let logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener("click", function () {
            logout();
        });
    }
    initFuturesDropDowns();
    let translateButton = document.getElementById('translateButton');
    if (translateButton) {
        translateButton.addEventListener("click", handleButtonClick);
    }
}

function initFuturesDropDowns() {
    requestFuturesSymbols(fillFuturesDropdowns);
    requestSupportedModels(fillModelDropdown);
}

function getStoredAccessToken() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["authToken"], result => {
            let { lastError } = chrome.runtime
            if (typeof lastError !== 'undefined') reject(lastError);
            else resolve(result.authToken);
        });
    });
}

function login() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ authorize: "luxoft_translator" }, tokenWithExpiration => {
            let { lastError } = chrome.runtime
            if (typeof lastError !== 'undefined') reject(lastError);
            else {
                initFuturesDropDowns();
                resolve(tokenWithExpiration);
            }
        });
    });
}

function logout() {
    chrome.storage.local.remove(["authToken"]);
    alert("User logged out successfully");
}


function requestFuturesSymbols(callback) {
    fireGetRequestTo(LANGUAGES_URL, callback);
}

function requestSupportedModels(callback) {
    fireGetRequestTo(MODELS_URL, callback);
}

async function fireGetRequestTo(url, callback) {
    let xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            callback(JSON.parse(xhttp.responseText));
        }
    };
    xhttp.open("GET", url, true);
    let tokenWithExpiration = await getStoredAccessToken();
    if (tokenWithExpiration && !isExpired(tokenWithExpiration)) {
        xhttp.setRequestHeader('Authorization', `Bearer ${tokenWithExpiration.token}`);
    }
    xhttp.send();
}

function fillFuturesDropdowns(languages) {
    let sourceDropdown = document.getElementById("source-language-dropdown");
    let targetDropdown = document.getElementById("target-language-dropdown");
    removeAllChildNodes(sourceDropdown);
    removeAllChildNodes(targetDropdown);
    for (let lang of languages) {
        sourceDropdown.appendChild(createOption(lang.name, lang.id));
        targetDropdown.appendChild(createOption(lang.name, lang.id));
    }
}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function fillModelDropdown(models) {
    let modelDropdown = document.getElementById("model-dropdown");
    for (let model of models) {
        modelDropdown.appendChild(createOption(model.name, model.id));
    }
}

function createOption(label, value) {
    var option = document.createElement("option");
    option.setAttribute("value", value);
    option.innerHTML = label;
    return option;
}

async function loadTabTitle() {
    return new Promise((resolve, reject) => {
        try {
            chrome.tabs.query({
                active: true,
            }, function (tabs) {
                resolve(tabs[0].title);
            })
        } catch (e) {
            reject(e);
        }
    })
}

const invokationScriptId = 'luxoft-translator-invokation'

async function translateTab(token, target, source, model) {
    try {
        let getActiveTabAsync = () => {
            return new Promise(function (resolve, reject) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    let { lastError } = chrome.runtime
                    if (typeof lastError !== 'undefined') reject(lastError);
                    else resolve(tabs[0]);
                });
            });
        }
        let tab = await getActiveTabAsync();
        chrome.tabs.executeScript(tab.id, {
            "code": `if (oldScript = document.getElementById("${invokationScriptId}")){
                        oldScript.remove();
                     }
                     var newScript = document.createElement('script');
                     newScript.setAttribute("id", "${invokationScriptId}");
                     newScript.textContent = 'LuxoftTranslatorJS.translate("${token}",  { targetId: "${target}", sourceId: "${source}", modelId: "${model}" })';
                     document.head.appendChild(newScript);`
        });
    }
    catch (err) {
        console.log(err);
    }
}

function isExpired(token) {
    return Date.now() > token.expiration;
}

async function handleButtonClick() {
    let tokenWithExpiration = await getStoredAccessToken();
    if (tokenWithExpiration && !isExpired(tokenWithExpiration)) {
        let source = document.getElementById("source-language-dropdown").value;
        let target = document.getElementById("target-language-dropdown").value;
        let model = document.getElementById("model-dropdown").value;
        await translateTab(tokenWithExpiration.token, target, source, model);
        //window.close();
    } else {
        alert("User is not logged in or token is expired. Please relogin.");
    }
}
