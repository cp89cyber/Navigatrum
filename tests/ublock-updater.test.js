const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');

const { extractZip, downloadFile, checkForUpdates } = require('../src/ublock/updater');

const fixture = path.join(__dirname, 'fixtures', 'ublock-fixture.zip');
const target = path.join(__dirname, '.tmp', 'extract');

async function startFixtureServer() {
  const fixtureBuffer = await fs.readFile(fixture);
  const state = { baseUrl: '' };
  const server = http.createServer((req, res) => {
    if (req.url === '/releases') {
      const releases = [
        {
          tag_name: '1.69.0',
          prerelease: false,
          assets: [
            {
              name: 'uBlock0_1.69.0.chromium.zip',
              browser_download_url: `${state.baseUrl}/asset.zip`,
            },
          ],
        },
        {
          tag_name: '1.69.1b0',
          prerelease: true,
          assets: [
            {
              name: 'uBlock0_1.69.1b0.chromium.zip',
              browser_download_url: `${state.baseUrl}/asset.zip`,
            },
          ],
        },
      ];
      const payload = JSON.stringify(releases);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      });
      res.end(payload);
      return;
    }

    if (req.url === '/asset.zip') {
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Length': fixtureBuffer.length,
      });
      res.end(fixtureBuffer);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  state.baseUrl = `http://127.0.0.1:${port}`;

  return { server, baseUrl: state.baseUrl };
}

test('extractZip expands a zip into a target directory', async () => {
  await fs.rm(target, { recursive: true, force: true });
  await extractZip(fixture, target);
  const manifest = await fs.readFile(path.join(target, 'manifest.json'), 'utf8');
  assert.match(manifest, /"name"/);
});

test('downloadFile stores a remote asset', async () => {
  const { server, baseUrl } = await startFixtureServer();
  const downloadTarget = path.join(__dirname, '.tmp', 'download.zip');
  try {
    await fs.rm(downloadTarget, { force: true });
    await downloadFile(`${baseUrl}/asset.zip`, downloadTarget);
    const stats = await fs.stat(downloadTarget);
    assert.ok(stats.size > 0);
  } finally {
    server.close();
  }
});

test('checkForUpdates reads release data from endpoint', async () => {
  const { server, baseUrl } = await startFixtureServer();
  try {
    const result = await checkForUpdates({ releasesUrl: `${baseUrl}/releases` });
    assert.equal(result.latestStable.version, '1.69.0');
    assert.equal(result.latestPrerelease.version, '1.69.1b0');
  } finally {
    server.close();
  }
});
