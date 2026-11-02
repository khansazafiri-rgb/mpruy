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
  if (!st.available && !admin) throw new NotFoundError("Drilling belum dibuka.");
  const s = decks.subjectFor(e.app, e.request.pathValue("subject"), admin);
  // Admin melihat semua berkas tayang (pratinjau); pengguna hanya yang terbuka untuk kampusnya.
  const list = admin
    ? e.app.findRecordsByFilter("drilling_decks", "status = 'published' && subject = {:s}", "sortOrder,created", 0, 0, { s: s.id })
    : decks.listFor(e.app, user, s.id);
  let questionCount = 0;
  let campusQuestionCount = 0;
  let answeredCount = 0;
  // Bagian soal = judul PDF tempat soal itu berasal ("" = soal lainnya, tanpa judul).
  const sets = [];
  const setIndex = {};
  learn.pool(e.app, user, { subject: s.id, drilling: "only" }).forEach((it) => {
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
    preview: !st.available,
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
    if (rec.getString("status") !== "published" || !decks.visibleTo(rec, user) || !learn.drillingStatus(e.app, user).available) throw new NotFoundError("Materi tidak ditemukan.");
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
  return e.json(200, { items: list.map((r) => decks.metaOf(r, names)) });
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

routerAdd("POST", "/api/medcoel/admin/drilling/decks/{id}/delete", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  u.requireAdmin(e);
  let rec;
  try { rec = e.app.findRecordById("drilling_decks", e.request.pathValue("id")); } catch (_) { rec = null; }
  if (!rec) throw new NotFoundError("Materi tidak ditemukan.");
  e.app.delete(rec);
  return e.json(200, { ok: true });
});
