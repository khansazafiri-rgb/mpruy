import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILTIN_CASES, BUILTIN_DX, BYID, CASES, CAT, DX, PLAYABLE, actionLines, areasFor, caseCtx, caseSprites, ddxOptions, judgeDdx, judgeReason,
  needsReason, pickCase, reasonFeedback, reasonSet, rel, score, setContent,
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

test('isi awal database (migrasi) sama dengan kasus bawaan web', async () => {
  const fs = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const path = await import('node:path');
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../pocketbase/pb_migrations/1800000900_sim_content.js');
  const src = fs.readFileSync(file, 'utf8');
  const seed = JSON.parse(src.match(/const SEED_CASES = (.*);\n/)[1]);
  const dx = JSON.parse(src.match(/const SEED_DX = (.*);\n/)[1]);
  assert.deepEqual(seed.map((c) => c.key).sort(), [...PLAYABLE].sort());
  for (const c of seed) {
    const C = BUILTIN_CASES[c.key];
    assert.equal(c.dxOk, C.dxOk, c.key);
    assert.deepEqual(c.data.A, JSON.parse(JSON.stringify(C.A)), `${c.key}: jalankan node scripts/export-sim-seed.mjs setelah mengubah data/cases.js`);
    assert.equal(c.data.K, C.K, c.key);
  }
  assert.deepEqual(dx.map((d) => d.key).sort(), Object.keys(BUILTIN_DX).sort());
});

test('isi dari server mengganti kasus; kasus tutorial tetap ada walau dinonaktifkan', () => {
  const extra = { ...BUILTIN_CASES.bedah, poli: 'bedah', id: 'Bu Tes, 30 tahun' };
  setContent({ cases: { bedah: BUILTIN_CASES.bedah, bedah2: extra }, dx: BUILTIN_DX });
  try {
    assert.deepEqual([...PLAYABLE].sort(), ['bedah', 'bedah2']);
    assert.equal(CASES.umum.tutorialOnly, true);
    const ctx = caseCtx('bedah2');
    assert.equal(ctx.poli, 'bedah');
    assert.equal(ctx.key, 'bedah2');
    assert.ok(caseSprites(ctx, 'L').includes('BG_bedah'));
    for (let i = 0; i < 20; i++) assert.notEqual(pickCase('bedah', () => i / 20), 'umum');
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});

test('alasan: tindakan penting dan bermanfaat selalu punya alasan yang benar, yang tidak terkait tidak punya', () => {
  for (const k of PLAYABLE) {
    const ctx = caseCtx(k);
    for (const id of [...Object.keys(ctx.Ks), ...Object.keys(ctx.Us)]) {
      const it = BYID[id];
      if (!needsReason(it, ctx)) continue;
      const rs = reasonSet(it, ctx);
      assert.ok(rs.good.length > 0, `${k}: ${id} tidak punya alasan yang benar`);
      assert.ok(rs.opts.some((o) => rs.good.includes(o)), `${k}: ${id} opsi tidak memuat alasan yang benar`);
      assert.equal(new Set(rs.opts).size, rs.opts.length);
    }
  }
  // Tindakan tanpa kaitan sama sekali dengan kasus (MRI pada pneumonia) tidak punya alasan yang benar.
  const ctx = caseCtx('umum');
  assert.equal(reasonSet(BYID.mri, ctx).good.length, 0);
  // Diagnosis tepat membenarkan tindakan penting yang tag-nya tidak beririsan dengan diagnosis banding mana pun.
  setContent({ cases: { ...BUILTIN_CASES, bedah: { ...BUILTIN_CASES.bedah, ddx: ['apendisitis', 'kolik'], K: `${BUILTIN_CASES.bedah.K} paru_auskul` } }, dx: BUILTIN_DX });
  try {
    const rs = reasonSet(BYID.paru_auskul, caseCtx('bedah'));
    assert.deepEqual(rs.good, ['apendisitis']);
    assert.ok(rs.opts.includes('apendisitis'));
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});

test('alasan salah tidak pernah dinilai benar dan umpan baliknya tidak membocorkan jawaban', () => {
  const ctx = caseCtx('umum');
  const it = BYID.demam;
  const rs = reasonSet(it, ctx);
  const wrong = rs.opts.find((o) => !rs.good.includes(o));
  assert.equal(judgeReason(rs, wrong).ok, false);
  assert.equal(judgeReason(rs, '').ok, false);
  for (const g of rs.good) assert.equal(judgeReason(rs, g).ok, true);
  const fb = reasonFeedback(it, rs, wrong);
  assert.match(fb, /belum dilakukan/);
  rs.good.forEach((g) => assert.ok(!fb.includes(DX[g][0]) || DX[g][0] === DX[wrong][0]));
  assert.match(reasonFeedback(it, rs, ''), /belum dilakukan/);
  assert.match(reasonFeedback(BYID.mri, { good: [], opts: [] }, 'tb'), /tidak ada dugaan/i);
});

test('skor alasan: benar di percobaan pertama penuh, benar setelah mencoba lagi setengah', () => {
  const ctx = caseCtx('umum');
  const mk = (tries) => ['demam', 'batuk'].map((id) => ({ id, rel: 'K', reason: { key: 'pneumonia', ok: true, good: ['pneumonia'], tries } }));
  const base = { ctx, done: {}, dx: 'pneumonia' };
  const first = score({ ...base, actions: mk(1) });
  const late = score({ ...base, actions: mk(3) });
  assert.equal(first.parts.reason, 20);
  assert.equal(late.parts.reason, 10);
  assert.equal(first.reasonOk, 2);
  assert.equal(late.reasonOk, 0);
  assert.equal(late.reasonLate, 2);
  const mixed = score({ ...base, actions: [...mk(1).slice(0, 1), ...mk(2).slice(1)] });
  assert.equal(mixed.parts.reason, 15);
});
