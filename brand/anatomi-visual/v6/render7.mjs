// Merender jantung v6 ke PNG lewat Chromium. Pemakaian: node render6.mjs [mode=final|flat|sil] keluaran.png [--scale=2]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildSvg } from './heart7.mjs';
const args = process.argv.slice(2);
const mode = ['final', 'flat', 'sil'].includes(args[0]) ? args[0] : 'final';
const out = args.find((a, i) => i > 0 && !a.startsWith('--')) || `/tmp/h7_${mode}.png`;
const scale = parseFloat((args.find((a) => a.startsWith('--scale=')) || '--scale=2').split('=')[1]);
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const svg = buildSvg({ mode }).replace(/width="\d+" height="\d+"/, `width="${572 * scale}" height="${900 * scale}"`);
fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Math.round(572 * scale), height: Math.round(900 * scale) } });
await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
await p.screenshot({ path: out });
await b.close();
console.log('ok', out);
