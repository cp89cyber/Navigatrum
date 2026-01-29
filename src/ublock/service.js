const path = require('node:path');
const fsp = require('node:fs/promises');

const { compareVersions } = require('./versioning');
const { readState, writeState, defaultState } = require('./state');
const { checkForUpdates, downloadFile, extractZip } = require('./updater');
const { createExtensionManager } = require('./manager');
const { getBundledPath, getUserDataBase, BUNDLED_VERSION } = require('./paths');

let electronApp = null;
let electronShell = null;

try {
  const electron = require('electron');
  if (electron && typeof electron === 'object') {
    electronApp = electron.app;
    electronShell = electron.shell;
  }
} catch (error) {
  electronApp = null;
  electronShell = null;
}

function createUblockService(options = {}) {
  const stateFile = options.stateFile || path.join(getUserDataBase(), 'state.json');
  const extensionsBase =
    options.extensionsBase ||
    path.join(path.dirname(getUserDataBase()), 'extensions', 'ublock');
  const manager = options.manager || createExtensionManager();
  const stateOps = options.state || { readState, writeState, defaultState };
  const updater = options.updater || { checkForUpdates, downloadFile, extractZip };
  const compare = options.compareVersions || compareVersions;
  const now = options.now || (() => new Date());
  const fs = options.fs || fsp;
  const bundledPath = options.bundledPath || getBundledPath;
  const bundledVersion = options.bundledVersion || BUNDLED_VERSION;
  const openFolder =
    options.openFolder ||
    (electronShell && typeof electronShell.openPath === 'function'
      ? electronShell.openPath.bind(electronShell)
      : null);

  async function pathExists(target) {
    try {
      await fs.access(target);
      return true;
    } catch (error) {
      return false;
    }
  }

  function buildStatus(state) {
    const stableAvailable =
      state.currentVersion && state.latestStable
        ? compare(state.latestStable.version, state.currentVersion) > 0
        : false;
    const prereleaseAvailable =
      state.currentVersion && state.latestPrerelease
        ? compare(state.latestPrerelease.version, state.currentVersion) > 0
        : false;

    return {
      ...state,
      updateAvailable: {
        stable: stableAvailable,
        prerelease: prereleaseAvailable,
      },
    };
  }

  async function initialize() {
    const current = await stateOps.readState(stateFile);
    let currentPath = current.currentPath;
    let currentVersion = current.currentVersion;

    if (currentPath && (await pathExists(currentPath))) {
      await manager.loadExtension(currentPath);
    } else {
      currentPath = bundledPath();
      currentVersion = bundledVersion;
      await manager.loadExtension(currentPath);
    }

    const nextState = await stateOps.writeState(stateFile, {
      ...current,
      currentPath,
      currentVersion,
    });

    return buildStatus(nextState);
  }

  async function getStatus() {
    const current = await stateOps.readState(stateFile);
    return buildStatus(current);
  }

  async function check() {
    const current = await stateOps.readState(stateFile);
    const latest = await updater.checkForUpdates();
    const nextState = await stateOps.writeState(stateFile, {
      ...current,
      latestStable: latest.latestStable,
      latestPrerelease: latest.latestPrerelease,
      lastReleaseIds: {
        stable: latest.latestStable ? latest.latestStable.id : null,
        prerelease: latest.latestPrerelease ? latest.latestPrerelease.id : null,
      },
      lastCheckAt: now().toISOString(),
    });

    return buildStatus(nextState);
  }

  async function ensureLatest(channel, current) {
    const key = channel === 'prerelease' ? 'latestPrerelease' : 'latestStable';
    if (current[key]) {
      return { release: current[key], state: current };
    }

    const latest = await updater.checkForUpdates();
    const nextState = await stateOps.writeState(stateFile, {
      ...current,
      latestStable: latest.latestStable,
      latestPrerelease: latest.latestPrerelease,
      lastReleaseIds: {
        stable: latest.latestStable ? latest.latestStable.id : null,
        prerelease: latest.latestPrerelease ? latest.latestPrerelease.id : null,
      },
      lastCheckAt: now().toISOString(),
    });

    return { release: nextState[key], state: nextState };
  }

  async function update(channel = 'stable', options = {}) {
    const current = await stateOps.readState(stateFile);
    const { release, state: updatedState } = await ensureLatest(channel, current);

    if (!release) {
      throw new Error(`No ${channel} uBlock Origin release available.`);
    }

    const version = release.version;
    const installPath = path.join(extensionsBase, version);
    const downloadDir = path.join(path.dirname(stateFile), 'downloads');
    const downloadPath = path.join(downloadDir, `ublock-${version}.zip`);

    await fs.rm(installPath, { recursive: true, force: true });
    await updater.downloadFile(release.assetUrl, downloadPath, options.onProgress);
    await updater.extractZip(downloadPath, installPath);
    await fs.rm(downloadPath, { force: true });

    await manager.loadExtension(installPath);

    const nextState = await stateOps.writeState(stateFile, {
      ...updatedState,
      currentVersion: version,
      currentPath: installPath,
    });

    return buildStatus(nextState);
  }

  async function openFolderPath() {
    const base = path.dirname(stateFile);
    if (openFolder) {
      return openFolder(base);
    }
    return base;
  }

  return {
    initialize,
    getStatus,
    check,
    update,
    openFolder: openFolderPath,
    stateFile,
    extensionsBase,
    userDataPath: electronApp && electronApp.getPath ? electronApp.getPath('userData') : null,
  };
}

module.exports = {
  createUblockService,
};
