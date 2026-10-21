/// <reference path="../pb_data/types.d.ts" />

// PENGAJUAN SOAL (Chat Admin) DAN ENDPOINT HERMES AGENT
//
// Pengguna:
//   GET  /api/medcoel/submissions/mine
//   GET  /api/medcoel/submissions/queue
//   POST /api/medcoel/submissions                  buat draf (jawaban percakapan)
//   POST /api/medcoel/submissions/{id}/files/{fileId}/remove
//   POST /api/medcoel/submissions/{id}/send        kirim -> Menunggu konfirmasi
//   POST /api/medcoel/submissions/{id}/cancel
// Admin:
//   GET  /api/medcoel/admin/submissions
//   POST /api/medcoel/admin/submissions            pengajuan manual (kiriman WhatsApp)
//   POST /api/medcoel/admin/submissions/{id}/status
// Agen (Hermes) - lihat docs/HERMES_AGENT.md:
//   GET  /api/medcoel/agent/submissions?status=antre
//   GET  /api/medcoel/agent/submissions/{id}
//   POST /api/medcoel/agent/submissions/{id}/status
//   POST /api/medcoel/agent/submissions/{id}/import
//   POST /api/medcoel/agent/import

routerAdd("GET", "/api/medcoel/submissions/mine", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const user = u.requireUser(e);
  const list = e.app.findRecordsByFilter("submissions", "user = {:u} && status != 'draft'", "-created", 100, 0, { u: user.id });
  return e.json(200, { items: list.map((s) => subs.summary(e.app, s)) });
});

routerAdd("GET", "/api/medcoel/submissions/queue", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  u.requireUser(e);
  return e.json(200, Object.assign({ submissionsOpen: u.settings(e.app).getBool("submissionsOpen") }, subs.queueInfo(e.app, null)));
});

routerAdd("POST", "/api/medcoel/submissions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  if (!u.settings(e.app).getBool("submissionsOpen")) {
    throw new BadRequestError("Pengajuan soal sedang ditutup sementara karena antrean penuh. Coba lagi beberapa hari lagi.");
  }
  let subject;
  try { subject = e.app.findRecordById("subjects", String(b.subject || "")); } catch (_) { subject = null; }
  if (!subject || subject.getBool("hidden")) throw new BadRequestError("Pilih mata kuliahnya dulu.");
  const n = parseInt(b.pdfCount, 10);
  if (!(n >= 1 && n <= 5)) throw new BadRequestError("Lewat web hanya bisa 1 sampai 5 PDF. Untuk lebih dari 5, kirim lewat WhatsApp admin.");
  const scope = b.scope === "campus" ? "campus" : b.scope === "all" ? "all" : "";
  if (!scope) throw new BadRequestError("Pilih siapa yang boleh melihat soalnya.");
  if (scope === "campus" && !user.getString("campus")) {
    throw new BadRequestError("Kampusmu belum ada di daftar MEDCOEL, jadi pilihan Hanya kampus saya belum bisa dipakai. Pilih Semua kampus, atau hubungi admin.");
  }
  const lang = ["id", "en", "both"].indexOf(b.language) >= 0 ? b.language : "";
  if (!lang) throw new BadRequestError("Pilih bahasa soalnya.");

  // Draf lama yang belum dikirim dipakai ulang supaya tidak menumpuk.
  let sub = null;
  try { sub = e.app.findFirstRecordByFilter("submissions", "user = {:u} && status = 'draft'", { u: user.id }); } catch (_) { sub = null; }
  if (!sub) {
    sub = new Record(e.app.findCollectionByNameOrId("submissions"));
    sub.set("code", subs.makeCode());
    sub.set("user", user.id);
    sub.set("status", "draft");
  }
  sub.set("subject", subject.id);
  sub.set("hasKey", b.hasKey === true);
  sub.set("language", lang);
  sub.set("scope", scope);
  sub.set("campus", user.getString("campus"));
  sub.set("pdfCount", n);
  sub.set("viaWhatsapp", false);
  e.app.save(sub);
  return e.json(200, subs.summary(e.app, sub));
});

routerAdd("GET", "/api/medcoel/submissions/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const user = u.requireUser(e);
  let sub;
  try { sub = e.app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { sub = null; }
  if (!sub || sub.getString("user") !== user.id) throw new NotFoundError("Pengajuan tidak ditemukan.");
  return e.json(200, subs.summary(e.app, sub));
});

routerAdd("POST", "/api/medcoel/submissions/{id}/files/{fileId}/remove", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const storage = require(`${__hooks}/lib/storage.js`);
  const user = u.requireUser(e);
  let sub;
  try { sub = e.app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { sub = null; }
  if (!sub || sub.getString("user") !== user.id) throw new NotFoundError("Pengajuan tidak ditemukan.");
  if (sub.getString("status") !== "draft") throw new BadRequestError("File pengajuan yang sudah dikirim tidak bisa dihapus.");
  let f;
  try { f = e.app.findRecordById("stored_files", e.request.pathValue("fileId")); } catch (_) { f = null; }
  if (!f || f.getString("submission") !== sub.id) throw new NotFoundError("File tidak ditemukan.");
  storage.discard(e.app, f, "delete");
  return e.json(200, subs.summary(e.app, sub));
});

routerAdd("POST", "/api/medcoel/submissions/{id}/send", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { sub = null; }
  if (!sub || sub.getString("user") !== user.id) throw new NotFoundError("Pengajuan tidak ditemukan.");
  if (sub.getString("status") !== "draft") throw new BadRequestError("Pengajuan ini sudah dikirim.");
  if (b.agreement !== true) {
    throw new BadRequestError("Centang pernyataan bahwa kamu berhak membagikan isi PDF ini untuk keperluan belajar.");
  }
  const files = subs.files(e.app, sub);
  if (!files.length) throw new BadRequestError("Unggah minimal satu PDF dulu.");
  if (files.length > 5) throw new BadRequestError("Satu pengajuan paling banyak 5 PDF.");
  sub.set("pdfCount", files.length);
  sub.set("agreement", true);
  sub.set("submittedAt", u.pbDate(new Date()));
  subs.setStatus(e.app, sub, "menunggu_konfirmasi", "", "user");
  return e.json(200, subs.summary(e.app, sub));
});

routerAdd("POST", "/api/medcoel/submissions/{id}/cancel", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const user = u.requireUser(e);
  let sub;
  try { sub = e.app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { sub = null; }
  if (!sub || sub.getString("user") !== user.id) throw new NotFoundError("Pengajuan tidak ditemukan.");
  const st = sub.getString("status");
  if (["draft", "menunggu_konfirmasi", "antre"].indexOf(st) < 0) {
    throw new BadRequestError("Pengajuan hanya bisa dibatalkan selama statusnya Menunggu konfirmasi atau Antre.");
  }
  subs.setStatus(e.app, sub, "dibatalkan", "Dibatalkan oleh pengaju.", "user");
  return e.json(200, subs.summary(e.app, sub));
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/admin/submissions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const admin = u.requireAdmin(e);
  const status = u.query(e, "status");
  const search = u.query(e, "q");
  const parts = ["status != 'draft'"];
  const params = {};
  if (status) { parts.push("status = {:st}"); params.st = status; }
  if (search) { parts.push("(code ~ {:q} || user.name ~ {:q} || user.loginId ~ {:q})"); params.q = search; }
  const page = Math.max(1, parseInt(u.query(e, "page"), 10) || 1);
  const sort = status === "antre" || status === "diproses" ? "confirmedAt,created" : "-created";
  const list = e.app.findRecordsByFilter("submissions", parts.join(" && "), sort, 50, (page - 1) * 50, params);
  const total = e.app.countRecords("submissions", $dbx.exp("status != 'draft'"));
  return e.json(200, {
    items: list.map((s) => subs.summary(e.app, s, { withLinks: true, withUser: true, auth: admin })),
    queue: subs.queueInfo(e.app, null),
    total: total,
    submissionsOpen: u.settings(e.app).getBool("submissionsOpen"),
  });
});

routerAdd("POST", "/api/medcoel/admin/submissions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  let usr;
  try { usr = e.app.findFirstRecordByFilter("users", "id = {:x} || loginId = {:x}", { x: String(b.user || "").trim() }); } catch (_) { usr = null; }
  if (!usr) throw new BadRequestError("Pengguna tidak ditemukan. Isi Login ID pengaju.");
  let subject;
  try { subject = e.app.findRecordById("subjects", String(b.subject || "")); } catch (_) { subject = null; }
  if (!subject) throw new BadRequestError("Pilih mata kuliah.");
  const n = parseInt(b.pdfCount, 10);
  if (!(n >= 1 && n <= 500)) throw new BadRequestError("Isi jumlah PDF.");
  const scope = b.scope === "campus" ? "campus" : "all";
  if (scope === "campus" && !usr.getString("campus")) throw new BadRequestError("Kampus pengguna ini belum ada di daftar, jadi tidak bisa dibatasi per kampus.");
  const sub = new Record(e.app.findCollectionByNameOrId("submissions"));
  sub.set("code", subs.makeCode());
  sub.set("user", usr.id);
  sub.set("subject", subject.id);
  sub.set("hasKey", b.hasKey === true);
  sub.set("language", ["id", "en", "both"].indexOf(b.language) >= 0 ? b.language : "id");
  sub.set("scope", scope);
  sub.set("campus", usr.getString("campus"));
  sub.set("pdfCount", n);
  sub.set("viaWhatsapp", true);
  sub.set("createdByAdmin", true);
  sub.set("agreement", true);
  sub.set("status", "menunggu_konfirmasi");
  sub.set("statusNote", u.cleanStr(b.note, 1000));
  sub.set("submittedAt", u.pbDate(new Date()));
  e.app.save(sub);
  if (b.confirmNow === true) subs.setStatus(e.app, sub, "antre", sub.getString("statusNote"), "admin");
  return e.json(200, subs.summary(e.app, sub, { withUser: true }));
});

routerAdd("POST", "/api/medcoel/admin/submissions/{id}/status", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const admin = u.requireAdmin(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findRecordById("submissions", e.request.pathValue("id")); } catch (_) { sub = null; }
  if (!sub) throw new NotFoundError("Pengajuan tidak ditemukan.");
  if (b.status === "selesai" && b.importedCount !== undefined) sub.set("importedCount", Math.max(0, parseInt(b.importedCount, 10) || 0));
  subs.setStatus(e.app, sub, String(b.status || ""), b.note, "admin");
  return e.json(200, subs.summary(e.app, sub, { withLinks: true, withUser: true, auth: admin }));
});

// ---------------------------------------------------------------------------
// Agen (Hermes)
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/agent/submissions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const agent = u.requireAgent(e);
  const status = u.query(e, "status") || "antre";
  const since = u.query(e, "since");
  const parts = ["status = {:st}"];
  const params = { st: status };
  if (since) { parts.push("updated >= {:since}"); params.since = since.replace("T", " "); }
  const list = e.app.findRecordsByFilter("submissions", parts.join(" && "), "confirmedAt,created", 200, 0, params);
  return e.json(200, { items: list.map((s) => subs.contract(e.app, s, agent)), queue: subs.queueInfo(e.app, null) });
});

routerAdd("GET", "/api/medcoel/agent/submissions/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const agent = u.requireAgent(e);
  let sub;
  try { sub = e.app.findFirstRecordByFilter("submissions", "id = {:x} || code = {:x}", { x: e.request.pathValue("id") }); } catch (_) { sub = null; }
  if (!sub || sub.getString("status") === "draft") throw new NotFoundError("Pengajuan tidak ditemukan.");
  return e.json(200, subs.contract(e.app, sub, agent));
});

routerAdd("POST", "/api/medcoel/agent/submissions/{id}/status", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const agent = u.requireAgent(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findFirstRecordByFilter("submissions", "id = {:x} || code = {:x}", { x: e.request.pathValue("id") }); } catch (_) { sub = null; }
  if (!sub || sub.getString("status") === "draft") throw new NotFoundError("Pengajuan tidak ditemukan.");
  const status = String(b.status || "");
  // Agen hanya mengubah status atas perintah admin; "selesai" lewat impor.
  if (["antre", "diproses", "perlu_perbaikan"].indexOf(status) < 0) {
    throw new BadRequestError("Agen hanya boleh mengubah status ke antre, diproses, atau perlu_perbaikan. Status selesai diberikan otomatis lewat impor.");
  }
  subs.setStatus(e.app, sub, status, b.note, "agent");
  return e.json(200, subs.contract(e.app, sub, agent));
});

routerAdd("POST", "/api/medcoel/agent/submissions/{id}/import", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  u.requireAgent(e);
  const b = u.body(e);
  let sub;
  try { sub = e.app.findFirstRecordByFilter("submissions", "id = {:x} || code = {:x}", { x: e.request.pathValue("id") }); } catch (_) { sub = null; }
  if (!sub) throw new NotFoundError("Pengajuan tidak ditemukan.");
  const st = sub.getString("status");
  if (["antre", "diproses", "perlu_perbaikan"].indexOf(st) < 0) {
    throw new BadRequestError("Pengajuan berstatus " + (subs.LABEL[st] || st) + " tidak bisa diimpor. Konfirmasi dulu pengajuannya.");
  }
  // Kampus selalu dari pengajuan, apa pun isi JSON-nya.
  const result = importer.run(e.app, {
    input: b.questions !== undefined ? b.questions : b.text,
    subject: sub.getString("subject"),
    chapter: b.chapter || "",
    scope: sub.getString("scope") === "campus" ? "campus" : "all",
    campuses: sub.getString("scope") === "campus" ? [sub.getString("campus")] : [],
    source: "submission",
    submission: sub.id,
    skipInvalid: b.skipInvalid === true,
    dryRun: b.dryRun === true,
  });
  if (result.blocked) return e.json(400, Object.assign({ status: 400 }, result));
  if (!b.dryRun) {
    if (st !== "diproses") subs.setStatus(e.app, sub, "diproses", sub.getString("statusNote"), "agent");
    sub.set("importedCount", sub.getInt("importedCount") + result.created);
    e.app.save(sub);
    subs.setStatus(e.app, sub, "selesai", sub.getString("statusNote"), "agent");
  }
  return e.json(200, result);
});

routerAdd("POST", "/api/medcoel/agent/import", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  u.requireAgent(e);
  const b = u.body(e);
  const result = importer.run(e.app, {
    input: b.questions !== undefined ? b.questions : b.text,
    subject: b.subject,
    chapter: b.chapter || "",
    scope: b.scope === "campus" ? "campus" : "all",
    campuses: b.campuses || [],
    source: "agent",
    skipInvalid: b.skipInvalid === true,
    dryRun: b.dryRun === true,
  });
  if (result.blocked) return e.json(400, Object.assign({ status: 400 }, result));
  return e.json(200, result);
});
