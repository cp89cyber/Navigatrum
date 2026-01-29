const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const { createUblockService } = require('../src/ublock/service');
const state = require('../src/ublock/state');

function createTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ublock-service-'));
}

test('getStatus reports update availability', async () => {
  const tmp = await createTempDir();
  const stateFile = path.join(tmp, 'state.json');
  await state.writeState(stateFile, {
    currentVersion: '1.69.0',
    latestStable: { version: '1.69.1' },
    latestPrerelease: { version: '1.69.1b0' },
  });

  const service = createUblockService({
    stateFile,
    state,
    compareVersions: (a, b) => (a > b ? 1 : a < b ? -1 : 0),
  });

  const status = await service.getStatus();

  assert.equal(status.updateAvailable.stable, true);
  assert.equal(status.updateAvailable.prerelease, true);
});

test('initialize loads bundled extension when no state path', async () => {
  const tmp = await createTempDir();
  const stateFile = path.join(tmp, 'state.json');
  let loadedPath = null;

  const service = createUblockService({
    stateFile,
    state,
    bundledPath: () => '/bundled/ublock',
    bundledVersion: '1.69.0',
    manager: {
      loadExtension: async (extensionPath) => {
        loadedPath = extensionPath;
        return { id: 'ext' };
      },
    },
  });

  const status = await service.initialize();

  assert.equal(loadedPath, '/bundled/ublock');
  assert.equal(status.currentVersion, '1.69.0');
  assert.equal(status.currentPath, '/bundled/ublock');
});

test('check updates state with latest releases', async () => {
  const tmp = await createTempDir();
  const stateFile = path.join(tmp, 'state.json');

  const service = createUblockService({
    stateFile,
    state,
    updater: {
      checkForUpdates: async () => ({
        latestStable: { version: '1.69.2' },
        latestPrerelease: { version: '1.70.0b1' },
      }),
    },
    now: () => new Date('2026-01-29T12:00:00Z'),
  });

  const status = await service.check();

  assert.equal(status.latestStable.version, '1.69.2');
  assert.equal(status.latestPrerelease.version, '1.70.0b1');
  assert.equal(status.lastCheckAt, '2026-01-29T12:00:00.000Z');
});

test('update downloads, extracts, and loads new version', async () => {
  const tmp = await createTempDir();
  const stateFile = path.join(tmp, 'state.json');
  const extensionsBase = path.join(tmp, 'extensions');
  await state.writeState(stateFile, {
    currentVersion: '1.69.0',
    latestStable: { version: '1.69.3', assetUrl: 'http://example/asset.zip' },
  });

  const calls = { download: null, extract: null, load: null };

  const service = createUblockService({
    stateFile,
    extensionsBase,
    state,
    manager: {
      loadExtension: async (extensionPath) => {
        calls.load = extensionPath;
        return { id: 'ext' };
      },
    },
    updater: {
      downloadFile: async (url, targetPath) => {
        calls.download = { url, targetPath };
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, 'zip');
      },
      extractZip: async (_zipPath, targetDir) => {
        calls.extract = targetDir;
        const nested = path.join(targetDir, 'uBlock0.chromium');
        await fs.mkdir(nested, { recursive: true });
        await fs.writeFile(path.join(nested, 'manifest.json'), '{}');
      },
    },
  });

  const status = await service.update('stable');

  assert.equal(status.currentVersion, '1.69.3');
  assert.ok(calls.download);
  assert.ok(calls.extract);
  assert.equal(calls.load, path.join(extensionsBase, '1.69.3', 'uBlock0.chromium'));
});
