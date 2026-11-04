// Pratinjau melongo/mengerti/pegang_buku/dosen: node brand/characters/raka/render-paham.mjs -> preview/raka-paham.png
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { raka, rakaSvg, PALETTE_DOSEN } from './raka.js';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const dir = path.dirname(fileURLToPath(import.meta.url));
const items = [['melongo + pegang_buku (kuliah)', raka('melongo', 'pegang_buku', { gazeY: 0.5, sweat: 0.6 }), { outfit: 'kuliah' }], ['melongo (santai)', raka('melongo', 'netral', { bags: 0.2 }), { outfit: 'santai' }], ['mengerti (santai)', raka('mengerti', 'netral'), { outfit: 'santai' }], ['dosen (palet dosen)', raka('netral', 'menunjuk'), { palette: PALETTE_DOSEN }]];
const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;background:#F7F2E4;font-family:sans-serif}main{display:grid;grid-template-columns:repeat(4,300px);gap:12px;padding:20px}figure{margin:0;background:#fff;border-radius:18px;padding:8px;text-align:center}figcaption{font-weight:700;color:#0A3830;font-size:16px}</style><main>${items.map(([l, s, o]) => `<figure>${rakaSvg(s, { ...o, width: 280, uid: 'p' + l.length })}<figcaption>${l}</figcaption></figure>`).join('')}</main>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1300, height: 700 }, deviceScaleFactor: 1.2 });
await p.setContent(html); await p.screenshot({ path: path.join(dir, 'preview', 'raka-paham.png'), fullPage: true }); await b.close(); console.log('preview/raka-paham.png');
