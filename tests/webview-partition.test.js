const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

test('webview uses the uBlock session partition', async () => {
  const htmlPath = path.join(__dirname, '..', 'src', 'renderer', 'index.html');
  const contents = await fs.readFile(htmlPath, 'utf8');
  assert.match(contents, /partition="persist:navigatrum"/);
});
