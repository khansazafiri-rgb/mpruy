// Pratinjau varian lapar/ngantuk: node brand/characters/raka/render-lapar.mjs -> preview/raka-lapar.png
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { raka, rakaSvg } from './raka.js';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url));
const items = [['lapar + pegang_perut', raka('lapar', 'pegang_perut', { bags: 0.3 }), { outfit: 'harian' }], ['lapar + bingung (alis)', raka('lapar', 'netral', { browL: { y: -9, rot: 14 }, browR: { y: -3, rot: -6 } }), { outfit: 'harian' }], ['ngantuk', raka('ngantuk', 'netral', { bags: 0.6 }), { outfit: 'harian' }], ['ngantuk + jalan', raka('ngantuk', 'jalan', { bags: 0.6, legs: { on: 1, dir: 1, L: { dx: 18, lift: 0, kx: 0 }, R: { dx: -18, lift: 10, kx: 0 } } }), { outfit: 'harian' }]];
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#F7F2E4;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(4,300px);gap:12px;padding:20px}figure{margin:0;background:#fff;border-radius:18px;padding:8px;text-align:center}figcaption{font-weight:700;color:#0A3830;font-size:16px}</style><main>${items.map(([l, s, o]) => `<figure>${rakaSvg(s, { ...o, width: 280, uid: 'p' + l.length })}<figcaption>${l}</figcaption></figure>`).join('')}</main>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 700 }, deviceScaleFactor: 1.2 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, 'preview', 'raka-lapar.png'), fullPage: true }); await b.close(); console.log('preview/raka-lapar.png');
