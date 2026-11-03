// Tes batch 2 Simulasi Dokter: 50 kasus baru (10 per poli) dari migrasi 1800003100,
// digabung dengan kasus bawaan dan batch 1 (1800001300). Tidak mengubah tes batch 1.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BUILTIN_CASES, BUILTIN_DX, BYID, CASES, DX, PLAYABLE, actionLines, caseCtx, isNA, needsReason, poliCounts, reasonSet, rel, score, setContent,
} from './engine.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../pocketbase/pb_migrations');
const load = (name) => {
  const src = fs.readFileSync(path.join(dir, name), 'utf8');
  return { cases: JSON.parse(src.match(/const NEW_CASES = (.*);\n/)[1]), dx: JSON.parse(src.match(/const NEW_DX = (.*);\n/)[1]) };
};
const B1 = load('1800001300_sim_cases_50.js');
const B2 = load('1800003100_sim_cases_b2.js');

const merged = () => {
  const cases = { ...BUILTIN_CASES };
  [...B1.cases, ...B2.cases].forEach((c) => { cases[c.key] = { ...c.data, poli: c.poli, title: c.title }; });
  const dx = { ...BUILTIN_DX };
  [...B1.dx, ...B2.dx].forEach((d) => { dx[d.key] = [d.name, d.tags]; });
  return { cases, dx };
};
const withContent = (fn) => {
  setContent(merged());
  try { return fn(); } finally { setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX }); }
};
const ids = (t) => t.split(/\s+/).filter(Boolean);

test('batch 2: 10 kasus baru per poli, kunci dan diagnosis unik di seluruh 100 kasus', () => {
  const n = {};
  B2.cases.forEach((c) => { n[c.poli] = (n[c.poli] || 0) + 1; });
  assert.deepEqual(n, { umum: 10, bedah: 10, spog: 10, anak: 10, dalam: 10 });
  const old = new Set([...Object.keys(BUILTIN_CASES), ...B1.cases.map((c) => c.key)]);
  B2.cases.forEach((c) => {
    assert.match(c.key, /^[a-z0-9_]{2,20}$/, c.key);
    assert.ok(!old.has(c.key), `${c.key} bentrok dengan kasus lama`);
  });
  withContent(() => {
    assert.deepEqual(poliCounts(), { umum: 20, bedah: 20, spog: 20, anak: 20, dalam: 20 });
    assert.equal(PLAYABLE.length, 100);
    assert.equal(new Set(PLAYABLE.map((k) => CASES[k].dxOk)).size, 100, 'tiap kasus memiliki diagnosis utama berbeda');
    assert.ok(Object.keys(DX).length >= 190);
  });
});

test('batch 2: tiap kasus punya diagnosis utama, banding yang terlihat, dan hasil penunjang spesifik', () => {
  withContent(() => {
    const bad = [];
    for (const c of B2.cases) {
      const d = c.data;
      if (!DX[d.dxOk]) bad.push(`${c.key}: dxOk ${d.dxOk} tidak ada di daftar diagnosis`);
      if (!d.ddx.includes(d.dxOk)) bad.push(`${c.key}: ddx tidak memuat dxOk`);
      if (new Set(d.ddx).size < 4) bad.push(`${c.key}: ddx kurang dari 4`);
      d.ddx.forEach((k) => { if (!DX[k]) bad.push(`${c.key}: ddx ${k} tidak ada`); });
      const kIds = ids(d.K);
      if (kIds.length < 15) bad.push(`${c.key}: K kurang dari 15`);
      const cards = Object.keys(d.A).filter((id) => BYID[id].kind === 'card' && BYID[id].tab === 'penunjang' && d.A[id].rows);
      const rowCount = (id) => String(d.A[id].rows).split(';').filter((r) => /=/.test(r)).length;
      if (cards.filter((id) => rowCount(id) >= 1).length < 3) bad.push(`${c.key}: kurang dari 3 hasil penunjang spesifik`);
      if (!kIds.some((id) => cards.includes(id))) bad.push(`${c.key}: tidak ada penunjang penting di K`);
      if (!d.A.ku || !d.A.onset || !d.A.vital) bad.push(`${c.key}: ku/onset/vital wajib`);
    }
    assert.deepEqual(bad, []);
  });
});

test('batch 2: konsisten dengan katalog dan bentuk jawaban benar', () => {
  withContent(() => {
    const bad = [];
    for (const c of B2.cases) {
      const ctx = caseCtx(c.key);
      if (ctx.poli !== c.poli) bad.push(`${c.key}: poli tidak terbaca`);
      for (const id of [...ids(c.data.K), ...ids(c.data.U), ...ids(c.data.B)]) {
        if (!BYID[id]) bad.push(`${c.key}: ${id} tidak ada di katalog`);
        else if (isNA(BYID[id], ctx)) bad.push(`${c.key}: ${id} tidak berlaku untuk poli ${c.poli}`);
      }
      for (const id of Object.keys(ctx.Bs)) if (ctx.Ks[id]) bad.push(`${c.key}: ${id} ada di K dan B`);
      for (const id of Object.keys(c.data.A)) {
        const it = BYID[id];
        if (!it) { bad.push(`${c.key}: jawaban ${id} tidak ada di katalog`); continue; }
        const a = c.data.A[id];
        const ok = it.kind === 'pas' ? a.say && a.note : it.kind === 'exam' ? a.t && a.note : it.kind === 'card' ? a.title && a.rows && a.say : a.who && a.say && a.note;
        if (!ok) bad.push(`${c.key}.${id}: bentuk jawaban kurang lengkap`);
        if (isNA(it, ctx)) bad.push(`${c.key}: jawaban untuk ${id} yang tidak berlaku`);
      }
      if (!c.data.ref.startsWith('Acuan:') || c.data.ref.length < 80) bad.push(`${c.key}: ref harus diawali "Acuan:" dan minimal 80 karakter`);
      if (!/belum ditinjau dokter/i.test(c.data.ref)) bad.push(`${c.key}: ref harus menyebut belum ditinjau dokter`);
    }
    assert.deepEqual(bad, []);
  });
});

test('batch 2: bermain sempurna menghasilkan skor 90 atau lebih', () => {
  withContent(() => {
    const low = [];
    for (const c of B2.cases) {
      const ctx = caseCtx(c.key);
      const done = {};
      const actions = Object.keys(ctx.Ks).map((id) => {
        done[id] = true;
        actionLines(BYID[id], ctx);
        const rs = reasonSet(BYID[id], ctx);
        return { id, rel: rel(BYID[id], ctx), reason: BYID[id].fl.g ? null : { key: rs.good[0] || null, ok: rs.good.length > 0, good: rs.good, tries: 1 } };
      });
      const s = score({ ctx, done, actions, dx: c.data.dxOk });
      assert.equal(s.parts.dx, 30, c.key);
      assert.equal(s.parts.key, 40, c.key);
      if (s.total < 90) low.push(`${c.key}=${s.total} (alasan ${s.parts.reason}/20)`);
    }
    assert.deepEqual(low, []);
  });
});

test('batch 2: setiap tindakan penting dan bermanfaat punya alasan benar di antara opsi', () => {
  withContent(() => {
    const bad = [];
    for (const c of B2.cases) {
      const ctx = caseCtx(c.key);
      for (const id of [...Object.keys(ctx.Ks), ...Object.keys(ctx.Us)]) {
        const it = BYID[id];
        if (!needsReason(it, ctx)) continue;
        const rs = reasonSet(it, ctx);
        if (!rs.good.length || !rs.opts.some((o) => rs.good.includes(o))) bad.push(`${c.key}.${id}`);
      }
    }
    assert.deepEqual(bad, []);
  });
});

test('batch 2: aturan mutu (derajat pada kualitas, dialog pembuka, kelompok umur anak)', () => {
  const skip = new Set(['dokter', 'selamat', 'siang', 'pagi', 'sore', 'malam', 'mohon', 'tolong', 'diperiksa', 'dibantu', 'diantar', 'ibunya', 'ayahnya', 'suaminya', 'istrinya', 'anaknya', 'digendong', 'tahun', 'pasien', 'berikutnya', 'sudah', 'masuk', 'cemas', 'takut', 'sekali', 'agak']);
  const bad = [];
  for (const c of B2.cases) {
    const d = c.data;
    if (!/nilai|skala|\d\s*\/\s*10|nyeri(nya)? sekitar \d|\bsekali\b|\bbanget\b/i.test(d.A.kualitas ? d.A.kualitas.say : 'nilai')) bad.push(`${c.key}: kualitas tanpa derajat`);
    if (d.intro.length < 2) bad.push(`${c.key}: intro kurang dari 2 baris`);
    const words = (d.A.ku.note || '').toLowerCase().match(/[a-z]{5,}/g) || [];
    const intro = d.intro.map((l) => l.t).join(' ').toLowerCase();
    words.filter((w) => !skip.has(w) && intro.includes(w)).forEach((w) => bad.push(`${c.key}: intro membocorkan "${w}"`));
    const m = /(\d+) tahun/.exec(d.id || c.title || '');
    if (c.poli === 'anak' && m) {
      const age = Number(m[1]);
      const text = JSON.stringify(Object.values(d.A).filter((a) => a && a.say).map((a) => a.say));
      if (age >= 6 && !/\b(aku|ku)\b/i.test(text)) bad.push(`${c.key}: anak >=6 tahun harus bicara sebagai "aku"`);
      if (age <= 4 && /\baku\b/i.test(d.A.ku.say)) bad.push(`${c.key}: anak <=4 tahun dijawab ibunya, bukan "aku"`);
    }
  }
  assert.deepEqual(bad, []);
});
