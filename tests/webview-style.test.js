const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('webview CSS does not override Electron default display:flex', () => {
  const cssPath = path.join(__dirname, '..', 'src', 'renderer', 'styles.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  const hasDisplayBlockForWebview =
    /webview\s*\{[^}]*display\s*:\s*block\s*;?/i.test(css);

  assert.equal(
    hasDisplayBlockForWebview,
    false,
    'webview { display: block } breaks Electron webview sizing; keep the default display:flex'
  );
});

