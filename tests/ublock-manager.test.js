const test = require('node:test');
const assert = require('node:assert/strict');

const { createExtensionManager } = require('../src/ublock/manager');

test('loadExtension uses the uBlock session partition', async () => {
  let partitionUsed = null;
  let loadArgs = null;

  const fakeSession = {
    fromPartition: (partition) => {
      partitionUsed = partition;
      return {
        loadExtension: async (...args) => {
          loadArgs = args;
          return { id: 'ext-1' };
        },
      };
    },
  };

  const manager = createExtensionManager({
    session: fakeSession,
    bundledPath: () => '/bundled/ublock',
  });

  const extension = await manager.loadExtension('/custom/path');

  assert.equal(partitionUsed, 'persist:navigatrum');
  assert.deepEqual(loadArgs, ['/custom/path', { allowFileAccess: true }]);
  assert.equal(extension.id, 'ext-1');
});

test('loadBundledExtension uses bundled path helper', async () => {
  let called = false;
  const fakeSession = {
    fromPartition: () => ({
      loadExtension: async (extensionPath) => {
        return { id: extensionPath };
      },
    }),
  };

  const manager = createExtensionManager({
    session: fakeSession,
    bundledPath: () => {
      called = true;
      return '/bundled/ublock';
    },
  });

  const extension = await manager.loadBundledExtension();

  assert.equal(called, true);
  assert.equal(extension.id, '/bundled/ublock');
});
