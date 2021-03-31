window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const myParam = urlParams.get('pussy');
    console.log('Hi ' + myParam);
}