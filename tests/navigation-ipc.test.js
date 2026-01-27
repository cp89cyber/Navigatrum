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
  });
});
