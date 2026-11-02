// Pratinjau: lembar semua ekspresi dan pose -> preview/grelin-lembar.png (Chromium via Playwright)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, POSES, grelin, grelinSvg } from './grelin.js';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url)); fs.mkdirSync(path.join(dir, 'preview'), { recursive: true });
const cell = (label, svg) => `<figure>${svg}<figcaption>${label}</figcaption></figure>`;
const items = [...Object.keys(EXPRESSIONS).map((e) => cell(e, grelinSvg(grelin(e), { width: 200 }))), ...Object.keys(POSES).filter((p) => p !== 'berdiri').map((p) => cell('pose ' + p, grelinSvg(grelin('netral', p), { width: 200 })))];
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#F7F2E4;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(5,220px);gap:10px;padding:20px}figure{margin:0;background:#fff;border-radius:18px;padding:8px;text-align:center}figcaption{font-weight:700;color:#0A3830;font-size:15px}</style><main>${items.join('')}</main>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.5 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, 'preview', 'grelin-lembar.png'), fullPage: true }); await b.close(); console.log('preview/grelin-lembar.png');
