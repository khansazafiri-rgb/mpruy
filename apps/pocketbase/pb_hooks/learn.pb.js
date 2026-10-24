/// <reference path="../pb_data/types.d.ts" />

// BELAJAR DAN MENGERJAKAN SOAL
//
// GET  /api/medcoel/subjects                      kartu mata kuliah (yang sedang dipelajari di depan)
// GET  /api/medcoel/subjects/{slug}               detail: BAB, jumlah soal, progres, paket
// GET  /api/medcoel/simulation/availability       jumlah soal tersedia per BAB per tingkat
// POST /api/medcoel/attempts/practice             latihan per topik
// GET  /api/medcoel/drilling                      mata kuliah yang punya soal Drilling (kosong bila disembunyikan)
// POST /api/medcoel/attempts/drilling             Drilling per mata kuliah, langsung mulai
// POST /api/medcoel/attempts/simulation           Coba Simulasi
// POST /api/medcoel/attempts/package              paket soal
// GET  /api/medcoel/attempts/{id}                 soal percobaan (tanpa kunci bila belum dijawab)
// POST /api/medcoel/attempts/{id}/answer          simpan / cek satu jawaban
// POST /api/medcoel/attempts/{id}/finish          selesai, hitung skor dan poin
// POST /api/medcoel/questions/{id}/report         laporkan soal

routerAdd("GET", "/api/medcoel/subjects", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const subjects = e.app.findRecordsByFilter("subjects", "hidden = false", "order,name", 200, 0);
  const studying = user.getStringSlice("studyingSubjects");
  const items = learn.pool(e.app, user, {});
  const count = {};
  const done = {};
  // Hitungan per mata kuliah lewat BAB-nya.
  const chapterSubject = {};
  const chapterCount = {};
  e.app.findRecordsByFilter("chapters", "hidden = false && drilling = false", "", 0, 0).forEach((c) => { const subjectId = c.getString("subject"); chapterSubject[c.id] = subjectId; chapterCount[subjectId] = (chapterCount[subjectId] || 0) + 1; });
  items.forEach((it) => {
    const s = chapterSubject[it.chapter];
    count[s] = (count[s] || 0) + 1;
    if (it.seen) done[s] = (done[s] || 0) + 1;
  });
  const out = subjects.map((s) => ({
    id: s.id,
    name: s.getString("name"),
    slug: s.getString("slug"),
    description: s.getString("description"),
    illustrationKey: s.getString("illustrationKey"),
    illustration: s.getString("illustration"),
    collectionId: s.collection().id,
    studying: studying.indexOf(s.id) >= 0,
    chapterCount: chapterCount[s.id] || 0,
    questionCount: count[s.id] || 0,
    answeredCount: done[s.id] || 0,
    order: s.getInt("order"),
  }));
  out.sort(require(`${__hooks}/lib/catalogOrder.js`).byPreference);
  return e.json(200, { items: out });
});

routerAdd("GET", "/api/medcoel/subjects/{slug}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const slug = e.request.pathValue("slug");
  const campusOnly = u.query(e, "campusOnly") === "1";
  let s;
  try { s = e.app.findFirstRecordByFilter("subjects", "slug = {:s} || id = {:s}", { s: slug }); } catch (_) { s = null; }
  if (!s || (s.getBool("hidden") && u.roleOf(user) !== "admin")) throw new NotFoundError("Mata kuliah tidak ditemukan.");

  const chapters = e.app.findRecordsByFilter("chapters", "subject = {:s} && hidden = false && drilling = false", "order,created", 500, 0, { s: s.id });
  const items = learn.pool(e.app, user, { subject: s.id, campusOnly: campusOnly });
  const per = {};
  items.forEach((it) => {
    const p = (per[it.chapter] = per[it.chapter] || { total: 0, answered: 0, wrong: 0, easy: 0, medium: 0, hard: 0, A: 0, K: 0, isian: 0, esai: 0 });
    p.total++;
    if (it.seen) p.answered++;
    if (it.wrong) p.wrong++;
    p[it.difficulty]++;
    p[it.qtype]++;
  });
  const packages = e.app.findRecordsByFilter("packages", "subject = {:s} && active = true", "order,name", 50, 0, { s: s.id });
  return e.json(200, {
    campusName: campusOnly && user.getString("campus") ? e.app.findRecordById("campuses", user.getString("campus")).getString("name") : "",
    subject: {
      id: s.id,
      name: s.getString("name"),
      slug: s.getString("slug"),
      description: s.getString("description"),
      illustrationKey: s.getString("illustrationKey"),
      illustration: s.getString("illustration"),
      collectionId: s.collection().id,
      studying: user.getStringSlice("studyingSubjects").indexOf(s.id) >= 0,
    },
    chapters: chapters.filter((c) => !campusOnly || !!per[c.id]).map((c) => Object.assign({ id: c.id, title: c.getString("title") }, per[c.id] || { total: 0, answered: 0, wrong: 0, easy: 0, medium: 0, hard: 0, A: 0, K: 0, isian: 0, esai: 0 })).sort(require(`${__hooks}/lib/catalogOrder.js`).byName),
    packages: (campusOnly ? [] : packages).map((p) => ({
      id: p.id,
      name: p.getString("name"),
      description: p.getString("description"),
      perChapter: p.getInt("perChapter"),
      total: p.getInt("total"),
      timerMinutes: p.getInt("timerMinutes"),
    })),
    simulationTypes: u.jsonSetting(e.app, "simulationTypes", ["A", "K"]),
  });
});

// Ketersediaan soal untuk pengaturan simulasi.
routerAdd("GET", "/api/medcoel/simulation/availability", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const subject = u.query(e, "subject");
  const source = u.query(e, "source") || "unseen";
  const types = typeParam(u.query(e, "types"), u.jsonSetting(e.app, "simulationTypes", ["A", "K"]));
  const items = learn.bySource(learn.pool(e.app, user, { subject: subject, types: types, campusOnly: u.query(e, "campusOnly") === "1" }), source);
  const out = {};
  items.forEach((it) => {
    const p = (out[it.chapter] = out[it.chapter] || { easy: 0, medium: 0, hard: 0, total: 0 });
    p[it.difficulty]++;
    p.total++;
  });
  return e.json(200, { source: source, types: types, chapters: out });

  function typeParam(raw, allowed) {
    const want = raw === "A" ? ["A"] : raw === "K" ? ["K"] : allowed;
    return want.filter((t) => allowed.indexOf(t) >= 0);
  }
});

// ---------------------------------------------------------------------------
// Memulai percobaan
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/medcoel/attempts/practice", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  let ch;
  try { ch = e.app.findRecordById("chapters", String(b.chapter || "")); } catch (_) { ch = null; }
  if (!ch || ch.getBool("hidden") || ch.getBool("drilling")) throw new NotFoundError("Topik tidak ditemukan.");
  const n = Math.max(1, Math.min(100, parseInt(b.count, 10) || 0));
  const mode = b.mode === "exam" ? "exam" : "learning";
  const items = learn.pool(e.app, user, { subject: ch.getString("subject"), chapters: [ch.id], campusOnly: b.campusOnly === true });
  if (!items.length) throw new BadRequestError("Topik ini belum punya soal yang bisa kamu kerjakan.");
  if (n > items.length) {
    return e.json(409, { status: 409, message: "Soal yang tersedia di topik ini hanya " + items.length + ". Kurangi jumlah soalnya.", data: { available: items.length } });
  }
  const picked = learn.shuffle(learn.pickBalanced(items, n));
  const rec = att.create(e.app, user, {
    kind: "practice",
    mode: mode,
    subject: ch.getString("subject"),
    title: "Latihan " + ch.getString("title"),
    settings: { chapter: ch.id, count: n, mode: mode, campusOnly: b.campusOnly === true },
    ids: picked.map((x) => x.id),
    timerMinutes: 0,
  });
  return e.json(200, att.payload(e.app, user, rec));
});

// Drilling: soal General tanpa BAB. Menu hanya terbuka bila sakelar admin menyala dan
// sudah ada soal; mata kuliah tanpa soal Drilling tidak muncul.
routerAdd("GET", "/api/medcoel/drilling", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const user = u.requireUser(e);
  const st = learn.drillingStatus(e.app);
  if (!st.available) return e.json(200, { enabled: st.enabled, available: false, subjects: [] });
  const chapterSubject = {};
  e.app.findRecordsByFilter("chapters", "drilling = true && hidden = false", "", 0, 0).forEach((c) => { chapterSubject[c.id] = c.getString("subject"); });
  const count = {};
  const seen = {};
  learn.pool(e.app, user, { drilling: "only" }).forEach((it) => {
    const s = chapterSubject[it.chapter];
    count[s] = (count[s] || 0) + 1;
    if (it.seen) seen[s] = (seen[s] || 0) + 1;
  });
  const out = e.app.findRecordsByFilter("subjects", "hidden = false", "order,name", 200, 0)
    .filter((s) => count[s.id])
    .map((s) => ({
      id: s.id,
      name: s.getString("name"),
      slug: s.getString("slug"),
      description: s.getString("description"),
      illustrationKey: s.getString("illustrationKey"),
      illustration: s.getString("illustration"),
      collectionId: s.collection().id,
      studying: user.getStringSlice("studyingSubjects").indexOf(s.id) >= 0,
      questionCount: count[s.id],
      answeredCount: seen[s.id] || 0,
      order: s.getInt("order"),
    }));
  out.sort(require(`${__hooks}/lib/catalogOrder.js`).byPreference);
  return e.json(200, { enabled: true, available: true, subjects: out });
});

routerAdd("POST", "/api/medcoel/attempts/drilling", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  const st = learn.drillingStatus(e.app);
  if (!st.available && u.roleOf(user) !== "admin") throw new NotFoundError("Drilling belum dibuka.");
  let subject;
  try { subject = e.app.findRecordById("subjects", String(b.subject || "")); } catch (_) { subject = null; }
  if (!subject || subject.getBool("hidden")) throw new NotFoundError("Mata kuliah tidak ditemukan.");
  const items = learn.pool(e.app, user, { subject: subject.id, drilling: "only" });
  if (!items.length) throw new BadRequestError("Mata kuliah ini belum punya soal Drilling.");
  // Langsung mulai: tanpa jumlah, 20 soal (atau semua bila kurang); jumlah berlebih dipotong ke yang tersedia.
  const want = b.count === "all" ? 100 : parseInt(b.count, 10) || 20;
  const n = Math.max(1, Math.min(100, want, items.length));
  const mode = b.mode === "exam" ? "exam" : "learning";
  const picked = learn.shuffle(learn.pickBalanced(items, n));
  const rec = att.create(e.app, user, {
    kind: "practice",
    mode: mode,
    subject: subject.id,
    title: "Drilling " + subject.getString("name"),
    settings: { drilling: true, subject: subject.id, count: n, mode: mode },
    ids: picked.map((x) => x.id),
    timerMinutes: 0,
  });
  const out = att.payload(e.app, user, rec);
  out.available = items.length;
  return e.json(200, out);
});

routerAdd("POST", "/api/medcoel/attempts/simulation", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  let subject;
  try { subject = e.app.findRecordById("subjects", String(b.subject || "")); } catch (_) { subject = null; }
  if (!subject || subject.getBool("hidden")) throw new NotFoundError("Mata kuliah tidak ditemukan.");

  const allowed = u.jsonSetting(e.app, "simulationTypes", ["A", "K"]);
  const typeMode = b.types === "A" || b.types === "K" ? b.types : "mix";
  const types = (typeMode === "mix" ? allowed : [typeMode]).filter((t) => allowed.indexOf(t) >= 0);
  if (!types.length) throw new BadRequestError("Tipe soal itu tidak dipakai di simulasi.");
  const source = ["unseen", "wrong", "all"].indexOf(b.source) >= 0 ? b.source : "unseen";
  const plan = Array.isArray(b.chapters) ? b.chapters : [];
  if (!plan.length) throw new BadRequestError("Pilih minimal satu BAB.");
  const timer = Math.max(0, Math.min(600, parseInt(b.timerMinutes, 10) || 0));

  const all = learn.bySource(learn.pool(e.app, user, { subject: subject.id, types: types, campusOnly: b.campusOnly === true }), source);
  const picked = [];
  const shortages = [];
  const normPlan = [];
  plan.forEach((p) => {
    const chId = String(p.chapter || "");
    const want = { easy: Math.max(0, parseInt(p.easy, 10) || 0), medium: Math.max(0, parseInt(p.medium, 10) || 0), hard: Math.max(0, parseInt(p.hard, 10) || 0) };
    const total = want.easy + want.medium + want.hard;
    if (!chId || total <= 0) return;
    normPlan.push({ chapter: chId, easy: want.easy, medium: want.medium, hard: want.hard });
    learn.DIFFS.forEach((d) => {
      if (!want[d]) return;
      const avail = all.filter((x) => x.chapter === chId && x.difficulty === d);
      if (avail.length < want[d]) {
        shortages.push({ chapter: chId, difficulty: d, wanted: want[d], available: avail.length });
        return;
      }
      const got = typeMode === "mix" ? learn.pickMixed(avail, want[d]) : learn.pickBalanced(avail, want[d]);
      got.forEach((x) => picked.push(x));
    });
  });
  if (!normPlan.length) throw new BadRequestError("Isi jumlah soal minimal untuk satu BAB.");
  if (shortages.length) {
    return e.json(409, { status: 409, message: "Soal yang tersedia belum cukup untuk pengaturan ini. Sesuaikan jumlahnya dengan angka yang tersedia.", data: { shortages: shortages } });
  }
  if (picked.length > 500) throw new BadRequestError("Satu simulasi paling banyak 500 soal.");

  const rec = att.create(e.app, user, {
    kind: "simulation",
    mode: b.mode === "learning" ? "learning" : "exam",
    subject: subject.id,
    title: "Simulasi " + subject.getString("name"),
    settings: { subject: subject.id, chapters: normPlan, types: typeMode, source: source, timerMinutes: timer, mode: b.mode === "learning" ? "learning" : "exam" },
    ids: learn.shuffle(picked).map((x) => x.id),
    timerMinutes: timer,
  });
  return e.json(200, att.payload(e.app, user, rec));
});

routerAdd("POST", "/api/medcoel/attempts/package", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const learn = require(`${__hooks}/lib/learn.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  let pkg;
  try { pkg = e.app.findRecordById("packages", String(b.package || "")); } catch (_) { pkg = null; }
  if (!pkg || !pkg.getBool("active")) throw new NotFoundError("Paket tidak ditemukan.");
  const subjectId = pkg.getString("subject");
  const chapters = e.app.findRecordsByFilter("chapters", "subject = {:s} && hidden = false && drilling = false", "order,created", 500, 0, { s: subjectId });
  const quotas = {};
  (u.recJson(pkg, "quotas", []) || []).forEach((q) => { if (q && q.chapter) quotas[q.chapter] = Math.max(0, parseInt(q.count, 10) || 0); });
  const per = pkg.getInt("perChapter") || 5;
  const types = u.jsonSetting(e.app, "simulationTypes", ["A", "K"]);
  const all = learn.pool(e.app, user, { subject: subjectId, types: types });

  let picked = [];
  let repeats = 0;
  chapters.forEach((c) => {
    const want = quotas[c.id] !== undefined ? quotas[c.id] : per;
    if (!want) return;
    const inCh = all.filter((x) => x.chapter === c.id);
    // pickBalanced mendahulukan soal yang belum pernah dikerjakan.
    const got = learn.pickBalanced(inCh, want);
    repeats += got.filter((x) => x.seen).length;
    picked = picked.concat(got);
  });
  const limit = pkg.getInt("total");
  if (limit > 0 && picked.length > limit) {
    // Potong merata: urutkan supaya tiap BAB tetap terwakili.
    picked = learn.shuffle(picked).slice(0, limit);
  }
  if (!picked.length) throw new BadRequestError("Paket ini belum punya soal yang bisa kamu kerjakan.");

  const rec = att.create(e.app, user, {
    kind: "package",
    mode: b.mode === "learning" ? "learning" : "exam",
    subject: subjectId,
    pkg: pkg.id,
    title: pkg.getString("name"),
    settings: { package: pkg.id, mode: b.mode === "learning" ? "learning" : "exam" },
    ids: learn.shuffle(picked).map((x) => x.id),
    timerMinutes: pkg.getInt("timerMinutes"),
  });
  const out = att.payload(e.app, user, rec);
  out.repeats = repeats;
  return e.json(200, out);
});

// ---------------------------------------------------------------------------
// Mengerjakan
// ---------------------------------------------------------------------------

routerAdd("GET", "/api/medcoel/attempts/{id}", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const rec = att.own(e.app, user, e.request.pathValue("id"));
  return e.json(200, att.payload(e.app, user, rec));
});

routerAdd("POST", "/api/medcoel/attempts/{id}/answer", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const rec = att.own(e.app, user, e.request.pathValue("id"));
  const b = u.body(e);
  return e.json(200, att.answer(e.app, user, rec, String(b.question || ""), b.response, b.check === true));
});

routerAdd("POST", "/api/medcoel/attempts/{id}/finish", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const att = require(`${__hooks}/lib/attempts.js`);
  const user = u.requireUser(e);
  const rec = att.own(e.app, user, e.request.pathValue("id"));
  const b = u.body(e);
  // Jawaban terakhir yang belum sempat terkirim boleh ikut dikirim di sini.
  if (b.answers && typeof b.answers === "object" && rec.getString("status") === "in_progress") {
    Object.keys(b.answers).forEach((qid) => {
      try { att.answer(e.app, user, rec, qid, b.answers[qid], false); } catch (_) {}
    });
  }
  att.finish(e.app, user, rec);
  return e.json(200, att.payload(e.app, user, e.app.findRecordById("attempts", rec.id)));
});

// ---------------------------------------------------------------------------
// Laporkan soal
// ---------------------------------------------------------------------------

routerAdd("POST", "/api/medcoel/questions/{id}/report", (e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const user = u.requireUser(e);
  const b = u.body(e);
  let q;
  try { q = e.app.findRecordById("questions", e.request.pathValue("id")); } catch (_) { q = null; }
  if (!q || !u.canSeeQuestion(user, q)) throw new NotFoundError("Soal tidak ditemukan.");
  const reasons = ["kunci_salah", "salah_ketik", "gambar_tidak_muncul", "pembahasan_keliru", "lainnya"];
  const reason = reasons.indexOf(b.reason) >= 0 ? b.reason : "";
  if (!reason) throw new BadRequestError("Pilih alasan laporannya.");
  const note = u.cleanStr(b.note, 1000);
  if (reason === "lainnya" && !note) throw new BadRequestError("Tulis keterangan singkat untuk alasan Lainnya.");
  let open = false;
  try {
    e.app.findFirstRecordByFilter("question_reports", "question = {:q} && reporter = {:u} && status != 'selesai'", { q: q.id, u: user.id });
    open = true;
  } catch (_) {}
  if (open) throw new BadRequestError("Kamu sudah melaporkan soal ini dan laporannya sedang diperiksa admin.");
  const r = new Record(e.app.findCollectionByNameOrId("question_reports"));
  r.set("question", q.id);
  r.set("reporter", user.id);
  r.set("reason", reason);
  r.set("note", note);
  r.set("status", "baru");
  e.app.save(r);
  return e.json(200, { ok: true, id: r.id });
});

// Pelapor diberi notifikasi saat laporannya selesai.
onRecordAfterUpdateSuccess((e) => {
  const u = require(`${__hooks}/lib/util.js`);
  const before = e.record.original();
  if (e.record.getString("status") === "selesai" && before.getString("status") !== "selesai") {
    const note = e.record.getString("adminNote");
    u.notify(
      e.app,
      e.record.getString("reporter"),
      "report",
      "Laporan soalmu sudah selesai ditangani",
      note ? "Catatan admin: " + note : "Terima kasih sudah membantu memperbaiki bank soal MEDCOEL.",
      "",
    );
  }
  e.next();
}, "question_reports");
