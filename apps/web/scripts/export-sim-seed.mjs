// Membuat migrasi PocketBase berisi kasus dan diagnosis bawaan Simulasi Dokter
// dari src/features/simulasi/data. Dijalankan sekali saat kasus pindah ke
// database; setelah itu admin mengubah kasus lewat dashboard (/admin/simulasi).
//   node scripts/export-sim-seed.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_CASES, BUILTIN_DX, POLI } from '../src/features/simulasi/engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../pocketbase/pb_migrations/1800000900_sim_content.js');

const cases = Object.entries(BUILTIN_CASES)
  .filter(([, c]) => !c.nodoc)
  .map(([key, c], i) => ({
    key, poli: key, order: i + 1, active: true, dxOk: c.dxOk, title: `${c.id} · ${POLI[key]}`,
    data: { pas: c.pas, expr: c.expr, id: c.id, intro: c.intro, dxOk: c.dxOk, ddx: c.ddx, ref: c.ref, K: c.K, U: c.U, B: c.B, A: c.A },
  }));
const dx = Object.entries(BUILTIN_DX).map(([key, [name, tags]], i) => ({ key, name, tags, order: i + 1 }));

const src = `/// <reference path="../pb_data/types.d.ts" />
// Kasus dan daftar diagnosis Simulasi Dokter di database supaya bisa dikelola
// admin (/admin/simulasi). Isi awal dibuat oleh apps/web/scripts/export-sim-seed.mjs
// dari data bawaan web; jangan mengubah isi kasus di file ini.
// Semua akses lewat endpoint /api/medcoel/doctor-sim/* dan /api/medcoel/admin/sim/*.
const SEED_CASES = ${JSON.stringify(cases)};
const SEED_DX = ${JSON.stringify(dx)};

migrate((app) => {
  const cases = new Collection({
    type: "base", name: "sim_cases", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "key", type: "text", required: true, min: 2, max: 20, pattern: "^[a-z0-9_]+$" },
      { name: "title", type: "text", required: true, max: 120 },
      { name: "poli", type: "select", required: true, maxSelect: 1, values: ["umum", "bedah", "spog", "anak", "dalam"] },
      { name: "dxOk", type: "text", required: true, max: 40 },
      { name: "active", type: "bool" },
      { name: "order", type: "number", onlyInt: true },
      { name: "data", type: "json", maxSize: 500000 },
      { name: "updatedBy", type: "text", max: 40 },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_sim_cases_key ON sim_cases (key)"],
  });
  app.save(cases);
  const dx = new Collection({
    type: "base", name: "sim_diagnoses", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: "key", type: "text", required: true, min: 2, max: 40, pattern: "^[a-z0-9_]+$" },
      { name: "name", type: "text", required: true, max: 120 },
      { name: "tags", type: "text", max: 200 },
      { name: "order", type: "number", onlyInt: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_sim_diagnoses_key ON sim_diagnoses (key)"],
  });
  app.save(dx);
  SEED_DX.forEach((d) => {
    const r = new Record(dx);
    ["key", "name", "tags", "order"].forEach((k) => r.set(k, d[k]));
    app.save(r);
  });
  SEED_CASES.forEach((c) => {
    const r = new Record(cases);
    ["key", "title", "poli", "dxOk", "active", "order", "data"].forEach((k) => r.set(k, c[k]));
    app.save(r);
  });
}, (app) => {
  ["sim_cases", "sim_diagnoses"].forEach((n) => { try { app.delete(app.findCollectionByNameOrId(n)); } catch (_) {} });
});
`;
fs.writeFileSync(out, src);
console.log(`${path.relative(process.cwd(), out)}: ${cases.length} kasus, ${dx.length} diagnosis`);
