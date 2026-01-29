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
