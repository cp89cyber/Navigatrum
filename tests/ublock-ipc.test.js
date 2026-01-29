const test = require('node:test');
const assert = require('node:assert/strict');
const { channels } = require('../src/ipc-channels');

test('ublock IPC channels are namespaced', () => {
  assert.equal(channels.ublockStatus, 'ublock:status');
  assert.equal(channels.ublockCheck, 'ublock:check');
  assert.equal(channels.ublockUpdate, 'ublock:update');
});
