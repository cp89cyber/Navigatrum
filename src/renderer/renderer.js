const backButton = document.getElementById('back');
const forwardButton = document.getElementById('forward');
const reloadButton = document.getElementById('reload');
const addressForm = document.getElementById('address-form');
const addressInput = document.getElementById('address-input');
const webview = document.getElementById('webview');

function setNavState() {
  backButton.disabled = !webview.canGoBack();
  forwardButton.disabled = !webview.canGoForward();
}

async function navigateFromInput() {
  const normalized = await window.navigatrum.navigate(addressInput.value);
  addressInput.value = normalized;
  webview.loadURL(normalized);
}

addressForm.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateFromInput();
});

backButton.addEventListener('click', () => webview.goBack());
forwardButton.addEventListener('click', () => webview.goForward());
reloadButton.addEventListener('click', () => webview.reload());

webview.addEventListener('did-start-navigation', (event) => {
  if (event.isMainFrame) {
    addressInput.value = event.url;
  }
});

webview.addEventListener('did-navigate', () => {
  setNavState();
});

webview.addEventListener('did-navigate-in-page', () => {
  setNavState();
});

webview.addEventListener('dom-ready', () => {
  setNavState();
});
