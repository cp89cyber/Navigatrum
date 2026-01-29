const backButton = document.getElementById('back');
const forwardButton = document.getElementById('forward');
const reloadButton = document.getElementById('reload');
const addressForm = document.getElementById('address-form');
const addressInput = document.getElementById('address-input');
const webview = document.getElementById('webview');
const viewport = document.querySelector('.viewport');

const ublockButton = document.getElementById('ublock-button');
const ublockPanel = document.getElementById('ublock-panel');
const ublockClose = document.getElementById('ublock-close');
const ublockBadge = ublockButton ? ublockButton.querySelector('.badge') : null;
const ublockCurrent = document.getElementById('ublock-current');
const ublockLatest = document.getElementById('ublock-latest');
const ublockLastCheck = document.getElementById('ublock-last-check');
const ublockUpdateStable = document.getElementById('ublock-update-stable');
const ublockUpdatePrerelease = document.getElementById('ublock-update-prerelease');
const ublockCheck = document.getElementById('ublock-check');
const ublockOpenFolder = document.getElementById('ublock-open-folder');
const ublockWarning = document.getElementById('ublock-warning');
const ublockProgress = document.getElementById('ublock-progress');
const ublockProgressBar = ublockProgress
  ? ublockProgress.querySelector('.ublock-progress__bar')
  : null;
const ublockStatus = document.getElementById('ublock-status');

const ublockApi = window.navigatrum && window.navigatrum.ublock;

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

function formatVersion(version) {
  return version || 'Unknown';
}

function formatLastCheck(value) {
  if (!value) {
    return 'Never';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function setUblockStatus(message) {
  if (!ublockStatus) {
    return;
  }
  ublockStatus.textContent = message || '';
}

function setUblockProgress(progress) {
  if (!ublockProgress || !ublockProgressBar) {
    return;
  }
  if (typeof progress === 'number') {
    ublockProgress.hidden = false;
    const percent = Math.max(0, Math.min(1, progress));
    ublockProgressBar.style.width = `${Math.round(percent * 100)}%`;
  } else {
    ublockProgress.hidden = true;
    ublockProgressBar.style.width = '0%';
  }
}

function renderUblockStatus(status) {
  if (!status) {
    return;
  }

  if (ublockCurrent) {
    ublockCurrent.textContent = `Current: ${formatVersion(status.currentVersion)}`;
  }
  if (ublockLatest) {
    const stable = formatVersion(status.latestStable && status.latestStable.version);
    const prerelease = formatVersion(
      status.latestPrerelease && status.latestPrerelease.version,
    );
    ublockLatest.textContent = `Latest stable: ${stable} · Latest prerelease: ${prerelease}`;
  }
  if (ublockLastCheck) {
    ublockLastCheck.textContent = `Last checked: ${formatLastCheck(status.lastCheckAt)}`;
  }

  if (ublockWarning) {
    ublockWarning.hidden = !status.latestPrerelease;
  }

  if (ublockBadge) {
    const hasUpdate =
      (status.updateAvailable && status.updateAvailable.stable) ||
      (status.updateAvailable && status.updateAvailable.prerelease);
    ublockBadge.hidden = !hasUpdate;
  }

  if (ublockUpdateStable) {
    ublockUpdateStable.disabled =
      !status.latestStable ||
      !(status.updateAvailable && status.updateAvailable.stable);
  }
  if (ublockUpdatePrerelease) {
    ublockUpdatePrerelease.disabled =
      !status.latestPrerelease ||
      !(status.updateAvailable && status.updateAvailable.prerelease);
  }
}

async function refreshUblockStatus() {
  if (!ublockApi) {
    return;
  }
  try {
    const status = await ublockApi.getStatus();
    renderUblockStatus(status);
  } catch (error) {
    setUblockStatus('Unable to load uBlock Origin status.');
  }
}

async function handleUblockCheck() {
  if (!ublockApi) {
    return;
  }
  setUblockStatus('Checking for updates...');
  try {
    const status = await ublockApi.check();
    renderUblockStatus(status);
    setUblockStatus('Check complete.');
  } catch (error) {
    setUblockStatus('Failed to check for updates.');
  }
}

async function handleUblockUpdate(channel) {
  if (!ublockApi) {
    return;
  }
  if (channel === 'prerelease') {
    const confirmed = window.confirm(
      'Prerelease builds may be unstable. Continue with update?',
    );
    if (!confirmed) {
      return;
    }
  }

  setUblockStatus('Starting update...');
  setUblockProgress(0);
  try {
    const status = await ublockApi.update(channel);
    renderUblockStatus(status);
    setUblockStatus('Update complete.');
  } catch (error) {
    setUblockStatus('Update failed.');
    setUblockProgress(null);
  }
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

if (ublockButton && ublockPanel) {
  ublockButton.addEventListener('click', () => {
    ublockPanel.hidden = !ublockPanel.hidden;
    if (!ublockPanel.hidden) {
      refreshUblockStatus();
    }
  });
}

if (ublockClose && ublockPanel) {
  ublockClose.addEventListener('click', () => {
    ublockPanel.hidden = true;
  });
}

if (ublockCheck) {
  ublockCheck.addEventListener('click', () => {
    handleUblockCheck();
  });
}

if (ublockUpdateStable) {
  ublockUpdateStable.addEventListener('click', () => {
    handleUblockUpdate('stable');
  });
}

if (ublockUpdatePrerelease) {
  ublockUpdatePrerelease.addEventListener('click', () => {
    handleUblockUpdate('prerelease');
  });
}

if (ublockOpenFolder && ublockApi) {
  ublockOpenFolder.addEventListener('click', () => {
    ublockApi.openFolder().catch(() => {
      setUblockStatus('Unable to open extension folder.');
    });
  });
}

if (ublockApi) {
  ublockApi.onProgress((payload) => {
    if (payload && typeof payload.progress === 'number') {
      setUblockProgress(payload.progress);
      setUblockStatus(`Downloading update (${Math.round(payload.progress * 100)}%)...`);
    }
  });

  ublockApi.onDone((status) => {
    setUblockProgress(null);
    renderUblockStatus(status);
    setUblockStatus('Update complete.');
  });

  ublockApi.onError((payload) => {
    setUblockProgress(null);
    const message = payload && payload.message ? payload.message : 'Update failed.';
    setUblockStatus(message);
  });

  refreshUblockStatus();
} else if (ublockButton) {
  ublockButton.disabled = true;
  setUblockStatus('uBlock Origin is unavailable.');
}

// Run once after initial layout.
requestAnimationFrame(() => {
  syncWebviewSize();
});
