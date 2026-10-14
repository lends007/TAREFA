// Abre sprites.html no Chromium (Playwright) e grava os PNGs em ../assets/.
// Uso: node tools/render-sprites.mjs
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'assets', 'sprites');
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith('.png')) rmSync(join(outDir, f));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(join(here, 'sprites.html')).href);
await page.waitForFunction(() => window.__sprites);
const sprites = await page.evaluate(() => window.__sprites);
await browser.close();

for (const [name, url] of Object.entries(sprites))
  writeFileSync(join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
console.log(Object.keys(sprites).length + ' imagens em ' + outDir);
