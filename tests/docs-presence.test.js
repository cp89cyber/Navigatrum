const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('security notes exist', () => {
  assert.equal(fs.existsSync('docs/security-notes.md'), true);
});
