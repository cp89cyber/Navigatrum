const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const { readState, writeState, defaultState } = require('../src/ublock/state');

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
