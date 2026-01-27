const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeUserUrl } = require('../src/url-utils');

test('adds https:// when user types a bare domain', () => {
  assert.equal(normalizeUserUrl('example.com'), 'https://example.com');
});

test('keeps full URLs intact', () => {
  assert.equal(
    normalizeUserUrl('https://example.com/path'),
    'https://example.com/path'
  );
});

test('converts search-like input into a DuckDuckGo query URL', () => {
  assert.equal(
    normalizeUserUrl('open source browsers'),
    'https://duckduckgo.com/?q=open%20source%20browsers'
  );
});
