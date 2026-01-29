import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import extract from 'extract-zip';

const require = createRequire(import.meta.url);
const { downloadFile } = require('../src/ublock/updater');

const version = process.argv[2] || '1.69.0';
const filename = `uBlock0_${version}.chromium.zip`;
const url = `https://github.com/gorhill/uBlock/releases/download/${version}/${filename}`;
const root = path.dirname(fileURLToPath(import.meta.url));
const bundledRoot = path.join(root, '..', 'src', 'ublock', 'bundled');
const target = path.join(bundledRoot, version);
const zipPath = path.join(bundledRoot, `${version}.zip`);

await fs.mkdir(bundledRoot, { recursive: true });

await downloadFile(url, zipPath);

await fs.rm(target, { recursive: true, force: true });
await extract(zipPath, { dir: target });
await fs.unlink(zipPath);

console.log(`Fetched uBlock ${version} into ${target}`);
