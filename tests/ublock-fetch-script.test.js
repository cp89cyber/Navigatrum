const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('uBlock fetch script uses versioned chromium asset', async () => {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'fetch-ublock.mjs');
  const contents = await fs.readFile(scriptPath, 'utf8');
  assert.match(contents, /uBlock0_\$\{version\}\.chromium\.zip/);
});
