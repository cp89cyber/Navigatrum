# uBlock Origin Built-In + One-Click Updater Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bundle uBlock Origin 1.69.0 in Navigatrum and add a one-click in-app updater that pulls the latest Chromium release from GitHub Releases (stable + prerelease).

**Architecture:** Load uBO as an unpacked extension into the webview session from either a bundled path or a userData install path. A main-process updater checks GitHub Releases, downloads the Chromium zip, extracts to userData, updates state, and reloads the extension. Renderer only calls IPC to show status and trigger updates.

**Tech Stack:** Electron main/renderer, Node.js fs/https, `extract-zip` for zip extraction, Node test runner.

### Task 1: Add version parsing/comparison utilities

**Files:**
- Create: `src/ublock/versioning.js`
- Create: `tests/ublock-versioning.test.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareVersions, normalizeVersion } = require('../src/ublock/versioning');

test('version comparison treats stable > prerelease', () => {
  assert.equal(compareVersions('1.69.1', '1.69.1b0') > 0, true);
});

test('version comparison sorts numeric parts', () => {
  assert.equal(compareVersions('1.69.0', '1.68.9') > 0, true);
});

test('normalizeVersion strips leading v and whitespace', () => {
  assert.equal(normalizeVersion(' v1.69.0 '), '1.69.0');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-versioning.test.js`
Expected: FAIL with "Cannot find module '../src/ublock/versioning'"

**Step 3: Write minimal implementation**

```js
const VERSION_RE = /^v?\s*([0-9]+(?:\.[0-9]+)*)([a-z].*)?$/i;

function normalizeVersion(input) {
  return String(input || '').trim().replace(/^v/i, '').trim();
}

function splitVersion(input) {
  const normalized = normalizeVersion(input);
  const match = VERSION_RE.exec(normalized);
  if (!match) {
    return { numbers: [], suffix: normalized };
  }
  const numbers = match[1].split('.').map((part) => Number(part));
  const suffix = match[2] ? match[2].toLowerCase() : '';
  return { numbers, suffix };
}

function compareVersions(a, b) {
  const left = splitVersion(a);
  const right = splitVersion(b);
  const max = Math.max(left.numbers.length, right.numbers.length);
  for (let i = 0; i < max; i += 1) {
    const diff = (left.numbers[i] || 0) - (right.numbers[i] || 0);
    if (diff !== 0) return diff;
  }
  if (left.suffix === right.suffix) return 0;
  if (!left.suffix) return 1;
  if (!right.suffix) return -1;
  return left.suffix.localeCompare(right.suffix);
}

module.exports = { compareVersions, normalizeVersion };
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/ublock-versioning.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ublock/versioning.js tests/ublock-versioning.test.js
git commit -m "test: add ublock version comparison"
```

### Task 2: Parse GitHub release data for stable/prerelease + asset selection

**Files:**
- Create: `src/ublock/github.js`
- Create: `tests/ublock-github.test.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { pickLatestReleases } = require('../src/ublock/github');

const releases = [
  {
    tag_name: '1.69.0',
    prerelease: false,
    assets: [{ name: 'uBlock0_1.69.0.chromium.zip', browser_download_url: 'https://example/stable.zip' }],
  },
  {
    tag_name: '1.69.1b0',
    prerelease: true,
    assets: [{ name: 'uBlock0_1.69.1b0.chromium.zip', browser_download_url: 'https://example/beta.zip' }],
  },
];

test('pickLatestReleases selects stable and prerelease assets', () => {
  const result = pickLatestReleases(releases);
  assert.equal(result.latestStable.version, '1.69.0');
  assert.equal(result.latestStable.assetUrl, 'https://example/stable.zip');
  assert.equal(result.latestPrerelease.version, '1.69.1b0');
  assert.equal(result.latestPrerelease.assetUrl, 'https://example/beta.zip');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-github.test.js`
Expected: FAIL with "Cannot find module '../src/ublock/github'"

**Step 3: Write minimal implementation**

```js
const { compareVersions, normalizeVersion } = require('./versioning');

const ASSET_RE = /^uBlock0_.+\.chromium\.zip$/i;

function pickLatestReleases(releases = []) {
  let latestStable = null;
  let latestPrerelease = null;

  for (const release of releases) {
    const version = normalizeVersion(release.tag_name);
    const asset = (release.assets || []).find((item) => ASSET_RE.test(item.name));
    if (!asset) continue;
    const entry = { version, assetUrl: asset.browser_download_url, id: release.id };
    if (release.prerelease) {
      if (!latestPrerelease || compareVersions(entry.version, latestPrerelease.version) > 0) {
        latestPrerelease = entry;
      }
    } else {
      if (!latestStable || compareVersions(entry.version, latestStable.version) > 0) {
        latestStable = entry;
      }
    }
  }

  return { latestStable, latestPrerelease };
}

module.exports = { pickLatestReleases };
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/ublock-github.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ublock/github.js tests/ublock-github.test.js
git commit -m "test: parse ublock github releases"
```

### Task 3: Add uBlock updater state storage

**Files:**
- Create: `src/ublock/state.js`
- Create: `tests/ublock-state.test.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { readState, writeState, defaultState } = require('../src/ublock/state');
const fs = require('node:fs/promises');
const path = require('node:path');

const tmpDir = path.join(process.cwd(), 'tests', '.tmp');
const stateFile = path.join(tmpDir, 'state.json');

test('readState returns default when file missing', async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  const state = await readState(stateFile);
  assert.deepEqual(state, defaultState());
});

test('writeState persists and readState restores', async () => {
  const payload = { currentVersion: '1.69.0', currentPath: '/tmp/ublock' };
  await writeState(stateFile, payload);
  const state = await readState(stateFile);
  assert.equal(state.currentVersion, '1.69.0');
  assert.equal(state.currentPath, '/tmp/ublock');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-state.test.js`
Expected: FAIL with "Cannot find module '../src/ublock/state'"

**Step 3: Write minimal implementation**

```js
const fs = require('node:fs/promises');
const path = require('node:path');

function defaultState() {
  return {
    currentVersion: null,
    currentPath: null,
    lastCheckAt: null,
    latestStable: null,
    latestPrerelease: null,
    lastReleaseIds: { stable: null, prerelease: null },
  };
}

async function readState(stateFile) {
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch (error) {
    return defaultState();
  }
}

async function writeState(stateFile, next) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  const payload = { ...defaultState(), ...next };
  await fs.writeFile(stateFile, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = { defaultState, readState, writeState };
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/ublock-state.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ublock/state.js tests/ublock-state.test.js
git commit -m "test: add ublock state persistence"
```

### Task 4: Add GitHub fetch + updater download/extract flow

**Files:**
- Modify: `package.json`
- Create: `src/ublock/updater.js`
- Modify: `src/ublock/github.js`
- Create: `tests/ublock-updater.test.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { extractZip } = require('../src/ublock/updater');

const fixture = path.join(__dirname, 'fixtures', 'ublock-fixture.zip');
const target = path.join(__dirname, '.tmp', 'extract');

test('extractZip expands a zip into a target directory', async () => {
  await fs.rm(target, { recursive: true, force: true });
  await extractZip(fixture, target);
  const manifest = await fs.readFile(path.join(target, 'manifest.json'), 'utf8');
  assert.match(manifest, /"name"/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-updater.test.js`
Expected: FAIL with "Cannot find module '../src/ublock/updater'"

**Step 3: Add dependency and implement extractZip + GitHub fetch**

Update `package.json`:

```json
"dependencies": {
  "extract-zip": "^2.0.1"
}
```

Add `src/ublock/updater.js`:

```js
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const https = require('node:https');
const extract = require('extract-zip');
const { pickLatestReleases } = require('./github');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Navigatrum' } }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function extractZip(zipPath, targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
  await extract(zipPath, { dir: targetDir });
}

async function downloadFile(url, targetPath, onProgress) {
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    https.get(url, { headers: { 'User-Agent': 'Navigatrum' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        return;
      }
      const total = Number(res.headers['content-length'] || 0);
      let received = 0;
      res.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress && total) onProgress(received / total);
      });
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function checkForUpdates() {
  const releases = await fetchJson('https://api.github.com/repos/gorhill/uBlock/releases?per_page=10');
  return pickLatestReleases(releases);
}

module.exports = { extractZip, downloadFile, checkForUpdates };
```

**Step 4: Add a small zip fixture**

Create `tests/fixtures/ublock-fixture.zip` containing a minimal `manifest.json` (can be made with `zip` locally). Also add a matching source file `tests/fixtures/manifest.json` for clarity.

**Step 5: Run test to verify it passes**

Run: `node --test tests/ublock-updater.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json package-lock.json src/ublock/updater.js tests/ublock-updater.test.js tests/fixtures
git commit -m "test: add ublock updater download/extract"
```

### Task 5: Add bundled uBlock assets + manager for loading

**Files:**
- Create: `scripts/fetch-ublock.mjs`
- Create: `src/ublock/manager.js`
- Create: `src/ublock/paths.js`
- Add: `src/ublock/bundled/1.69.0/` (unpacked uBO extension)
- Modify: `src/main.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { getBundledPath } = require('../src/ublock/paths');

test('bundled path points at uBlock 1.69.0', () => {
  assert.match(getBundledPath(), /ublock\/bundled\/1.69.0/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-paths.test.js`
Expected: FAIL with "Cannot find module '../src/ublock/paths'"

**Step 3: Add path helpers + manager**

```js
// src/ublock/paths.js
const path = require('node:path');
const { app } = require('electron');

const BUNDLED_VERSION = '1.69.0';

function getBundledPath() {
  return path.join(app.getAppPath(), 'src', 'ublock', 'bundled', BUNDLED_VERSION);
}

function getUserDataBase() {
  return path.join(app.getPath('userData'), 'ublock');
}

module.exports = { BUNDLED_VERSION, getBundledPath, getUserDataBase };
```

```js
// src/ublock/manager.js
const { session } = require('electron');
const { getBundledPath } = require('./paths');

async function loadExtension(extensionPath) {
  const targetSession = session.fromPartition('persist:navigatrum');
  const extension = await targetSession.loadExtension(extensionPath, { allowFileAccess: true });
  return extension;
}

async function loadBundledExtension() {
  return loadExtension(getBundledPath());
}

module.exports = { loadExtension, loadBundledExtension };
```

**Step 4: Add a fetch script for maintainers**

```js
// scripts/fetch-ublock.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';

const version = process.argv[2] || '1.69.0';
const filename = `uBlock0_${version}.chromium.zip`;
const url = `https://github.com/gorhill/uBlock/releases/download/${version}/${filename}`;
const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(root, '..', 'src', 'ublock', 'bundled', version);
const zipPath = path.join(root, '..', 'src', 'ublock', 'bundled', `${version}.zip`);

await fs.mkdir(path.dirname(zipPath), { recursive: true });

await new Promise((resolve, reject) => {
  const file = fs.createWriteStream(zipPath);
  https.get(url, { headers: { 'User-Agent': 'Navigatrum' } }, (res) => {
    if (res.statusCode !== 200) reject(new Error(`Download failed: ${res.statusCode}`));
    res.pipe(file);
    file.on('finish', () => file.close(resolve));
  }).on('error', reject);
});

await fs.rm(target, { recursive: true, force: true });
await extract(zipPath, { dir: target });
await fs.unlink(zipPath);
console.log(`Fetched uBlock ${version} into ${target}`);
```

**Step 5: Modify `src/main.js` to load extension at startup**

Add before creating the window or after app ready:

```js
const { loadBundledExtension } = require('./ublock/manager');

app.whenReady().then(async () => {
  await loadBundledExtension();
  createWindow();
  // ...
});
```

**Step 6: Run test to verify it passes**

Run: `node --test tests/ublock-paths.test.js`
Expected: PASS

**Step 7: Commit**

```bash
git add scripts/fetch-ublock.mjs src/ublock/paths.js src/ublock/manager.js src/main.js tests/ublock-paths.test.js
git commit -m "feat: load bundled ublock extension"
```

### Task 6: Wire updater logic with state + IPC

**Files:**
- Modify: `src/ipc-channels.js`
- Modify: `src/preload.js`
- Modify: `src/main.js`
- Create: `src/ublock/service.js`
- Create: `tests/ublock-ipc.test.js`

**Step 1: Write the failing test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { channels } = require('../src/ipc-channels');

test('ublock IPC channels are namespaced', () => {
  assert.equal(channels.ublockStatus, 'ublock:status');
  assert.equal(channels.ublockCheck, 'ublock:check');
  assert.equal(channels.ublockUpdate, 'ublock:update');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/ublock-ipc.test.js`
Expected: FAIL with missing channel keys

**Step 3: Add IPC channels + preload contract**

Update `src/ipc-channels.js`:

```js
ublockStatus: 'ublock:status',
ublockCheck: 'ublock:check',
ublockUpdate: 'ublock:update',
ublockOpenFolder: 'ublock:open-folder',
ublockProgress: 'ublock:update-progress',
ublockError: 'ublock:update-error',
ublockDone: 'ublock:update-done',
```

Update `src/preload.js` to expose:

```js
ublock: {
  getStatus: () => ipcRenderer.invoke(channels.ublockStatus),
  check: () => ipcRenderer.invoke(channels.ublockCheck),
  update: (channel) => ipcRenderer.invoke(channels.ublockUpdate, channel),
  openFolder: () => ipcRenderer.invoke(channels.ublockOpenFolder),
  onProgress: (handler) => ipcRenderer.on(channels.ublockProgress, (_e, payload) => handler(payload)),
  onError: (handler) => ipcRenderer.on(channels.ublockError, (_e, payload) => handler(payload)),
  onDone: (handler) => ipcRenderer.on(channels.ublockDone, (_e, payload) => handler(payload)),
},
```

**Step 4: Add main-process service**

Create `src/ublock/service.js` to glue state + updater + manager and expose:

```js
async function getStatus() { /* read state + check cached updates */ }
async function check() { /* call checkForUpdates, update state */ }
async function update(channel) { /* download + extract + reload extension */ }
```

**Step 5: Wire IPC handlers in `src/main.js`**

```js
const ublockService = require('./ublock/service');

ipcMain.handle(channels.ublockStatus, () => ublockService.getStatus());
ipcMain.handle(channels.ublockCheck, () => ublockService.check());
ipcMain.handle(channels.ublockUpdate, (_e, channel) => ublockService.update(channel));
ipcMain.handle(channels.ublockOpenFolder, () => ublockService.openFolder());
```

**Step 6: Run test to verify it passes**

Run: `node --test tests/ublock-ipc.test.js`
Expected: PASS

**Step 7: Commit**

```bash
git add src/ipc-channels.js src/preload.js src/main.js src/ublock/service.js tests/ublock-ipc.test.js
git commit -m "feat: add ublock IPC service"
```

### Task 7: Add renderer UI (toolbar + settings panel) with update UX

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/renderer.js`
- Modify: `src/renderer/styles.css`
- Modify: `tests/preload-contract.test.js`
- Modify: `tests/navigation-ipc.test.js`

**Step 1: Update preload contract test**

```js
assert.deepEqual(contract.functions, [
  'navigate',
  'goBack',
  'goForward',
  'reload',
  'resizeWebview',
  'ublock',
]);
```

**Step 2: Update IPC channel test**

```js
assert.equal(channels.ublockStatus, 'ublock:status');
```

**Step 3: Implement UI**

Add a toolbar button and settings panel in `index.html`:

```html
<button id="ublock-button" class="ublock-button" title="uBlock Origin">uBO<span class="badge" hidden></span></button>
<section id="ublock-panel" class="ublock-panel" hidden>
  <h2>uBlock Origin</h2>
  <p id="ublock-current"></p>
  <p id="ublock-latest"></p>
  <div class="ublock-actions">
    <button id="ublock-update-stable">Update to stable</button>
    <button id="ublock-update-prerelease">Update to prerelease</button>
    <button id="ublock-check">Check now</button>
  </div>
  <p id="ublock-warning" class="warning" hidden>Prerelease builds may be unstable.</p>
  <p id="ublock-status"></p>
</section>
```

In `renderer.js`, call `window.navigatrum.ublock.getStatus()` on load, show badge if `updateAvailable` is true, and hook up button handlers to call `check()` and `update('stable'|'prerelease')`. Show prerelease warning before calling `update('prerelease')`.

**Step 4: Style the new UI**

Add styles for `.ublock-button`, `.badge`, `.ublock-panel`, and `.warning` in `styles.css`.

**Step 5: Run full test suite**

Run: `node --test`
Expected: PASS

**Step 6: Commit**

```bash
git add src/renderer/index.html src/renderer/renderer.js src/renderer/styles.css tests/preload-contract.test.js tests/navigation-ipc.test.js
git commit -m "feat: add ublock update UI"
```

### Task 8: Add default extension assets + docs updates

**Files:**
- Add: `src/ublock/bundled/1.69.0/` (unpacked uBlock extension)
- Modify: `README.md` (document updater + bundled version)
- Modify: `docs/security-notes.md` (note extension loading)

**Step 1: Fetch the bundled extension**

Run: `node scripts/fetch-ublock.mjs 1.69.0`
Expected: folder created at `src/ublock/bundled/1.69.0`

**Step 2: Update docs**

Add a short section describing the bundled version and updater behavior.

**Step 3: Commit**

```bash
git add src/ublock/bundled/1.69.0 README.md docs/security-notes.md
git commit -m "docs: document bundled ublock and updater"
```

---

Plan complete and saved to `docs/plans/2026-01-29-ublock-origin-updater-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
