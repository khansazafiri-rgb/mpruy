// Tes untuk tokoh tubuh Grelin dan Jambi: semua kombinasi tergambar, anggota badan menyatu dengan badan, SVG statis sama dengan kode.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as G from './grelin/grelin.js';
import * as J from './jambi/jambi.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const balanced = (svg) => { const open = (svg.match(/<g[ >]/g) || []).length, close = (svg.match(/<\/g>/g) || []).length; return open === close; };
const cases = [['grelin', G, G.grelin, G.grelinSvg, { cx: 100, cy: 124, rx: 60, ry: 88 }], ['jambi', J, J.jambi, J.jambiSvg, { cx: 110, cy: 128, rx: 86, ry: 86 }]];
for (const [name, M, make, draw, body] of cases) {
  test(`${name}: semua ekspresi dan pose tergambar`, () => {
    for (const e of Object.keys(M.EXPRESSIONS)) for (const p of Object.keys(M.POSES)) {
      const svg = draw(make(e, p));
      assert.match(svg, /^<svg /); assert.ok(balanced(svg), `${e}/${p} grup tidak seimbang`); assert.ok(!/NaN|undefined/.test(svg), `${e}/${p} ada NaN`);
    }
    assert.throws(() => make('tidak-ada'), /tidak dikenal/); assert.throws(() => make('netral', 'tidak-ada'), /tidak dikenal/);
  });
  test(`${name}: lengan dan kaki menyatu dengan badan`, () => {
    for (const e of Object.keys(M.EXPRESSIONS)) for (const p of Object.keys(M.POSES)) {
      const s = make(e, p);
      for (const side of ['L', 'R']) {
        const a = M.armShape(side, side === 'L' ? s.armL : s.armR);
        const d = Math.hypot((a.start[0] - body.cx) / body.rx, (a.start[1] - body.cy) / body.ry);
        assert.ok(d < 1.02, `${e}/${p} lengan ${side} lepas dari badan (d=${d.toFixed(2)})`);   // bahu berada di tepi/dalam badan
        const l = M.legShape(side, s);
        assert.ok(Math.hypot((l.start[0] - body.cx) / body.rx, (l.start[1] - body.cy) / body.ry) < 1.02, `${e}/${p} kaki ${side} lepas dari badan`);
        assert.ok(l.foot[1] >= M.FLOOR_Y - 40 && l.foot[1] <= M.FLOOR_Y, `${e}/${p} kaki ${side} tidak menapak`);
        assert.ok(a.hand[0] >= -10 && a.hand[0] <= M.VIEWBOX.w + 10 && a.hand[1] >= -10 && a.hand[1] <= M.VIEWBOX.h, `${e}/${p} tangan keluar kanvas`);
      }
    }
  });
  test(`${name}: gerak jalan menjaga kaki tetap tersambung`, () => {
    for (let i = 0; i < 12; i++) { const s = make('netral', 'berdiri', { legs: { dxL: Math.sin(i) * 20, dxR: -Math.sin(i) * 20, liftL: Math.max(0, Math.cos(i)) * 20, liftR: Math.max(0, -Math.cos(i)) * 20 } }); for (const side of ['L', 'R']) { const l = M.legShape(side, s); assert.ok(Math.abs(l.foot[0] - l.start[0]) < 40, 'kaki terlalu jauh dari pangkal'); assert.ok(l.foot[1] < M.FLOOR_Y, 'kaki menembus lantai'); } }
  });
  test(`${name}: svg/ sama dengan keluaran kode`, () => {
    const f = path.join(here, name, 'svg', `${name}-netral.svg`);
    assert.equal(fs.readFileSync(f, 'utf8').trim(), draw(make('netral')).trim());
  });
}
test('grelin: efek tambahan (surat sinyal, liur) tampil hanya bila diminta', () => {
  assert.ok(!G.grelinSvg(G.grelin('netral')).includes('FFF9EA'));
  assert.ok(G.grelinSvg(G.grelin('netral', 'kirim_sinyal')).includes('FFF9EA'));
});
test('jambi: jarum mengikuti jam', () => {
  const a = J.jambiSvg(J.jambi('netral', 'berdiri', { jam: 20 })), b = J.jambiSvg(J.jambi('netral', 'berdiri', { jam: 3 }));
  assert.notEqual(a, b);
});
