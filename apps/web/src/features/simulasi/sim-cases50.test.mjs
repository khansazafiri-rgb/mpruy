import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  BUILTIN_CASES, BUILTIN_DX, BYID, CASES, DX, PLAYABLE, POLI, actionLines, caseCtx, isNA, pickCase, poliCounts, reasonSet, rel, score, setContent,
} from './engine.js';

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../pocketbase/pb_migrations/1800001300_sim_cases_50.js');
const src = fs.readFileSync(file, 'utf8');
const NEW_CASES = JSON.parse(src.match(/const NEW_CASES = (.*);\n/)[1]);
const NEW_DX = JSON.parse(src.match(/const NEW_DX = (.*);\n/)[1]);

const merged = () => {
  const cases = { ...BUILTIN_CASES };
  NEW_CASES.forEach((c) => { cases[c.key] = { ...c.data, poli: c.poli, title: c.title }; });
  const dx = { ...BUILTIN_DX };
  NEW_DX.forEach((d) => { dx[d.key] = [d.name, d.tags]; });
  return { cases, dx };
};

test('50 kasus: 10 per poli dan diagnosis cukup banyak', () => {
  setContent(merged());
  try {
    const n = poliCounts();
    assert.deepEqual(n, { umum: 10, bedah: 10, spog: 10, anak: 10, dalam: 10 });
    assert.equal(PLAYABLE.length, 50);
    const dxOk = PLAYABLE.map((k) => CASES[k].dxOk);
    assert.equal(new Set(dxOk).size, 50, 'tiap kasus memiliki diagnosis berbeda');
    assert.ok(Object.keys(DX).length >= 90);
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});

test('kasus tambahan konsisten dengan katalog', () => {
  setContent(merged());
  try {
    const bad = [];
    const ids = (t) => t.split(/\s+/).filter(Boolean);
    for (const c of NEW_CASES) {
      const ctx = caseCtx(c.key);
      if (ctx.poli !== c.poli) bad.push(`${c.key}: poli tidak terbaca`);
      for (const id of [...ids(c.data.K), ...ids(c.data.U), ...ids(c.data.B)]) if (isNA(BYID[id], ctx)) bad.push(`${c.key}: ${id} tidak berlaku untuk poli ${c.poli}`);
      for (const id of Object.keys(ctx.Bs)) if (ctx.Ks[id]) bad.push(`${c.key}: ${id} ada di K dan B`);
      for (const id of Object.keys(c.data.A)) {
        const it = BYID[id];
        const a = c.data.A[id];
        const ok = it.kind === 'pas' ? a.say && a.note : it.kind === 'exam' ? a.t && a.note : it.kind === 'card' ? a.title && a.rows && a.say : a.who && a.say && a.note;
        if (!ok) bad.push(`${c.key}.${id}: bentuk jawaban kurang lengkap`);
        if (isNA(it, ctx)) bad.push(`${c.key}: jawaban untuk ${id} yang tidak berlaku`);
      }
      if (c.data.ref.length < 80) bad.push(`${c.key}: ref terlalu pendek`);
    }
    assert.deepEqual(bad, []);
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});

test('bermain sempurna (semua hal penting, alasan terbaik) menghasilkan skor tinggi di tiap kasus', () => {
  setContent(merged());
  try {
    const low = [];
    for (const c of NEW_CASES) {
      const ctx = caseCtx(c.key);
      const done = {};
      const actions = Object.keys(ctx.Ks).map((id) => {
        done[id] = true;
        actionLines(BYID[id], ctx); // tidak boleh melempar galat
        const rs = reasonSet(BYID[id], ctx);
        return { id, rel: rel(BYID[id], ctx), reason: BYID[id].fl.g ? null : { key: rs.good[0] || null, ok: rs.good.length > 0, good: rs.good } };
      });
      const s = score({ ctx, done, actions, dx: c.dxOk });
      assert.equal(s.parts.dx, 30, c.key);
      assert.equal(s.parts.key, 40, c.key);
      if (s.total < 90) low.push(`${c.key}=${s.total} (alasan ${s.parts.reason}/20)`);
    }
    assert.deepEqual(low, [], 'kasus dengan skor maksimal di bawah 90, periksa ddx dan tag');
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});

test('undian kasus mengikuti poli yang dipilih', () => {
  setContent(merged());
  try {
    for (const poli of Object.keys(POLI)) {
      for (let i = 0; i < 30; i++) {
        const k = pickCase('', () => i / 30, poli);
        assert.equal(CASES[k].poli || k, poli);
      }
      const prev = PLAYABLE.find((k) => (CASES[k].poli || k) === poli);
      for (let i = 0; i < 30; i++) assert.notEqual(pickCase(prev, () => i / 30, poli), prev);
    }
    const seen = new Set();
    for (let i = 0; i < 200; i++) seen.add(CASES[pickCase('', () => i / 200, 'acak')].poli || 'x');
    assert.ok(seen.size >= 4, 'mode acak mengambil dari banyak poli');
  } finally {
    setContent({ cases: BUILTIN_CASES, dx: BUILTIN_DX });
  }
});
