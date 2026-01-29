let electronSession = null;

try {
  const electron = require('electron');
  if (electron && typeof electron === 'object') {
    electronSession = electron.session;
  }
} catch (error) {
  electronSession = null;
}

const { getBundledPath } = require('./paths');

function createExtensionManager(options = {}) {
  const sessionModule = options.session || electronSession;
  const bundledPath = options.bundledPath || getBundledPath;

  function getSession() {
    if (!sessionModule || typeof sessionModule.fromPartition !== 'function') {
      throw new Error('Electron session unavailable');
    }
    return sessionModule.fromPartition('persist:navigatrum');
  }

  async function loadExtension(extensionPath) {
    const targetSession = getSession();
    return targetSession.loadExtension(extensionPath, { allowFileAccess: true });
  }

  async function loadBundledExtension() {
    return loadExtension(bundledPath());
  }

  return {
    loadExtension,
    loadBundledExtension,
  };
}

module.exports = {
  createExtensionManager,
};
