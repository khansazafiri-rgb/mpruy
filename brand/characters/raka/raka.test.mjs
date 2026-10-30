// Menjaga aset Raka tetap konsisten:  node --test brand/characters/raka
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, LYING, NEUTRAL, OUTFITS, PATCH, POSES, armShape, demoState, DEMO_LENGTH, legShape, lerpState, raka, rakaSvg, walkCycle } from './raka.js';

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
    const s = raka(p === 'sapa' ? 'senang' : EXPRESSIONS[p] ? p : 'netral', p);
    for (const [side, arm] of [['L', s.armL], ['R', s.armR]]) {
      const g = armShape(side, arm);
      assert.ok(!hits(g.hand[0], g.hand[1], g.handR), `tangan ${side} menutup patch di pose ${p}`);
      g.dots.slice(1).forEach((d, i) => assert.ok(!hits(d[0], d[1], d[2]), `lengan ${side} menutup patch di pose ${p} (titik ${i + 1})`));
    }
  }
});

// ---------------------------------------------------------------- pakaian, kaki, dan ekspresi tambahan

test('tanpa opsi baru, gambar lama tidak berubah: kaki kanonik tetap dipakai dan tidak ada kaki berengsel', () => {
  const svg = rakaSvg(raka('netral'));
  assert.ok(svg.includes('M130 566L194 566') && !svg.includes('raka-legs'));
  assert.equal(raka('netral').legs.on, 0);
  assert.deepEqual(Object.keys(OUTFITS), ['harian', 'demo', 'jas']);
  assert.equal(rakaSvg(raka('netral'), { uid: 'x' }), rakaSvg(raka('netral'), { uid: 'x', outfit: 'harian' }));
});

test('varian pakaian: warna badan berganti, wajah/rambut/patch tetap, pakaian tak dikenal ditolak', () => {
  const harian = rakaSvg(raka('netral')), demo = rakaSvg(raka('netral'), { outfit: 'demo' }), jas = rakaSvg(raka('netral'), { outfit: 'jas' });
  assert.ok(harian.includes('#1D7B75') && !demo.includes('fill="#1D7B75"/>') || demo.includes('#1F2429'));
  assert.ok(demo.includes('#1F2429') && demo.includes('#2E3744'), 'baju hitam dan celana abu tua');
  for (const svg of [demo, jas]) {
    assert.ok(svg.includes('M200 92C270 92 308 138 308 204') && svg.includes('class="raka-patch"'), 'kepala dan patch tetap');
    assert.doesNotMatch(svg, /NaN|undefined/);
  }
  assert.ok(jas.includes('#2B3A44') && jas.includes('stroke="#C9D5D9"'), 'jas dokter: stetoskop dan kantong');
  assert.throws(() => rakaSvg(raka('netral'), { outfit: 'astronot' }), /Pakaian tidak dikenal/);
});

test('kaki berengsel: pinggul menempel di badan, kurva menyambung, sepatu menempel di pergelangan, di setiap fase jalan dan lari', () => {
  for (const run of [false, true]) for (let ph = 0; ph < 1; ph += 0.05) {
    for (const extra of [{}, { mode: 'depan' }, { dir: -1 }]) {
      const s = raka('netral', 'jalan', walkCycle(ph, { run, ...extra }));
      for (const side of ['L', 'R']) {
        const g = legShape(side, s);
        const [hx, hy, hr] = g.dots[0];
        assert.ok(hy >= 540 + s.bob && hy <= 600 + s.bob && hr >= 34, `pinggul ${side} di dalam bawah badan (fase ${ph.toFixed(2)})`);
        g.dots.slice(1).forEach((d, i) => assert.ok(Math.hypot(d[0] - g.dots[i][0], d[1] - g.dots[i][1]) < d[2] * 0.5, `lingkaran celana saling tumpang tindih (${side}, titik ${i + 1})`));
        const last = g.dots[g.dots.length - 1];
        assert.ok(Math.hypot(last[0] - g.ankle[0], last[1] - g.ankle[1]) < 0.01, 'celana berujung di pergelangan, tempat sepatu menempel');
        assert.ok(g.ankle[1] + 26 <= 778 + 0.01, 'sepatu tidak menembus lantai');
        assert.ok(g.ankle[1] <= 752, 'pergelangan tidak melayang di bawah lantai');
        for (const [x, y, r] of g.dots) assert.ok(Number.isFinite(x + y + r));
      }
    }
  }
});

test('jongkok dan berhenti: kaki tetap tersambung dan menapak, badan turun bersama pinggul', () => {
  for (const pose of ['jongkok', 'berhenti']) {
    const s = raka('khawatir', pose);
    for (const side of ['L', 'R']) {
      const g = legShape(side, s);
      assert.ok(g.dots[0][1] >= 566 + s.bob - 1 && g.dots[0][1] <= 600 + s.bob, `${pose}: pinggul ikut badan`);
      assert.ok(g.ankle[1] + 26 <= 778 + 0.01);
    }
    const svg = rakaSvg(s, { outfit: 'demo' });
    assert.ok(svg.includes('class="raka-legs"') && !/NaN|undefined/.test(svg));
  }
  assert.ok(raka('netral', 'jongkok').bob > 100);
});

test('walkCycle: dua kaki berlawanan fase, lengan berayun berlawanan, hasil selalu bisa digambar', () => {
  const a = walkCycle(0.1), b = walkCycle(0.6);
  assert.ok(Math.abs(a.legs.L.dx + a.legs.R.dx) < 1e-9, 'kaki kiri dan kanan berlawanan');
  assert.ok(Math.abs(a.legs.L.dx - b.legs.L.dx) > 5, 'langkah berubah menurut fase');
  assert.ok(Math.sign(a.armL.wx - 86) !== Math.sign(a.legs.L.dx) || Math.abs(a.legs.L.dx) < 1, 'lengan kiri berlawanan dengan kaki kiri');
  for (let ph = 0; ph < 1; ph += 0.05) assert.doesNotMatch(rakaSvg(raka('kaget', 'jalan', walkCycle(ph)), { outfit: 'demo' }), /NaN|undefined/);
});

test('ekspresi baru (perih, batuk, khawatir, lega): ada, jelas berbeda, dan efeknya muncul', () => {
  for (const e of ['perih', 'batuk', 'khawatir', 'lega']) assert.ok(EXPRESSIONS[e], e);
  assert.ok(rakaSvg(raka('perih')).includes('#BFE6F5'), 'air mata');
  assert.ok(rakaSvg(raka('batuk')).includes('#B7C6CC'), 'efek batuk');
  assert.doesNotMatch(rakaSvg(raka('netral')), /#BFE6F5|#B7C6CC/, 'ekspresi lama tidak membawa efek baru');
  assert.ok(raka('batuk').armR.wx < 260, 'kepalan batuk di depan mulut');
});

test('berkas svg/ varian pakaian sama dengan keluaran raka.js', () => {
  const file = path.join(here, 'svg', 'raka-demo-jalan-a.svg');
  assert.equal(fs.readFileSync(file, 'utf8'), `${rakaSvg(raka('netral', 'jalan', walkCycle(0.12)), { uid: 'raka-demo-jalan-a', outfit: 'demo' })}\n`);
});

test('berbaring (rebah): SVG sah, memuat kaki, badan, dan kepala; semua bagian di dalam kanvas dan tersambung', () => {
  for (const e of Object.keys(EXPRESSIONS)) for (const flip of [0, 1]) {
    const svg = rakaSvg(raka(e, 'berbaring', { flip, blood: 0.8 }), { rebah: true, uid: `b-${e}-${flip}` });
    assert.match(svg, new RegExp(`viewBox="0 0 ${LYING.w} ${LYING.h}"`));
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${e}`);
    assert.equal(svg.split('<g').length - 1, svg.split('</g>').length - 1, `grup seimbang ${e}`);
    for (const k of ['raka-rebah', 'raka-head-rebah', 'raka-legs', 'raka-patch']) if (k !== 'raka-legs') assert.ok(svg.includes(k), `${e} memuat ${k}`);
  }
  // geometri: ujung sepatu (y = 778 + sepatu 44) setelah diputar -90 derajat harus di dalam kanvas, kepala menumpuk pada pangkal leher/bahu
  const footX = LYING.bx + (778 + 44 - 380);
  assert.ok(footX < LYING.w, `sepatu di dalam kanvas (${footX} < ${LYING.w})`);
  const neckBaseX = LYING.bx + (372 - 380);              // pangkal leher setelah diputar
  assert.ok(LYING.hx + 130 >= neckBaseX + 10, 'kepala menutupi pangkal leher (tersambung ke badan)');
  assert.ok(LYING.hx - 140 >= 0, 'kepala tidak terpotong di tepi kiri kanvas');
  assert.ok(LYING.by - 130 >= 0 && LYING.by + 130 <= LYING.h, 'lengan di dalam kanvas');
});

test('bercak darah: tidak muncul bila blood = 0 (gambar lama identik) dan muncul di baju, tangan, dan pelipis bila > 0', () => {
  assert.doesNotMatch(rakaSvg(raka('netral')), /#A8322B/);
  assert.equal(raka('netral').blood, 0);
  const svg = rakaSvg(raka('bingung', null, { blood: 1 }));
  assert.ok((svg.match(/#A8322B/g) || []).length >= 6, 'beberapa bercak');
  // patch logo tidak tertutup bercak: semua bercak badan berada di sisi kiri layar (x < 200)
  const torso = svg.slice(svg.indexOf('M132 498'), svg.indexOf('M132 498') + 200);
  assert.ok(torso.length > 0);
});

test('ekspresi pingsan dan bingung: mata tertutup penuh dan setengah', () => {
  assert.equal(raka('pingsan').blink, 1);
  assert.ok(raka('bingung').blink > 0.3 && raka('bingung').blink < 0.6);
  assert.ok(POSES.berbaring && POSES.pov_perut);
});
