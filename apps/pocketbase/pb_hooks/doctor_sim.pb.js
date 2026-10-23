/// <reference path="../pb_data/types.d.ts" />

// SIMULASI DOKTER: menyimpan dan membaca hasil latihan milik sendiri.
// Mesin simulasi berjalan di browser; server menyimpan ringkasannya saja,
// memeriksa kasus, dan menghitung sendiri apakah diagnosis tepat.

routerAdd("POST", "/api/medcoel/doctor-sim/results", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const sim = require(`${__hooks}/lib/doctorSim.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const c = sim.CASES[String(b.caseKey || "")];
  if (!c) throw new BadRequestError("Kasus tidak dikenal.");
  // Batas wajar: satu konsultasi butuh waktu, jadi lebih dari 20 kiriman per 10 menit ditolak.
  const since = u.pbDate(new Date(Date.now() - 10 * 60 * 1000));
  const recent = e.app.countRecords("doctor_sims", $dbx.exp("user = {:u} AND created >= {:s}", { u: user.id, s: since }));
  if (recent >= 20) throw new TooManyRequestsError("Terlalu banyak hasil dikirim. Coba lagi sebentar lagi.");
  const dxKey = /^[a-z_]{1,40}$/.test(String(b.dxKey || "")) ? String(b.dxKey) : "";
  const rec = new Record(e.app.findCollectionByNameOrId("doctor_sims"));
  rec.set("user", user.id);
  rec.set("caseKey", String(b.caseKey));
  rec.set("caseTitle", c.title);
  rec.set("dxKey", dxKey);
  rec.set("dxOk", dxKey !== "" && dxKey === c.dxOk);
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
