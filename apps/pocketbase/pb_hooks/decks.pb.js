/// <reference path="../pb_data/types.d.ts" />

// DRILLING MATERI (berkas slide + penjelasan per mata kuliah). Lihat lib/decks.js dan docs/MATERI_SLIDE.md.
//
// Pengguna:
//   GET  /api/medcoel/drilling/subject/{subject}   satu mata kuliah: berkas materi + jumlah soal Drilling
//   GET  /api/medcoel/drilling/deck/{id}           satu berkas lengkap dengan slide
// Admin:
//   GET  /api/medcoel/admin/drilling/decks?subject=ID    semua berkas (tayang dan draf) satu mata kuliah
//   GET  /api/medcoel/admin/drilling/decks/{id}          satu berkas lengkap (pratinjau, termasuk draf)
//   POST /api/medcoel/admin/drilling/decks               impor { subject, scope, campuses, status, title, text|slides|deck, dryRun }
//   POST /api/medcoel/admin/drilling/decks/{id}          ubah { title, description, status, scope, campuses, sortOrder }
//   POST /api/medcoel/admin/drilling/decks/{id}/delete   hapus
// Agen (Hermes): lihat submissions.pb.js (materi-import).

routerAdd("GET", "/api/medcoel/drilling/subject/{subject}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  const user = u.requireUser(e);
  const admin = u.roleOf(user) === "admin";
  const st = learn.drillingStatus(e.app, user);
  // "Kampusmu": pengguna hanya melihat milik kampusnya (tanpa General). Admin melihat semuanya.
  const kampusOnly = !admin;
  const open = admin ? st.enabled : st.kampusAvailable;
  if (!open && !admin) throw new NotFoundError("Drilling belum dibuka.");
  const s = decks.subjectFor(e.app, e.request.pathValue("subject"), admin);
  // Admin melihat semua berkas tayang (pratinjau); pengguna hanya yang terbuka untuk kampusnya.
  const list = admin
    ? e.app.findRecordsByFilter("drilling_decks", "status = 'published' && subject = {:s}", "sortOrder,created", 0, 0, { s: s.id })
    : decks.listFor(e.app, user, s.id, { kampusOnly: kampusOnly });
  let questionCount = 0;
  let campusQuestionCount = 0;
  let answeredCount = 0;
  // Bagian soal = judul PDF tempat soal itu berasal ("" = soal lainnya, tanpa judul).
  const sets = [];
  const setIndex = {};
  learn.pool(e.app, user, { subject: s.id, drilling: "only", owned: kampusOnly }).forEach((it) => {
    questionCount++;
    if (it.seen) answeredCount++;
    if (it.scope === "campus") campusQuestionCount++;
    if (setIndex[it.setTitle] === undefined) { setIndex[it.setTitle] = sets.length; sets.push({ title: it.setTitle, questionCount: 0, answeredCount: 0, campusQuestionCount: 0 }); }
    const g = sets[setIndex[it.setTitle]];
    g.questionCount++;
    if (it.seen) g.answeredCount++;
    if (it.scope === "campus") g.campusQuestionCount++;
  });
  // Bagian bernama lebih dulu (A-Z), soal tanpa judul terakhir.
  sets.sort((a, b2) => (a.title === "" ? 1 : b2.title === "" ? -1 : a.title.localeCompare(b2.title)));
  return e.json(200, {
    preview: !open,
    kampusOnly: kampusOnly,
    subject: {
      id: s.id,
      name: s.getString("name"),
      slug: s.getString("slug"),
      description: s.getString("description"),
      illustrationKey: s.getString("illustrationKey"),
      illustration: s.getString("illustration"),
      collectionId: s.collection().id,
    },
    decks: list.map((r) => decks.metaOf(r)),
    questionCount: questionCount,
    campusQuestionCount: campusQuestionCount,
    answeredCount: answeredCount,
    sets: sets,
  });
});

routerAdd("GET", "/api/medcoel/drilling/deck/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  const user = u.requireUser(e);
  const admin = u.roleOf(user) === "admin";
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  if (!admin) {
    if (rec.getString("status") !== "published" || !decks.ownedBy(e.app, rec, user) || !learn.drillingStatus(e.app, user).kampusAvailable) throw new NotFoundError("Materi tidak ditemukan.");
    const sub = e.app.findRecordById("subjects", rec.getString("subject"));
    if (sub.getBool("hidden")) throw new NotFoundError("Materi tidak ditemukan.");
  }
  const sj = e.app.findRecordById("subjects", rec.getString("subject"));
  const out = decks.full(rec);
  out.subjectName = sj.getString("name");
  out.subjectSlug = sj.getString("slug");
  return e.json(200, out);
});

routerAdd("GET", "/api/medcoel/admin/drilling/decks", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  u.requireAdmin(e);
  const subject = u.query(e, "subject");
  const list = subject
    ? e.app.findRecordsByFilter("drilling_decks", "subject = {:s}", "sortOrder,created", 0, 0, { s: subject })
    : e.app.findRecordsByFilter("drilling_decks", "id != ''", "sortOrder,created", 0, 0);
  const names = decks.campusNames(e.app, list);
  const subs = require(`${__hooks}/lib/submissions.js`);
  const cache = {};
  const subInfo = (sid) => {
    if (!sid) return null;
    if (cache[sid] !== undefined) return cache[sid];
    const sub = subs.findSubmission(e.app, sid);
    if (!sub) return (cache[sid] = { id: sid, code: "", missing: true });
    let who = "";
    try { who = e.app.findRecordById("users", sub.getString("user")).getString("name"); } catch (_) {}
    let campus = "";
    try { campus = sub.getString("campus") ? e.app.findRecordById("campuses", sub.getString("campus")).getString("name") : ""; } catch (_) {}
    return (cache[sid] = { id: sub.id, code: sub.getString("code"), status: sub.getString("status"), userName: who, campusName: campus });
  };
  return e.json(200, {
    items: list.map((r) => {
      const m = decks.metaOf(r, names);
      m.submission = subInfo(r.getString("submission"));
      // General tanpa pengajuan = konten General buatan admin: sengaja tidak tampil di Kampusmu siapa pun.
      m.kampusHidden = m.scope === "all" && !m.submission;
      return m;
    }),
  });
});

// Pengajuan yang bisa dihubungkan ke materi di Admin > Drilling > Materi: PPT materi yang belum selesai, yang
// sudah Selesai tetapi belum punya materi tersimpan, dan pengajuan "soal" tanpa soal tersimpan (salah pilih jenis).
// Mata kuliah yang sama didahulukan.
routerAdd("GET", "/api/medcoel/admin/drilling/deck-submissions", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  u.requireAdmin(e);
  const subject = u.query(e, "subject");
  const rows = e.app.findRecordsByFilter(
    "submissions",
    "status = 'antre' || status = 'diproses' || status = 'perlu_perbaikan' || status = 'selesai'",
    "-created", 300, 0,
  );
  const names = {};
  const nameOf = (col, id) => {
    if (!id) return "";
    const k = col + ":" + id;
    if (names[k] === undefined) { try { names[k] = e.app.findRecordById(col, id).getString("name"); } catch (_) { names[k] = ""; } }
    return names[k];
  };
  const items = [];
  rows.forEach((sub) => {
    const deckCount = e.app.countRecords("drilling_decks", $dbx.exp("submission = {:s}", { s: sub.id }));
    const materi = sub.getString("contentKind") === "materi";
    if (!materi && e.app.countRecords("questions", $dbx.exp("submission = {:s}", { s: sub.id })) > 0) return;
    if (sub.getString("status") === "selesai" && deckCount > 0) return;
    let loginId = "";
    try { loginId = e.app.findRecordById("users", sub.getString("user")).getString("loginId"); } catch (_) {}
    items.push({
      id: sub.id,
      code: sub.getString("code"),
      status: sub.getString("status"),
      statusLabel: subs.LABEL[sub.getString("status")] || sub.getString("status"),
      contentKind: materi ? "materi" : "soal",
      subject: sub.getString("subject"),
      subjectName: nameOf("subjects", sub.getString("subject")),
      sameSubject: !!subject && sub.getString("subject") === subject,
      userName: nameOf("users", sub.getString("user")),
      loginId: loginId,
      campusName: nameOf("campuses", sub.getString("campus")),
      scope: sub.getString("scope") === "campus" ? "campus" : "all",
      pdfs: subs.files(e.app, sub).map((f) => subs.pdfTitle(f.getString("name"))),
      deckCount: deckCount,
      created: sub.getString("created"),
    });
  });
  items.sort((a, b) => (a.sameSubject === b.sameSubject ? (a.contentKind === b.contentKind ? 0 : a.contentKind === "materi" ? -1 : 1) : a.sameSubject ? -1 : 1));
  return e.json(200, { items: items.slice(0, 80) });
});

routerAdd("GET", "/api/medcoel/admin/drilling/decks/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  u.requireAdmin(e);
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  const sj = e.app.findRecordById("subjects", rec.getString("subject"));
  const out = decks.full(rec);
  out.subjectName = sj.getString("name");
  out.subjectSlug = sj.getString("slug");
  return e.json(200, out);
});

routerAdd("POST", "/api/medcoel/admin/drilling/decks", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  const subject = importer.findSubject(e.app, b.subject);
  // Materi dari pengajuan peserta: tautkan ke pengajuannya supaya tampil di Kampusmu pengaju dan teman sekampusnya.
  // Cakupan dan kampus mengikuti pengajuan; pengajuan menjadi Selesai dan pengaju diberi tahu.
  if (b.submission) {
    const subs = require(`${__hooks}/lib/submissions.js`);
    const sub = subs.findSubmission(e.app, b.submission);
    if (!sub) throw new NotFoundError("Pengajuan " + b.submission + " tidak ditemukan.");
    const r = subs.importDeckFor(e.app, sub, b, { actor: "admin", subject: subject.id, allowDone: true, allowSoal: true });
    if (r.blocked) return e.json(400, Object.assign({ status: 400, message: decks.blockedMessage(r) }, r));
    return e.json(200, r);
  }
  const result = decks.importDeck(e.app, {
    input: decks.inputOf(b),
    subject: subject.id,
    scope: b.scope === "campus" ? "campus" : "all",
    campuses: b.campuses || [],
    title: b.title,
    status: b.status === "draft" ? "draft" : "published",
    source: "admin",
    dryRun: b.dryRun === true,
  });
  if (result.blocked) return e.json(400, Object.assign({ status: 400, message: decks.blockedMessage(result) }, result));
  return e.json(200, result);
});

routerAdd("POST", "/api/medcoel/admin/drilling/decks/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const importer = require(`${__hooks}/lib/importer.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  if (b.title !== undefined) {
    const t = u.cleanStr(b.title, 200);
    if (!t) throw new BadRequestError("Judul tidak boleh kosong.");
    rec.set("title", t);
  }
  if (b.description !== undefined) rec.set("description", u.cleanStr(b.description, 600));
  if (b.status === "published" || b.status === "draft") rec.set("status", b.status);
  if (b.sortOrder !== undefined) rec.set("sortOrder", Math.max(0, parseInt(b.sortOrder, 10) || 0));
  if (b.scope === "all") { rec.set("scope", "all"); rec.set("campuses", []); }
  if (b.scope === "campus") {
    const ids = importer.resolveCampuses(e.app, b.campuses || []);
    if (!ids.length) throw new BadRequestError("Pilih minimal satu kampus.");
    rec.set("scope", "campus");
    rec.set("campuses", ids);
  }
  e.app.save(rec);
  return e.json(200, decks.metaOf(rec, decks.campusNames(e.app, [rec])));
});

// Tautkan materi yang sudah ada ke pengajuan peserta (mis. JSON ditempel lewat Admin tanpa memilih pengajuan).
// { submission: id | kode } menautkan: materi menjadi milik pengaju dan kampusnya (Kampusmu), pengajuan Selesai,
// pengaju diberi tahu. { submission: "" } melepas tautan (materi kembali menjadi materi admin).
routerAdd("POST", "/api/medcoel/admin/drilling/decks/{id}/link", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const decks = require(`${__hooks}/lib/decks.js`);
  const subs = require(`${__hooks}/lib/submissions.js`);
  u.requireAdmin(e);
  const b = u.body(e);
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  const ref = String(b.submission || "").trim();
  if (!ref) {
    rec.set("submission", "");
    rec.set("source", "admin");
    e.app.save(rec);
    return e.json(200, decks.metaOf(rec, decks.campusNames(e.app, [rec])));
  }
  const sub = subs.findSubmission(e.app, ref);
  if (!sub) throw new NotFoundError("Pengajuan " + ref + " tidak ditemukan.");
  subs.checkDeckSubmission(e.app, sub, { allowDone: true, allowSoal: true });
  // Pengajuan "khusus kampus saya" tetap khusus kampus pengaju; General tetap General (yang menautkan ke kampus
  // pengaju adalah pengajuannya).
  if (sub.getString("scope") === "campus" && sub.getString("campus") && rec.getString("scope") !== "campus") {
    rec.set("scope", "campus");
    rec.set("campuses", [sub.getString("campus")]);
  }
  rec.set("submission", sub.id);
  rec.set("source", "submission");
  e.app.save(rec);
  const total = e.app.findRecordsByFilter("drilling_decks", "submission = {:s}", "", 0, 0, { s: sub.id }).reduce((n, r) => n + r.getInt("slideCount"), 0);
  subs.finishDeckSubmission(e.app, sub, total, "admin");
  const out = decks.metaOf(rec, decks.campusNames(e.app, [rec]));
  out.submission = { id: sub.id, code: sub.getString("code"), status: sub.getString("status") };
  return e.json(200, out);
});

routerAdd("POST", "/api/medcoel/admin/drilling/decks/{id}/delete", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  e.app.delete(rec);
  return e.json(200, { ok: true });
});
