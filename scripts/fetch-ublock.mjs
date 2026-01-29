import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';
import extract from 'extract-zip';

const version = process.argv[2] || '1.69.0';
const filename = `uBlock0_${version}.chromium.zip`;
const url = `https://github.com/gorhill/uBlock/releases/download/${version}/${filename}`;
const root = path.dirname(fileURLToPath(import.meta.url));
const bundledRoot = path.join(root, '..', 'src', 'ublock', 'bundled');
const target = path.join(bundledRoot, version);
const zipPath = path.join(bundledRoot, `${version}.zip`);

await fs.mkdir(bundledRoot, { recursive: true });

await new Promise((resolve, reject) => {
  const file = createWriteStream(zipPath);
  https
    .get(url, { headers: { 'User-Agent': 'Navigatrum' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed: ${res.statusCode}`));
        res.resume();
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    })
    .on('error', reject);
});

await fs.rm(target, { recursive: true, force: true });
await extract(zipPath, { dir: target });
await fs.unlink(zipPath);

console.log(`Fetched uBlock ${version} into ${target}`);
