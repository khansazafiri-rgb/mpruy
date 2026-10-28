// Menjaga aset Raka tetap konsisten:  node --test brand/characters/raka
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, NEUTRAL, POSES, demoState, DEMO_LENGTH, lerpState, raka, rakaSvg } from './raka.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('semua kombinasi ekspresi dan pose menghasilkan SVG sah tanpa NaN', () => {
  for (const e of Object.keys(EXPRESSIONS)) for (const p of Object.keys(POSES)) {
    const svg = rakaSvg(raka(e, p), { uid: `${e}-${p}` });
    assert.match(svg, /^<svg [^>]*viewBox="0 0 400 800"/);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${e}/${p}`);
    assert.equal(svg.split('<g').length - 1, svg.split('</g>').length - 1, `grup seimbang ${e}/${p}`);
  }
});

test('wajah dan proporsi tidak berubah antarvarian (kepala, kaki, sepatu identik)', () => {
  const shapes = ['M200 92C270 92 308 138 308 204', 'M130 566L194 566', 'M88 778C82 750 112 734 152 736'];
  for (const e of Object.keys(EXPRESSIONS)) {
    const svg = rakaSvg(raka(e));
    for (const s of shapes) assert.ok(svg.includes(s), `${e} memuat ${s}`);
  }
});

test('lerpState: ujung-ujungnya sama dengan keadaan asal', () => {
  const a = raka('kaget'), b = raka('menunjuk');
  assert.deepEqual(lerpState(a, b, 0), a);
  assert.deepEqual(lerpState(a, b, 1), b);
  const mid = lerpState(a, b, 0.5);
  assert.ok(mid.armR.wx > a.armR.wx && mid.armR.wx < b.armR.wx);
});

test('urutan contoh: seluruh durasi menghasilkan gambar tanpa NaN, dan kembali netral di akhir', () => {
  for (let t = 0; t < DEMO_LENGTH; t += 0.1) assert.doesNotMatch(rakaSvg(demoState(t)), /NaN|undefined/, `t=${t}`);
  const end = demoState(DEMO_LENGTH - 0.01);
  assert.ok(Math.abs(end.armL.wy - NEUTRAL.armL.wy) < 1 && end.happyEyes < 0.01);
});

test('berkas svg/ sama dengan keluaran raka.js (jalankan build.mjs bila gagal)', () => {
  for (const name of Object.keys(EXPRESSIONS)) {
    const file = path.join(here, 'svg', `raka-${name}.svg`);
    assert.equal(fs.readFileSync(file, 'utf8'), `${rakaSvg(raka(name), { uid: `raka-${name}` })}\n`, `${name} usang`);
  }
});

test('raka() menolak ekspresi atau pose yang tidak dikenal', () => {
  assert.throws(() => raka('marah'), /Ekspresi tidak dikenal/);
  assert.throws(() => raka('netral', 'terbang'), /Pose tidak dikenal/);
});
