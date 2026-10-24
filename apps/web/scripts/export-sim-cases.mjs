// Membuat migrasi PocketBase berisi kasus dan diagnosis tambahan Simulasi Dokter
// dari scripts/sim-cases/*.mjs, setelah memeriksa semuanya terhadap katalog mesin.
// Migrasi hanya menambah kasus dan diagnosis yang belum ada (kunci sama dilewati),
// jadi kasus yang sudah diubah admin tidak tertimpa.
//   node scripts/export-sim-cases.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_CASES, BUILTIN_DX, BYID, POLI } from '../src/features/simulasi/engine.js';
import anak from './sim-cases/anak.mjs';
import bedah from './sim-cases/bedah.mjs';
import dalam from './sim-cases/dalam.mjs';
import { NEW_DX } from './sim-cases/dx.mjs';
import spog from './sim-cases/spog.mjs';
import umum from './sim-cases/umum.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../pocketbase/pb_migrations/1800001300_sim_cases_50.js');

const groups = { umum, bedah, spog, anak, dalam };
const allDx = { ...BUILTIN_DX, ...NEW_DX };
const errors = [];
const err = (k, m) => errors.push(`${k}: ${m}`);

const cases = [];
let order = Object.keys(BUILTIN_CASES).filter((k) => !BUILTIN_CASES[k].nodoc).length;
Object.entries(groups).forEach(([poli, defs]) => {
  Object.entries(defs).forEach(([key, c]) => {
    order += 1;
    if (!/^[a-z0-9_]{2,20}$/.test(key)) err(key, 'kunci kasus tidak sah');
    if (BUILTIN_CASES[key]) err(key, 'bentrok dengan kasus bawaan');
    if (c.poli !== poli) err(key, `poli ${c.poli} berbeda dengan berkas ${poli}`);
    if (!allDx[c.dxOk]) err(key, `dxOk ${c.dxOk} tidak ada`);
    if (!c.ddx.includes(c.dxOk)) err(key, 'ddx harus memuat dxOk');
    if (c.ddx.length < 4) err(key, 'ddx minimal 4');
    c.ddx.forEach((d) => { if (!allDx[d]) err(key, `ddx ${d} tidak ada`); });
    for (const f of ['K', 'U', 'B']) c[f].split(/\s+/).filter(Boolean).forEach((id) => { if (!BYID[id]) err(key, `${f}: id ${id} tidak ada di katalog`); });
    Object.keys(c.A).forEach((id) => { if (!BYID[id]) err(key, `jawaban ${id} tidak ada di katalog`); });
    if (c.intro.length < 2) err(key, 'intro minimal 2 baris');
    if (c.K.split(' ').length < 15) err(key, 'K terlalu sedikit');
    ['ku', 'onset', 'vital'].forEach((id) => { if (!c.A[id]) err(key, `jawaban ${id} wajib`); });
    cases.push({
      key, poli, order, active: true, dxOk: c.dxOk, title: `${c.id} · ${POLI[poli]}`,
      data: { pas: c.pas, expr: c.expr, id: c.id, intro: c.intro, dxOk: c.dxOk, ddx: c.ddx, ref: c.ref, K: c.K, U: c.U, B: c.B, A: c.A },
    });
  });
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

let dxOrder = Object.keys(BUILTIN_DX).length;
const dx = Object.entries(NEW_DX).map(([key, [name, tags]]) => ({ key, name, tags, order: ++dxOrder }));

const src = `/// <reference path="../pb_data/types.d.ts" />
// Kasus dan diagnosis tambahan Simulasi Dokter (${cases.length} kasus baru: ${Object.entries(groups).map(([k, v]) => `${Object.keys(v).length} ${k}`).join(', ')}).
// Dibuat oleh apps/web/scripts/export-sim-cases.mjs dari apps/web/scripts/sim-cases;
// jangan mengubah isi di sini. Kunci yang sudah ada dilewati, jadi perubahan admin aman.
const NEW_CASES = ${JSON.stringify(cases)};
const NEW_DX = ${JSON.stringify(dx)};

migrate((app) => {
  const exists = (col, key) => { try { app.findFirstRecordByFilter(col, "key = {:k}", { k: key }); return true; } catch (_) { return false; } };
  const dxCol = app.findCollectionByNameOrId("sim_diagnoses");
  NEW_DX.forEach((d) => {
    if (exists("sim_diagnoses", d.key)) return;
    const r = new Record(dxCol);
    ["key", "name", "tags", "order"].forEach((k) => r.set(k, d[k]));
    app.save(r);
  });
  const caseCol = app.findCollectionByNameOrId("sim_cases");
  NEW_CASES.forEach((c) => {
    if (exists("sim_cases", c.key)) return;
    const r = new Record(caseCol);
    ["key", "title", "poli", "dxOk", "active", "order", "data"].forEach((k) => r.set(k, c[k]));
    app.save(r);
  });
}, (app) => {
  NEW_CASES.forEach((c) => { try { app.delete(app.findFirstRecordByFilter("sim_cases", "key = {:k}", { k: c.key })); } catch (_) {} });
  NEW_DX.forEach((d) => { try { app.delete(app.findFirstRecordByFilter("sim_diagnoses", "key = {:k}", { k: d.key })); } catch (_) {} });
});
`;
fs.writeFileSync(out, src);
console.log(`${path.relative(process.cwd(), out)}: ${cases.length} kasus, ${dx.length} diagnosis (${(src.length / 1024).toFixed(0)} KB)`);
