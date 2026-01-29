const test = require('node:test');
const assert = require('node:assert/strict');

const { channels } = require('../src/ipc-channels');

test('navigation IPC channel names are namespaced and stable', () => {
  assert.deepEqual(channels, {
    navigate: 'browser:navigate',
    back: 'browser:back',
    forward: 'browser:forward',
    reload: 'browser:reload',
    resizeWebview: 'browser:resize-webview',
    ublockStatus: 'ublock:status',
    ublockCheck: 'ublock:check',
    ublockUpdate: 'ublock:update',
    ublockOpenFolder: 'ublock:open-folder',
    ublockProgress: 'ublock:update-progress',
    ublockError: 'ublock:update-error',
    ublockDone: 'ublock:update-done',
  });
});
