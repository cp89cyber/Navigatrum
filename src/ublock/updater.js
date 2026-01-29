const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const extract = require('extract-zip');

const { pickLatestReleases } = require('./github');

const DEFAULT_RELEASES_URL =
  'https://api.github.com/repos/gorhill/uBlock/releases?per_page=10';

function getClient(url) {
  const protocol = new URL(url).protocol;
  return protocol === 'http:' ? http : https;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = getClient(url);
    const request = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Navigatrum',
        },
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Request failed: ${res.statusCode}`));
          res.resume();
          return;
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(error);
          }
        });
      },
    );

    request.on('error', reject);
  });
}

async function extractZip(zipPath, targetDir) {
  await fsp.mkdir(targetDir, { recursive: true });
  await extract(zipPath, { dir: targetDir });
}

async function downloadFile(url, targetPath, onProgress) {
  await fsp.mkdir(path.dirname(targetPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    const client = getClient(url);

    const request = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Navigatrum',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed: ${res.statusCode}`));
          res.resume();
          return;
        }

        const total = Number(res.headers['content-length'] || 0);
        let received = 0;

        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress && total) {
            onProgress(received / total);
          }
        });

        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      },
    );

    request.on('error', (error) => {
      file.close(() => reject(error));
    });
  });
}

async function checkForUpdates(options = {}) {
  const releasesUrl = options.releasesUrl || DEFAULT_RELEASES_URL;
  const releases = await fetchJson(releasesUrl);
  return pickLatestReleases(releases);
}

module.exports = {
  checkForUpdates,
  downloadFile,
  extractZip,
};
