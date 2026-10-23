import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BYID, CASES, CAT, DX, PLAYABLE, actionLines, areasFor, caseCtx, ddxOptions, judgeDdx, judgeReason, pickCase, reasonSet, rel, score,
} from './engine.js';

test('katalog terbaca dan id unik', () => {
  assert.ok(CAT.length > 200);
  assert.equal(Object.keys(BYID).length, CAT.length);
});

test('setiap id K/U/B dan jawaban khusus kasus ada di katalog', () => {
  for (const k of PLAYABLE) {
    const C = CASES[k];
    for (const id of `${C.K} ${C.U} ${C.B}`.split(/\s+/).filter(Boolean)) assert.ok(BYID[id], `${k}: ${id} tidak ada di katalog`);
    for (const id of Object.keys(C.A)) assert.ok(BYID[id], `${k}: jawaban ${id} tidak ada di katalog`);
    assert.ok(DX[C.dxOk], `${k}: dxOk`);
    C.ddx.forEach((d) => assert.ok(DX[d], `${k}: ddx ${d}`));
  }
});

test('relevansi mengikuti aturan prototipe', () => {
  const ctx = caseCtx('umum');
  assert.equal(rel(BYID.paru_auskul, ctx), 'K');
  assert.equal(rel(BYID.crp, ctx), 'U');
  assert.equal(rel(BYID.steroid_sis, ctx), 'B');
  assert.equal(rel(BYID.hpht, ctx), 'N');
  assert.equal(rel(BYID.magnesium, ctx), 'B'); // obat obstetri di luar poli kandungan
  assert.equal(rel(BYID.mri, ctx), 'T'); // invasif tanpa indikasi
  assert.equal(rel(BYID.ct_kepala, caseCtx('spog')), 'T');
});

test('opsi alasan tetap (deterministik) dan memuat diagnosis banding yang terkait', () => {
  const ctx = caseCtx('umum');
  const a = reasonSet(BYID.demam, ctx);
  const b = reasonSet(BYID.demam, ctx);
  assert.deepEqual(a, b);
  assert.equal(a.opts.length, 4);
  assert.ok(a.opts.some((k) => a.good.includes(k)));
  assert.equal(judgeReason(a, a.good[0]).ok, true);
  assert.equal(judgeReason(a, '').ok, false);
});

test('skor: diagnosis tepat + semua hal penting = 100 bila tanpa tindakan sia-sia', () => {
  const ctx = caseCtx('bedah');
  const done = {};
  const actions = Object.keys(ctx.Ks).map((id) => {
    done[id] = true;
    const rs = reasonSet(BYID[id], ctx);
    return { id, rel: rel(BYID[id], ctx), reason: rs.good.length ? judgeReason(rs, rs.good[0]) : null };
  });
  const s = score({ ctx, done, actions, dx: 'apendisitis' });
  assert.equal(s.parts.dx, 30);
  assert.equal(s.parts.key, 40);
  assert.equal(s.parts.eff, 10);
  assert.equal(s.missed.length, 0);
  const wrong = score({ ctx, done: {}, actions: [], dx: 'kolik' });
  assert.equal(wrong.parts.dx, 12); // masih diagnosis banding
  assert.equal(wrong.total, 12 + 10);
});

test('kelompok panel: tindakan yang tidak berlaku disembunyikan, telaah sistem digabung', () => {
  const umum = areasFor('anam', caseCtx('umum'));
  assert.ok(!umum.some((a) => a.key === 'Khusus kehamilan'));
  const telaah = umum.find((a) => a.key === 'Telaah sistem');
  assert.ok(telaah.systems.length >= 6);
  assert.ok(areasFor('anam', caseCtx('spog')).some((a) => a.key === 'Khusus kehamilan'));
});

test('dialog tindakan memakai jawaban khusus kasus', () => {
  const { lines, note } = actionLines(BYID.dahak, caseCtx('umum'));
  assert.equal(lines[0].w, 'dok');
  assert.match(lines[1].t, /kuning/);
  assert.match(note, /purulen/);
});

test('refleksi diagnosis banding dinilai dari ddx kasus', () => {
  const ctx = caseCtx('dalam');
  const opts = ddxOptions(ctx, 'gagaljantung');
  assert.equal(opts.length, 4);
  assert.deepEqual(opts, ddxOptions(ctx, 'gagaljantung'));
  const good = opts.filter((k) => ctx.C.ddx.includes(k));
  assert.equal(good.length, 2);
  assert.equal(judgeDdx(ctx, 'gagaljantung', good[0]).ok, true);
  assert.equal(judgeDdx(ctx, 'gagaljantung', opts.find((k) => !ctx.C.ddx.includes(k))).ok, false);
});

test('kasus acak tidak mengulang kasus sebelumnya dan tidak memilih ruang tunggu', () => {
  for (let i = 0; i < 50; i++) {
    const k = pickCase('umum', () => i / 50);
    assert.notEqual(k, 'umum');
    assert.notEqual(k, 'tunggu');
  }
});

test('data kasus di server sama dengan di web (judul dan diagnosis tepat)', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const server = require('../../../../pocketbase/pb_hooks/lib/doctorSim.js');
  assert.deepEqual(Object.keys(server.CASES).sort(), [...PLAYABLE].sort());
  for (const k of PLAYABLE) assert.equal(server.CASES[k].dxOk, CASES[k].dxOk, k);
});
