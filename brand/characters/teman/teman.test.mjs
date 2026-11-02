// Tes Tala (teman Raka): semua kombinasi tergambar, kaki menyatu dengan badan dan menapak, jalan menjaga kaki tersambung, svg/ sama dengan kode.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T_EXPR, T_POSE, PENELITI, teman, temanSvg, walkCycle } from './teman.js';
import { legShape } from '../raka/raka.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const balanced = (svg) => (svg.match(/<g[ >]/g) || []).length === (svg.match(/<\/g>/g) || []).length;
const STANDING = Object.keys(T_POSE).filter((p) => T_POSE[p].legs);

test('tala: semua ekspresi x pose tergambar (tanpa NaN, grup seimbang)', () => {
  for (const e of Object.keys(T_EXPR)) for (const p of Object.keys(T_POSE)) {
    const svg = temanSvg(teman(e, p));
    assert.match(svg, /^<svg /); assert.ok(balanced(svg), `${e}/${p}`); assert.ok(!/NaN|undefined/.test(svg), `${e}/${p} ada NaN`);
  }
  const r = temanSvg(teman('fokus', 'catat'), { outfit: 'jas', glasses: true, palette: PENELITI });
  assert.ok(r.includes(PENELITI.skin) && r.includes('F6FAF9') && r.includes('<circle') && !r.includes('8B7BE0'));
});
test('tala: palet peneliti tidak bocor ke render berikutnya', () => {
  const a = temanSvg(teman('santai', 'berdiri')); temanSvg(teman('fokus', 'catat'), { outfit: 'jas', glasses: true, palette: PENELITI });
  assert.equal(temanSvg(teman('santai', 'berdiri')), a);
});
test('tala: kaki menyatu dengan pinggul dan menapak lantai', () => {
  for (const p of STANDING) for (const e of ['santai', 'semangat']) {
    const s = teman(e, p);
    for (const side of ['L', 'R']) {
      const l = legShape(side, s);
      assert.ok(l.dots[0][0] > 104 && l.dots[0][0] < 296 && Math.abs(l.dots[0][1] - 566) < 12, `${p} pangkal kaki ${side} di luar pinggul`);
      for (let i = 1; i < l.dots.length; i++) assert.ok(Math.hypot(l.dots[i][0] - l.dots[i - 1][0], l.dots[i][1] - l.dots[i - 1][1]) < l.dots[i - 1][2], `${p} kaki ${side} terputus`);
      assert.ok(l.ankle[1] > 700 && l.ankle[1] <= 778, `${p} kaki ${side} tidak menapak`);
    }
  }
});
test('tala: siklus jalan Raka menjaga kaki tetap tersambung', () => {
  for (let i = 0; i < 24; i++) {
    const s = teman('semangat', 'berdiri', walkCycle(i / 24, { dir: 1 }));
    for (const side of ['L', 'R']) {
      const l = legShape(side, s);
      for (let k = 1; k < l.dots.length; k++) assert.ok(Math.hypot(l.dots[k][0] - l.dots[k - 1][0], l.dots[k][1] - l.dots[k - 1][1]) < l.dots[k - 1][2], 'kaki terputus');
      assert.ok(l.ankle[1] <= 778 && Math.abs(l.ankle[0] - l.dots[0][0]) < 80);
    }
    assert.ok(!/NaN/.test(temanSvg(s)));
  }
});
test('tala: lengan satu bentuk menempel pada bahu', () => {
  for (const p of STANDING) { const s = teman('santai', p); for (const a of [s.armL, s.armR]) assert.ok(Math.hypot(a.wx - a.ex, a.wy - a.ey) < 160, `${p} lengan terlalu panjang`); }
});
test('tala: svg/ sama dengan keluaran kode', () => {
  assert.equal(fs.readFileSync(path.join(here, 'svg', 'tala-semangat.svg'), 'utf8').trim(), temanSvg(teman('semangat', 'berdiri')).trim());
  assert.equal(fs.readFileSync(path.join(here, 'svg', 'peneliti-catat.svg'), 'utf8').trim(), temanSvg(teman('fokus', 'catat'), { outfit: 'jas', glasses: true, palette: PENELITI }).trim());
});
