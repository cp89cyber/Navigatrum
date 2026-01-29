const path = require('node:path');

const BUNDLED_VERSION = '1.69.0';

function resolveElectronApp() {
  try {
    const electron = require('electron');
    if (electron && typeof electron === 'object' && electron.app) {
      return electron.app;
    }
  } catch (error) {
    return null;
  }
  return null;
}

function resolveAppPath() {
  const app = resolveElectronApp();
  if (app && typeof app.getAppPath === 'function') {
    return app.getAppPath();
  }
  return path.resolve(__dirname, '..', '..', '..');
}

function getBundledPath() {
  return path.join(resolveAppPath(), 'src', 'ublock', 'bundled', BUNDLED_VERSION);
}

function getUserDataBase() {
  const app = resolveElectronApp();
  if (app && typeof app.getPath === 'function') {
    return path.join(app.getPath('userData'), 'ublock');
  }
  return path.join(resolveAppPath(), '.user-data', 'ublock');
}

module.exports = {
  BUNDLED_VERSION,
  getBundledPath,
  getUserDataBase,
};
