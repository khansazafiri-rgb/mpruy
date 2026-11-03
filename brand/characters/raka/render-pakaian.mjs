// Pratinjau pakaian kuliah dan santai: node brand/characters/raka/render-pakaian.mjs -> preview/raka-kuliah-santai.png
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { raka, rakaSvg, walkCycle } from './raka.js';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url));
const L = { legs: { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } } };
const items = [
  ['kuliah: netral', raka('netral', 'jalan', L), { outfit: 'kuliah' }], ['kuliah: lapar', raka('lapar', 'pegang_perut', L), { outfit: 'kuliah' }], ['kuliah: kaget', raka('kaget', 'jalan', L), { outfit: 'kuliah' }],
  ['kuliah: jalan', raka('netral', 'jalan', walkCycle(0.12)), { outfit: 'kuliah' }], ['kuliah: jalan (dari samping)', raka('senang', 'jalan', { ...walkCycle(0.62), yaw: 0.45 }), { outfit: 'kuliah' }],
  ['santai: netral', raka('netral', 'jalan', L), { outfit: 'santai' }], ['santai: lapar', raka('lapar', 'pegang_perut', L), { outfit: 'santai' }], ['santai: ngantuk', raka('ngantuk', 'jalan', { ...L, bags: 0.6 }), { outfit: 'santai' }],
  ['santai: jalan', raka('lega', 'jalan', walkCycle(0.12)), { outfit: 'santai' }], ['kuliah, tanpa ransel (opsi)', raka('senang', 'jalan', L), { outfit: 'kuliah', ransel: false }],
];
const cell = ([label, st, o], i) => `<figure>${rakaSvg(st, { ...o, uid: 'pk' + i, width: 230 })}<figcaption>${label}</figcaption></figure>`;
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#F7F2E4;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(5,250px);gap:10px;padding:16px}figure{margin:0;background:#fff;border-radius:18px;padding:8px;text-align:center}figcaption{font-weight:700;color:#0A3830;font-size:14px}</style><main>${items.map(cell).join('')}</main>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1340, height: 900 }, deviceScaleFactor: 1.2 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, 'preview', 'raka-kuliah-santai.png'), fullPage: true }); await b.close(); console.log('preview/raka-kuliah-santai.png');
