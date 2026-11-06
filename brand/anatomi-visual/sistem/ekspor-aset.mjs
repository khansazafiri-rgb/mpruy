// Mengekspor aset yang dapat dipakai ulang: (1) parameter animasi dan token sebagai JSON, (2) tiap layer organ sebagai SVG mandiri.
// Pemakaian: node ekspor-aset.mjs   -> aset/parameter-animasi.json dan aset/layer/<organ>/<layer>.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as T from './tokens.mjs';
import { latar } from './latar.mjs';
import * as jantung from './scenes/jantung.mjs';
import * as gigi from './scenes/gigi.mjs';
import * as kulit from './scenes/kulit.mjs';
import { gigi as gigiAset } from './darwin/gigi.mjs';
import { kulit as kulitAset } from './darwin/kulit.mjs';
import { defs as dfs, TEMA_MEDCOEL } from './darwin/anatomi.mjs';
import { buildSvg } from '../v6/heart7.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'aset');
const svg = (w, h, vb, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>\n`;
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

// 1) parameter
const param = {
  versi: 1,
  keterangan: 'Token dan parameter animasi Atlas MEDCOEL. Satuan waktu detik; koordinat desain per organ (jantung: piksel acuan 572x900 mulai y=200; gigi 600x900; kulit 700x960).',
  token: { kanvas: T.KANVAS, merek: T.MEREK, latar: T.LATAR, cahaya: T.CAHAYA, tempo: T.TEMPO, tata: T.TATA },
  easing: { kamera: 'inOut: t<.5 ? 4t^3 : 1-(-2t+2)^3/2', reveal: 'out: 1-(1-t)^3' },
  jantung: { meta: jantung.meta, ...jantung.PARAM },
  gigi: { meta: gigi.meta, ...gigi.PARAM },
  kulit: { meta: kulit.meta, ...kulit.PARAM },
};
delete param.gigi.meta.__x; write(path.join(out, 'parameter-animasi.json'), JSON.stringify(param, null, 1) + '\n');

// 2) layer latar (sama bentuk untuk semua organ; warna dari LATAR[organ])
for (const organ of Object.keys(T.LATAR)) {
  const s = latar(organ, 0);
  const defs = s.match(/<defs>[\s\S]*?<\/defs>/)[0];
  for (const m of s.matchAll(/<g id="(L\d)"[\s\S]*?<\/g>/g)) write(path.join(out, 'layer', 'latar', `${organ}-${m[1]}.svg`), svg(1080, 1920, '0 0 1080 1920', defs + m[0]));
}
// 3) layer organ
const h = buildSvg({ layers: true, bg: false, anim: { flow: 0.5 }, id: 'jt' });
const vh = `${h.view.x} ${h.view.y} ${h.view.w} ${h.view.h}`;
for (const k of ['back', 'body', 'trunk', 'hi']) write(path.join(out, 'layer', 'jantung', `${k}.svg`), svg(h.view.w * 2, h.view.h * 2, vh, `<defs>${h.defs}</defs>${h[k]}`));
// gigi dan kulit: aset adaptasi dari cabang claude/eloquent-darwin-ewtwtu (darwin/*.mjs), mode bare
const G = gigiAset({ bare: true });
for (const [id, inner] of Object.entries(G.LAY)) write(path.join(out, 'layer', 'gigi', `${id}.svg`), svg(1080, 1920, '0 0 1080 1920', `${dfs('g', TEMA_MEDCOEL)}${G.defs}<rect width="1080" height="1920" fill="none"/>${inner}`));
const K = kulitAset({ bare: true });
write(path.join(out, 'layer', 'kulit', 'k-adegan.svg'), svg(1080, 1920, '0 0 1080 1920', `${dfs('k', TEMA_MEDCOEL)}${K.defs}${K.sc}`));
console.log('ok aset ->', out);
