// Menjaga aset Raka tetap konsisten:  node --test brand/characters/raka
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, NEUTRAL, PATCH, POSES, armShape, demoState, DEMO_LENGTH, lerpState, raka, rakaSvg } from './raka.js';

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

test('patch logo: ada di setiap ekspresi dan pose, di dalam grup badan, ukurannya tetap', () => {
  const sizes = new Set();
  for (const e of Object.keys(EXPRESSIONS)) for (const p of Object.keys(POSES)) {
    const svg = rakaSvg(raka(e, p), { uid: `${e}-${p}` });
    const body = svg.slice(svg.indexOf('class="raka-body"'));
    assert.ok(body.includes('class="raka-patch"'), `patch ada di ${e}/${p}`);
    assert.ok(body.indexOf('class="raka-patch"') < body.indexOf('class="raka-head"'), 'patch di bawah kepala');
    sizes.add(svg.match(/<rect x="[\d.]+" y="[\d.]+" width="(\d+)" height="(\d+)" rx="17"/).slice(1).join('x'));
    sizes.add(svg.match(/scale\(([\d.]+)\) translate\(-128 -128\)/)[1]);
  }
  assert.equal(sizes.size, 2, `ukuran patch dan simbol harus sama di semua pose: ${[...sizes]}`);
});

test('patch logo: ikut badan saat condong dan bernapas, dan tidak berubah ukuran', () => {
  const a = rakaSvg(raka('netral', null, { breath: 0 })), b = rakaSvg(raka('netral', null, { breath: 1, lean: 3 }));
  const cy = (svg) => Number(svg.match(/class="raka-patch"><rect x="[\d.]+" y="([\d.]+)"/)[1]);
  assert.ok(cy(b) < cy(a), 'patch naik sedikit saat dada mengembang');
  assert.ok(b.includes('rotate(3 200 580)') && b.indexOf('rotate(3 200 580)') < b.indexOf('class="raka-patch"'), 'patch berada di dalam grup yang ikut condong');
  assert.equal(a.match(/rx="17"/g).length, b.match(/rx="17"/g).length);
});

test('patch logo: saat gambar dicerminkan, simbol dibalik lagi supaya tidak terbaca terbalik', () => {
  const flipped = rakaSvg(raka('menunjuk', null, { flip: 1 }));
  assert.match(flipped, /class="raka-patch" transform="translate\([\d.]+ 0\) scale\(-1 1\) translate\(-[\d.]+ 0\)"/);
  assert.doesNotMatch(rakaSvg(raka('menunjuk')), /class="raka-patch" transform/);
});

test('patch logo: bisa dimatikan atau dipindah ke sisi lain', () => {
  assert.doesNotMatch(rakaSvg(raka('netral'), { logo: false }), /raka-patch/);
  const r = rakaSvg(raka('netral')), l = rakaSvg(raka('netral'), { logo: 'kanan' });
  const x = (svg) => Number(svg.match(/class="raka-patch"><rect x="([\d.]+)"/)[1]);
  assert.ok(x(r) > 200 && x(l) < 200);
});

test('patch logo tidak tertutup tangan di pose mana pun', () => {
  const half = PATCH.size / 2;
  const hits = (x, y, r) => Math.hypot(Math.max(Math.abs(x - PATCH.x) - half, 0), Math.max(Math.abs(y - PATCH.y) - half, 0)) < r;
  for (const p of Object.keys(POSES)) {
    const s = raka(p === 'sapa' ? 'senang' : p, p);
    for (const [side, arm] of [['L', s.armL], ['R', s.armR]]) {
      const g = armShape(side, arm);
      assert.ok(!hits(g.hand[0], g.hand[1], g.handR), `tangan ${side} menutup patch di pose ${p}`);
      g.dots.slice(1).forEach((d, i) => assert.ok(!hits(d[0], d[1], d[2]), `lengan ${side} menutup patch di pose ${p} (titik ${i + 1})`));
    }
  }
});
