// Membuat SVG dan PNG dari kode. Pemakaian: node render.mjs [folder-keluaran]
// Menghasilkan: heart.svg, tooth.svg (1080 x 1920), perbandingan-layar-hp.png (dua gambar berdampingan), dan kalibrasi-skala-hp.png (kecil, seperti di ponsel).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { CANVAS, defs, background, PALETTE } from './style.mjs';
import { heartSvg, HEART_BOX } from './heart.mjs';
import { toothSvg, TOOTH_BOX } from './tooth.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(here, 'out');
fs.mkdirSync(OUT, { recursive: true });

// tata letak: organ diperbesar agar mengisi area tengah yang aman (di luar zona atas 240 px, bawah 380 px)
function place(box, scale) {
  const tx = CANVAS.w / 2 - box.cx * scale, ty = CANVAS.h / 2 - box.cy * scale;
  return `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${scale})`;
}

function page(uid, inner, title, sub) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}" viewBox="0 0 ${CANVAS.w} ${CANVAS.h}">`
    + defs(uid) + background(uid, { seed: uid === 'h' ? 11 : 29 })
    + inner
    + `<text x="540" y="200" text-anchor="middle" font-family="Plus Jakarta Sans, Inter, sans-serif" font-weight="800" font-size="56" fill="${PALETTE.ink}" opacity="0.92">${title}</text>`
    + `<text x="540" y="1790" text-anchor="middle" font-family="Plus Jakarta Sans, Inter, sans-serif" font-weight="700" font-size="34" fill="${PALETTE.ink}" opacity="0.55">${sub}</text>`
    + `</svg>`;
}

const heart = page('h', `<g transform="${place(HEART_BOX, 1.34)}">${heartSvg('h')}</g>`, 'JANTUNG · tampak depan', 'Konsep visual dari kode · belum diverifikasi terhadap atlas');
const tooth = page('t', `<g transform="${place(TOOTH_BOX, 1.18)}">${toothSvg('t')}</g>`, 'GIGI · potongan memanjang', 'Konsep visual dari kode · belum diverifikasi terhadap atlas');
fs.writeFileSync(path.join(OUT, 'heart.svg'), heart);
fs.writeFileSync(path.join(OUT, 'tooth.svg'), tooth);

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: CANVAS.w, height: CANVAS.h }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.log('pageerror', e.message));
const shot = async (svgs, file, { w, h, scale = 1 } = {}) => {
  const html = `<!doctype html><html><body style="margin:0;background:#000">${svgs}</body></html>`;
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(html);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } });
};
await shot(heart, 'heart.png', { w: CANVAS.w, h: CANVAS.h });
await shot(tooth, 'tooth.png', { w: CANVAS.w, h: CANVAS.h });
// perbandingan: dua gambar berdampingan (acuan belum tersedia, jadi hanya hasil render)
const side = (svg, x) => `<div style="position:absolute;left:${x}px;top:0;width:${CANVAS.w}px;height:${CANVAS.h}px">${svg}</div>`;
await shot(side(heart, 0) + side(tooth, CANVAS.w), 'perbandingan-layar-hp.png', { w: CANVAS.w * 2, h: CANVAS.h });
// ukuran kecil seperti di ponsel (1/3 skala) untuk memeriksa keterbacaan
const small = (svg, x) => `<div style="position:absolute;left:${x}px;top:0;width:360px;height:640px;transform-origin:0 0;transform:scale(0.3333);overflow:hidden">${svg}</div>`;
await shot(small(heart, 0) + small(tooth, 380), 'kalibrasi-skala-hp.png', { w: 760, h: 640 });
await b.close();
console.log('ok', OUT);
