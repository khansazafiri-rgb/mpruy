// Pratinjau: lembar ekspresi, pose, dan peneliti -> preview/tala-lembar.png (Chromium via Playwright)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { T_EXPR, T_POSE, PENELITI, teman, temanSvg } from './teman.js';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url)); fs.mkdirSync(path.join(dir, 'preview'), { recursive: true });
const cell = (label, svg) => `<figure>${svg}<figcaption>${label}</figcaption></figure>`;
const items = [
  ...Object.keys(T_EXPR).map((e) => cell(e, temanSvg(teman(e, 'berdiri'), { uid: 'e' + e }).replace('<svg ', '<svg width="170" '))),
  ...Object.keys(T_POSE).filter((p) => !['berdiri'].includes(p)).map((p) => cell('pose ' + p, temanSvg(teman('santai', p), { uid: 'p' + p }).replace('<svg ', '<svg width="170" '))),
  ...['berdiri', 'tunjuk', 'catat'].map((p) => cell('peneliti ' + p, temanSvg(teman('fokus', p), { outfit: 'jas', glasses: true, palette: PENELITI, uid: 'r' + p }).replace('<svg ', '<svg width="170" '))),
];
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#F7F2E4;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(6,190px);gap:10px;padding:20px}figure{margin:0;background:#fff;border-radius:18px;padding:8px;text-align:center}figcaption{font-weight:700;color:#0A3830;font-size:15px}</style><main>${items.join('')}</main>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.4 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, 'preview', 'tala-lembar.png'), fullPage: true }); await b.close(); console.log('preview/tala-lembar.png');
