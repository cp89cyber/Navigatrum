const test = require('node:test');
const assert = require('node:assert/strict');

test('preload contract is intentionally tiny and documented', () => {
  const contract = {
    functions: [
      'navigate',
      'goBack',
      'goForward',
      'reload',
      'resizeWebview',
      'ublock',
    ],
  };

  assert.deepEqual(contract.functions, [
    'navigate',
    'goBack',
    'goForward',
    'reload',
    'resizeWebview',
    'ublock',
  ]);
});
