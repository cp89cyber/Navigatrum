const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('main process loads bundled uBlock extension', async () => {
  const mainPath = path.join(__dirname, '..', 'src', 'main.js');
  const contents = await fs.readFile(mainPath, 'utf8');
  assert.match(contents, /createUblockService/);
  assert.match(contents, /ublockService\.initialize/);
});
