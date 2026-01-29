const test = require('node:test');
const assert = require('node:assert/strict');
const { pickLatestReleases } = require('../src/ublock/github');

const releases = [
  {
    tag_name: '1.69.0',
    prerelease: false,
    assets: [
      {
        name: 'uBlock0_1.69.0.chromium.zip',
        browser_download_url: 'https://example/stable.zip',
      },
    ],
  },
  {
    tag_name: '1.69.1b0',
    prerelease: true,
    assets: [
      {
        name: 'uBlock0_1.69.1b0.chromium.zip',
        browser_download_url: 'https://example/beta.zip',
      },
    ],
  },
];

test('pickLatestReleases selects stable and prerelease assets', () => {
  const result = pickLatestReleases(releases);
  assert.equal(result.latestStable.version, '1.69.0');
  assert.equal(result.latestStable.assetUrl, 'https://example/stable.zip');
  assert.equal(result.latestPrerelease.version, '1.69.1b0');
  assert.equal(result.latestPrerelease.assetUrl, 'https://example/beta.zip');
});
