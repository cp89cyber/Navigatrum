const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function createEventTarget(extra = {}) {
  const handlers = new Map();
  return {
    ...extra,
    addEventListener(type, handler) {
      const list = handlers.get(type) || [];
      list.push(handler);
      handlers.set(type, list);
    },
    dispatch(type, event = {}) {
      const list = handlers.get(type) || [];
      for (const handler of list) {
        handler({ type, ...event });
      }
    },
  };
}

test('renderer syncs webview size to the viewport and notifies main', async (t) => {
  const rendererPath = require.resolve(
    path.join(__dirname, '..', 'src', 'renderer', 'renderer.js')
  );
  delete require.cache[rendererPath];

  const backButton = createEventTarget({ disabled: false });
  const forwardButton = createEventTarget({ disabled: false });
  const reloadButton = createEventTarget({ disabled: false });
  const addressForm = createEventTarget();
  const addressInput = createEventTarget({ value: '' });

  let viewportRect = { width: 1200, height: 745 };
  const viewport = createEventTarget({
    getBoundingClientRect() {
      return { ...viewportRect };
    },
  });

  const webview = createEventTarget({
    style: {},
    canGoBack: () => false,
    canGoForward: () => false,
    loadURL: () => {},
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    isLoading: () => false,
    getWebContentsId: () => 42,
  });

  const documentStub = {
    getElementById(id) {
      const map = {
        back: backButton,
        forward: forwardButton,
        reload: reloadButton,
        'address-form': addressForm,
        'address-input': addressInput,
        webview,
      };
      return map[id] || null;
    },
    querySelector(selector) {
      if (selector === '.viewport') {
        return viewport;
      }
      return null;
    },
  };

  const resizeCalls = [];
  const windowStub = {
    navigatrum: {
      navigate: async (input) => String(input),
      resizeWebview: (payload) => {
        resizeCalls.push(payload);
        return true;
      },
    },
    addEventListener: () => {},
    requestAnimationFrame: (cb) => cb(),
  };

  let resizeObserverCallback = null;
  class ResizeObserverStub {
    constructor(cb) {
      resizeObserverCallback = cb;
    }
    observe() {}
    disconnect() {}
  }

  global.document = documentStub;
  global.window = windowStub;
  global.ResizeObserver = ResizeObserverStub;
  global.requestAnimationFrame = windowStub.requestAnimationFrame;

  t.after(() => {
    delete global.document;
    delete global.window;
    delete global.ResizeObserver;
    delete global.requestAnimationFrame;
  });

  require(rendererPath);

  webview.dispatch('dom-ready');

  assert.equal(webview.style.width, '1200px');
  assert.equal(webview.style.height, '745px');
  assert.deepEqual(resizeCalls[0], {
    webContentsId: 42,
    width: 1200,
    height: 745,
  });

  viewportRect = { width: 1200, height: 900 };
  assert.ok(resizeObserverCallback, 'expected a ResizeObserver to be registered');
  resizeObserverCallback();

  assert.deepEqual(resizeCalls[resizeCalls.length - 1], {
    webContentsId: 42,
    width: 1200,
    height: 900,
  });
});
