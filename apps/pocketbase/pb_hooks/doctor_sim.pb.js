/// <reference path="../pb_data/types.d.ts" />

// SIMULASI DOKTER
// - Pemain: GET /api/medcoel/doctor-sim/content (kasus aktif + diagnosis),
//   POST/GET /api/medcoel/doctor-sim/results (hasil milik sendiri).
// - Admin: /api/medcoel/admin/sim/cases dan /api/medcoel/admin/sim/diagnoses.
// Mesin simulasi berjalan di browser; server menyimpan ringkasannya saja,
// memeriksa kasus, dan menghitung sendiri apakah diagnosis tepat.

routerAdd("GET", "/api/medcoel/doctor-sim/content", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const user = u.requireUser(e);
  const preview = u.query(e, "preview") === "1" && u.roleOf(user) === "admin";
  return e.json(200, sim.content(e.app, preview));
});

routerAdd("POST", "/api/medcoel/doctor-sim/results", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  // Kasus nonaktif tetap diterima supaya konsultasi yang sedang berjalan saat
  // admin menonaktifkannya tidak hilang.
  const c = sim.findCase(e.app, b.caseKey);
  if (!c) throw new BadRequestError("Kasus tidak dikenal.");
  // Batas wajar: satu konsultasi butuh waktu, jadi lebih dari 20 kiriman per 10 menit ditolak.
  const since = u.pbDate(new Date(Date.now() - 10 * 60 * 1000));
  const recent = e.app.countRecords("doctor_sims", $dbx.exp("user = {:u} AND created >= {:s}", { u: user.id, s: since }));
  if (recent >= 20) throw new TooManyRequestsError("Terlalu banyak hasil dikirim. Coba lagi sebentar lagi.");
  const dxKey = /^[a-z0-9_]{1,40}$/.test(String(b.dxKey || "")) ? String(b.dxKey) : "";
  const rec = new Record(e.app.findCollectionByNameOrId("doctor_sims"));
  rec.set("user", user.id);
  rec.set("caseKey", c.getString("key"));
  rec.set("caseTitle", c.getString("title"));
  rec.set("dxKey", dxKey);
  rec.set("dxOk", dxKey !== "" && dxKey === c.getString("dxOk"));
  rec.set("score", sim.clampInt(b.score, 0, 100));
  rec.set("durationSec", sim.clampInt(b.durationSec, 0, 86400));
  rec.set("mode", b.mode === "timer" ? "timer" : "santai");
  rec.set("timeout", b.timeout === true);
  const keyTotal = sim.clampInt(b.keyTotal, 0, 1000);
  rec.set("keyTotal", keyTotal);
  rec.set("keyDone", Math.min(sim.clampInt(b.keyDone, 0, 1000), keyTotal));
  rec.set("actionsCount", sim.clampInt(b.actionsCount, 0, 1000));
  e.app.save(rec);
  return e.json(200, { result: sim.serialize(rec) });
});

routerAdd("GET", "/api/medcoel/doctor-sim/results", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const user = u.requireUser(e);
  const page = Math.max(1, sim.clampInt(u.query(e, "page") || 1, 1, 10000));
  const perPage = sim.clampInt(u.query(e, "perPage") || 20, 1, 50);
  const total = e.app.countRecords("doctor_sims", $dbx.exp("user = {:u}", { u: user.id }));
  const rows = e.app.findRecordsByFilter("doctor_sims", "user = {:u}", "-created,-id", perPage, (page - 1) * perPage, { u: user.id });
  return e.json(200, { page: page, perPage: perPage, totalItems: total, totalPages: Math.max(1, Math.ceil(total / perPage)), items: rows.map(sim.serialize) });
});

// ---------------------------------------------------------------------------
// Admin: kasus
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/sim/cases", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const stats = arrayOf(new DynamicModel({ caseKey: "", plays: 0, players: 0, avgScore: 0, dxOk: 0 }));
  e.app.db().newQuery(
    "SELECT caseKey, COUNT(*) AS plays, COUNT(DISTINCT user) AS players, COALESCE(AVG(score), 0) AS avgScore, COALESCE(SUM(dxOk), 0) AS dxOk FROM doctor_sims GROUP BY caseKey",
  ).all(stats);
  const byKey = {};
  stats.forEach((s) => { byKey[s.caseKey] = { plays: s.plays, players: s.players, avgScore: Math.round(s.avgScore), dxOkRate: s.plays ? Math.round((s.dxOk / s.plays) * 100) : 0 }; });
  const items = e.app.findRecordsByFilter("sim_cases", "id != ''", "order,key", 0, 0).map((r) => {
    const c = sim.caseOut(r, false);
    c.stats = byKey[c.key] || { plays: 0, players: 0, avgScore: 0, dxOkRate: 0 };
    return c;
  });
  return e.json(200, { items: items, patients: sim.PATIENTS, expressions: sim.EXPR, nurseExpressions: sim.SUS_EXPR, poli: sim.POLI });
});

routerAdd("GET", "/api/medcoel/admin/sim/cases/{key}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const r = sim.findCase(e.app, e.request.pathValue("key"));
  if (!r) throw new NotFoundError("Kasus tidak ditemukan.");
  return e.json(200, sim.caseOut(r, true));
});

routerAdd("POST", "/api/medcoel/admin/sim/cases", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const admin = u.requireAdmin(e);
  const v = sim.validateCase(e.app, u.body(e), null);
  const r = new Record(e.app.findCollectionByNameOrId("sim_cases"));
  Object.keys(v).forEach((k) => r.set(k, v[k]));
  r.set("updatedBy", admin.id);
  e.app.save(r);
  return e.json(200, sim.caseOut(r, true));
});

routerAdd("PATCH", "/api/medcoel/admin/sim/cases/{key}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const admin = u.requireAdmin(e);
  const r = sim.findCase(e.app, e.request.pathValue("key"));
  if (!r) throw new NotFoundError("Kasus tidak ditemukan.");
  const b = u.body(e);
  // Ubah cepat (aktif/urutan) tanpa mengirim seluruh isi kasus.
  if (b.data === undefined) {
    if (b.active !== undefined) r.set("active", b.active === true);
    if (b.order !== undefined) r.set("order", sim.clampInt(b.order, 0, 100000));
  } else {
    const v = sim.validateCase(e.app, b, r);
    Object.keys(v).forEach((k) => { if (k !== "key") r.set(k, v[k]); });
  }
  r.set("updatedBy", admin.id);
  e.app.save(r);
  return e.json(200, sim.caseOut(r, true));
});

routerAdd("DELETE", "/api/medcoel/admin/sim/cases/{key}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const r = sim.findCase(e.app, e.request.pathValue("key"));
  if (!r) throw new NotFoundError("Kasus tidak ditemukan.");
  if (r.getString("key") === "umum") throw new BadRequestError("Kasus umum dipakai tutorial. Nonaktifkan saja bila tidak ingin diundi.");
  // Riwayat hasil pemain tetap ada (judul kasus tersimpan di tiap hasil).
  e.app.delete(r);
  return e.json(200, { ok: true });
});

// ---------------------------------------------------------------------------
// Admin: daftar diagnosis
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/sim/diagnoses", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const used = {};
  e.app.findRecordsByFilter("sim_cases", "id != ''", "", 0, 0).forEach((r) => {
    const d = sim.jsonOf(r, "data");
    [r.getString("dxOk")].concat(d.ddx || []).forEach((k) => { used[k] = (used[k] || 0) + 1; });
  });
  return e.json(200, { items: sim.dxRecords(e.app).map((r) => { const o = sim.dxOut(r); o.usedBy = used[o.key] || 0; return o; }) });
});

routerAdd("POST", "/api/medcoel/admin/sim/diagnoses", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const v = sim.validateDx(u.body(e), true);
  let taken = false;
  try { e.app.findFirstRecordByFilter("sim_diagnoses", "key = {:k}", { k: v.key }); taken = true; } catch (_) {}
  if (taken) throw new BadRequestError("Kode diagnosis sudah dipakai.", u.fieldErrors({ key: "Kode diagnosis sudah dipakai." }));
  const r = new Record(e.app.findCollectionByNameOrId("sim_diagnoses"));
  Object.keys(v).forEach((k) => r.set(k, v[k]));
  if (!v.order) r.set("order", sim.dxRecords(e.app).length + 1);
  e.app.save(r);
  return e.json(200, sim.dxOut(r));
});

routerAdd("PATCH", "/api/medcoel/admin/sim/diagnoses/{key}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  let r;
  try { r = e.app.findFirstRecordByFilter("sim_diagnoses", "key = {:k}", { k: e.request.pathValue("key") }); } catch (_) { throw new NotFoundError("Diagnosis tidak ditemukan."); }
  const v = sim.validateDx(Object.assign({ order: r.getInt("order") }, u.body(e)), false);
  r.set("name", v.name);
  r.set("tags", v.tags);
  r.set("order", v.order);
  e.app.save(r);
  return e.json(200, sim.dxOut(r));
});

routerAdd("DELETE", "/api/medcoel/admin/sim/diagnoses/{key}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  u.requireAdmin(e);
  const key = e.request.pathValue("key");
  let r;
  try { r = e.app.findFirstRecordByFilter("sim_diagnoses", "key = {:k}", { k: key }); } catch (_) { throw new NotFoundError("Diagnosis tidak ditemukan."); }
  const users = e.app.findRecordsByFilter("sim_cases", "id != ''", "", 0, 0).filter((c) => c.getString("dxOk") === key || (sim.jsonOf(c, "data").ddx || []).indexOf(key) >= 0);
  if (users.length) throw new BadRequestError("Diagnosis ini masih dipakai kasus: " + users.map((c) => c.getString("title")).join(", ") + ".");
  e.app.delete(r);
  return e.json(200, { ok: true });
});
