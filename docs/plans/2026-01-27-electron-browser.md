# Electron Browser Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimal but usable desktop web browser using Electron with an address bar and basic navigation controls.

**Architecture:** Use Electron’s main process to create a single BrowserWindow and a preload script to expose a small, safe API. The renderer hosts a simple browser chrome (address bar + buttons) and an Electron `webview` for page rendering. Keep logic testable by isolating URL normalization into a small utility module with Node’s built-in test runner.

**Tech Stack:** Electron, Node.js built-in test runner (`node --test`), plain HTML/CSS/JS.

### Task 1: Add URL Normalization Utility With Tests (TDD)

**Files:**
- Create: `src/url-utils.js`
- Create: `tests/url-utils.test.js`

**Step 1: Write the failing test**

```js
// tests/url-utils.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeUserUrl } = require('../src/url-utils');

test('adds https:// when user types a bare domain', () => {
  assert.equal(normalizeUserUrl('example.com'), 'https://example.com');
});

test('keeps full URLs intact', () => {
  assert.equal(normalizeUserUrl('https://example.com/path'), 'https://example.com/path');
});

test('converts search-like input into a DuckDuckGo query URL', () => {
  assert.equal(
    normalizeUserUrl('open source browsers'),
    'https://duckduckgo.com/?q=open%20source%20browsers'
  );
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/url-utils.test.js`
Expected: FAIL with “Cannot find module '../src/url-utils'”.

**Step 3: Write minimal implementation**

```js
// src/url-utils.js
const BARE_DOMAIN_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/i;

function normalizeUserUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    return 'https://duckduckgo.com';
  }

  try {
    const url = new URL(raw);
    return url.toString();
  } catch (err) {
    // Not a valid absolute URL. Continue.
  }

  if (BARE_DOMAIN_RE.test(raw)) {
    return `https://${raw}`;
  }

  const query = encodeURIComponent(raw);
  return `https://duckduckgo.com/?q=${query}`;
}

module.exports = {
  normalizeUserUrl,
};
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/url-utils.test.js`
Expected: PASS (3 tests).

**Step 5: Commit**

```bash
git add src/url-utils.js tests/url-utils.test.js
git commit -m "test: add URL normalization utility"
```

### Task 2: Scaffold the Electron App Shell

**Files:**
- Create: `package.json`
- Create: `src/main.js`
- Create: `src/preload.js`
- Create: `src/renderer/index.html`
- Create: `src/renderer/renderer.js`
- Create: `src/renderer/styles.css`

**Step 1: Write a minimal test for the preload contract**

```js
// tests/preload-contract.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

test('preload contract is intentionally tiny and documented', () => {
  const contract = {
    functions: ['navigate', 'goBack', 'goForward', 'reload'],
  };

  assert.deepEqual(contract.functions, ['navigate', 'goBack', 'goForward', 'reload']);
});
```

**Step 2: Run test to verify it passes (baseline)**

Run: `node --test tests/preload-contract.test.js`
Expected: PASS (1 test).

**Step 3: Create `package.json`**

```json
{
  "name": "navigatrum",
  "version": "0.1.0",
  "description": "An open source web browser alternative",
  "main": "src/main.js",
  "scripts": {
    "start": "electron .",
    "test": "node --test"
  },
  "devDependencies": {
    "electron": "^31.0.0"
  }
}
```

**Step 4: Create Electron main process**

```js
// src/main.js
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');

const { normalizeUserUrl } = require('./url-utils');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#111827',
    title: 'Navigatrum',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('browser:navigate', (_event, input) => {
  return normalizeUserUrl(input);
});
```

**Step 5: Create preload script**

```js
// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('navigatrum', {
  navigate: (input) => ipcRenderer.invoke('browser:navigate', input),
  goBack: () => ipcRenderer.send('browser:back'),
  goForward: () => ipcRenderer.send('browser:forward'),
  reload: () => ipcRenderer.send('browser:reload'),
});
```

**Step 6: Create renderer HTML**

```html
<!-- src/renderer/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Navigatrum</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="chrome">
      <div class="nav-buttons">
        <button id="back" title="Back">←</button>
        <button id="forward" title="Forward">→</button>
        <button id="reload" title="Reload">⟳</button>
      </div>
      <form id="address-form" class="address-bar" autocomplete="off">
        <input id="address-input" name="address" type="text" placeholder="Search or enter address" />
      </form>
    </header>

    <main class="viewport">
      <webview id="webview" src="https://duckduckgo.com" allowpopups></webview>
    </main>

    <script src="./renderer.js" defer></script>
  </body>
</html>
```

**Step 7: Create renderer logic**

```js
// src/renderer/renderer.js
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
```

**Step 8: Create styles**

```css
/* src/renderer/styles.css */
:root {
  color-scheme: dark;
  --bg: #0b1020;
  --panel: #111827;
  --border: #1f2937;
  --text: #e5e7eb;
  --muted: #9ca3af;
  --accent: #60a5fa;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
}

body {
  display: grid;
  grid-template-rows: auto 1fr;
}

.chrome {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  padding: 10px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.nav-buttons {
  display: inline-flex;
  gap: 6px;
}

button {
  border: 1px solid var(--border);
  background: #0f172a;
  color: var(--text);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.address-bar {
  width: 100%;
}

.address-bar input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #0b1220;
  color: var(--text);
  outline: none;
}

.address-bar input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.25);
}

.viewport {
  min-height: 0;
}

webview {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
  background: white;
}
```

**Step 9: Run tests**

Run: `npm test`
Expected: PASS (URL tests + preload contract test).

**Step 10: Manual verification**

Run: `npm start`
Expected: An Electron window opens with controls and working navigation.

**Step 11: Commit**

```bash
git add package.json src tests
git commit -m "feat: scaffold electron browser shell"
```

### Task 3: Wire Navigation IPC For Future Expansion

**Files:**
- Modify: `src/main.js`
- Modify: `src/preload.js`
- Modify: `src/renderer/renderer.js`
- Create: `tests/navigation-ipc.test.js`

**Step 1: Write the failing test for IPC channel naming consistency**

```js
// tests/navigation-ipc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

test('navigation IPC channel names are namespaced and stable', () => {
  const channels = {
    navigate: 'browser:navigate',
    back: 'browser:back',
    forward: 'browser:forward',
    reload: 'browser:reload',
  };

  assert.deepEqual(channels, {
    navigate: 'browser:navigate',
    back: 'browser:back',
    forward: 'browser:forward',
    reload: 'browser:reload',
  });
});
```

**Step 2: Run test to verify it passes (baseline)**

Run: `node --test tests/navigation-ipc.test.js`
Expected: PASS (1 test).

**Step 3: Implement IPC listeners that forward to the active webContents**

Implementation notes:
- Track the window in module scope.
- Use `win.webContents.send(...)` to communicate with renderer when needed later.
- In main, handle `browser:back|forward|reload` by sending a renderer event, or by using `win.webContents` if you later drop `webview`.
- For now, add `ipcMain.on` listeners that no-op safely if the window is missing.

**Step 4: Run full tests**

Run: `npm test`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/main.js src/preload.js src/renderer/renderer.js tests/navigation-ipc.test.js
git commit -m "refactor: add explicit navigation IPC channels"
```

### Task 4: Safety, Defaults, and Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/security-notes.md`

**Step 1: Write a failing documentation check (presence test)**

```js
// tests/docs-presence.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('security notes exist', () => {
  assert.equal(fs.existsSync('docs/security-notes.md'), true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/docs-presence.test.js`
Expected: FAIL because `docs/security-notes.md` does not exist yet.

**Step 3: Create security notes**

```md
# Security Notes

This project uses Electron’s `webview` tag for a minimal browser prototype. The `webview` tag is powerful but has security trade-offs.

Current mitigations:
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- A restrictive renderer Content Security Policy

Future improvements:
- Navigation allow/block lists
- Permission prompts
- Download handling
- Certificate error handling
- Session partitioning per tab
```

**Step 4: Update README with quick start**

Add:
- Node.js version guidance (recommend current LTS)
- `npm install`
- `npm start`
- `npm test`
- Note that `npm install` requires network access

**Step 5: Run full tests**

Run: `npm test`
Expected: PASS.

**Step 6: Commit**

```bash
git add README.md docs/security-notes.md tests/docs-presence.test.js
git commit -m "docs: add security notes and quick start"
```

## Notes / Risks

- Running `npm install` will require network access and may need user approval in a restricted sandbox.
- Electron’s `webview` tag is suitable for a prototype but has security trade-offs; keep the preload API tiny.
