const test = require('node:test');
const assert = require('node:assert/strict');
const { getBundledPath } = require('../src/ublock/paths');

test('bundled path points at uBlock 1.69.0', () => {
  assert.match(getBundledPath(), /ublock\/bundled\/1\.69\.0/);
});
