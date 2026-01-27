const backButton = document.getElementById('back');
const forwardButton = document.getElementById('forward');
const reloadButton = document.getElementById('reload');
const addressForm = document.getElementById('address-form');
const addressInput = document.getElementById('address-input');
const webview = document.getElementById('webview');
const viewport = document.querySelector('.viewport');

let guestWebContentsId = null;
let lastSyncedSize = { width: 0, height: 0 };

function setNavState() {
  backButton.disabled = !webview.canGoBack();
  forwardButton.disabled = !webview.canGoForward();
}

function syncWebviewSize() {
  if (!viewport) {
    return;
  }

  const rect = viewport.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  // Electron's <webview> guest can get stuck at the default 300x150 size
  // when layout changes are driven by CSS grid/flex. Setting explicit pixel
  // sizes ensures the guest viewport updates to match the rendered element.
  const width = Math.floor(rect.width);
  const height = Math.floor(rect.height);

  webview.style.width = `${width}px`;
  webview.style.height = `${height}px`;

  if (!guestWebContentsId) {
    return;
  }

  if (lastSyncedSize.width === width && lastSyncedSize.height === height) {
    return;
  }

  const navigatrumApi = window.navigatrum;
  if (!navigatrumApi || typeof navigatrumApi.resizeWebview !== 'function') {
    return;
  }

  lastSyncedSize = { width, height };
  navigatrumApi.resizeWebview({
    webContentsId: guestWebContentsId,
    width,
    height,
  });
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
  guestWebContentsId = webview.getWebContentsId();
  setNavState();
  syncWebviewSize();
});

if (typeof ResizeObserver === 'function' && viewport) {
  const observer = new ResizeObserver(() => {
    syncWebviewSize();
  });
  observer.observe(viewport);
}

window.addEventListener('resize', () => {
  syncWebviewSize();
});

// Run once after initial layout.
requestAnimationFrame(() => {
  syncWebviewSize();
});
